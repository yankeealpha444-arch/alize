import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useClips } from "@/hooks/useClips";
import { ensureVideoMvpProjectId } from "../../../src/lib/videoMvpProject";
import { trackEvent } from "../../../src/lib/trackingEvents";
import {
  uploadSourceVideoAndCreateJob,
  type ProcessJobApiPayload,
} from "@/lib/mvp/videoClipperBackend";

function formatTime(sec: number): string {
  if (!Number.isFinite(sec)) return "0s";
  const total = Math.max(0, Math.floor(sec));
  if (total < 60) return `${total}s`;
  const m = Math.floor(total / 60);
  const s = total % 60;
  return s === 0 ? `${m}m` : `${m}m ${s}s`;
}

function formatBytes(n: number): string {
  if (!Number.isFinite(n) || n < 0) return "?";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

const MAX_MVP_UPLOAD_BYTES = 25 * 1024 * 1024;
const MAX_MVP_UPLOAD_MESSAGE =
  "This file is too large for the current MVP. Please upload a video under 25 MB.";

function categorizeFailureCause(raw: string | null | undefined): string {
  const m = (raw || "").toLowerCase();
  if (!m.trim()) return "unknown";
  if (m.includes("timeout") || m.includes("took too long") || m.includes("processing took too long")) return "timeout";
  if (m.includes("413") || m.includes("too large") || m.includes("payload") || m.includes("entity too large")) return "file_too_large";
  if (m.includes("upload") && (m.includes("failed") || m.includes("error"))) return "upload_storage";
  if (m.includes("storage") && m.includes("error")) return "upload_storage";
  if (m.includes("ffmpeg") || m.includes("enoent")) return "ffmpeg_or_binary";
  if (m.includes("codec") || m.includes("invalid data") || m.includes("unsupported") || m.includes("could not")) return "unsupported_or_decode";
  return "other";
}

async function probeLocalVideoFile(file: File): Promise<{
  durationSec?: number;
  width?: number;
  height?: number;
  codecHint?: string;
}> {
  const url = URL.createObjectURL(file);
  try {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    video.src = url;
    await new Promise<void>((resolve, reject) => {
      const t = window.setTimeout(() => reject(new Error("metadata_timeout")), 20000);
      video.onloadedmetadata = () => {
        window.clearTimeout(t);
        resolve();
      };
      video.onerror = () => {
        window.clearTimeout(t);
        reject(new Error("metadata_error"));
      };
    });
    const durationSec = Number.isFinite(video.duration) ? video.duration : undefined;
    const width = video.videoWidth || undefined;
    const height = video.videoHeight || undefined;
    const canPlay = video.canPlayType(file.type || "video/mp4") || "";
    const codecHint = [file.type || "unknown", canPlay ? `canPlayType:${canPlay}` : ""].filter(Boolean).join(" · ");
    return { durationSec, width, height, codecHint };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function LinkClipperMvp() {
  const queryClient = useQueryClient();

  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const { clips, isLoading, latestJobStatus, latestJobError } = useClips(activeJobId, true, true);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [progressPct, setProgressPct] = useState(0);
  const [progressStage, setProgressStage] = useState<"idle" | "uploading" | "processing" | "completed" | "failed">("idle");
  const [progressStepText, setProgressStepText] = useState("Idle");
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [shouldScrollToResults, setShouldScrollToResults] = useState(false);
  const [previewObjectUrl, setPreviewObjectUrl] = useState<string | null>(null);
  const [showPreviewFallback, setShowPreviewFallback] = useState(false);
  const [clipVideoErrors, setClipVideoErrors] = useState<Record<string, boolean>>({});
  const [clipVideoReady, setClipVideoReady] = useState<Record<string, boolean>>({});
  const [uploadDiagnostics, setUploadDiagnostics] = useState<{
    file: { name: string; size: number; mime: string };
    probe: Record<string, unknown>;
    processJob: ProcessJobApiPayload | null;
    jobId: string | null;
    dbStatus: string | null;
    dbError: string | null;
    uploadState?: {
      uploadStarted: boolean;
      storageUploadCompleted: boolean;
      jobCreated: boolean;
    };
  } | null>(null);

  const resultsRef = useRef<HTMLElement | null>(null);
  const pendingGeneratedTrack = useRef(false);
  const trackedPlayedClipIds = useRef<Set<string>>(new Set());
  const startedAtRef = useRef<number | null>(null);

  useEffect(() => {
    const projectId = ensureVideoMvpProjectId();
    void trackEvent("session_started", projectId, "link_clipper_session");
  }, []);

  useEffect(() => {
    console.log("[clipper][render] activeJobId", activeJobId);
  }, [activeJobId]);

  useEffect(() => {
    if (!activeJobId) return;
    if (latestJobStatus === "completed" && clips.length > 0) {
      setProgressStage("completed");
      setProgressPct(100);
      setProgressStepText("Completed");
      setIsGenerating(false);
      startedAtRef.current = null;
    }
    if (latestJobStatus === "failed") {
      setProgressStage("failed");
      setProgressStepText("Failed");
      setIsGenerating(false);
      startedAtRef.current = null;
    }
  }, [activeJobId, latestJobStatus, clips.length]);

  useEffect(() => {
    if (!isGenerating) return;
    const tick = () => {
      setProgressPct((prev) => {
        if (progressStage === "uploading") {
          setProgressStepText("Uploading video");
          return Math.min(80, Math.max(5, prev + 3));
        }
        if (progressStage === "processing") {
          setProgressStepText("Processing clips");
          return Math.min(95, Math.max(80, prev + 1));
        }
        return prev;
      });
    };
    tick();
    const timer = window.setInterval(tick, 700);
    return () => window.clearInterval(timer);
  }, [isGenerating, progressStage]);

  useEffect(() => {
    if (!isGenerating) return;
    if (progressStage === "uploading" && progressPct >= 80) {
      setProgressStage("processing");
      setProgressStepText("Processing clips");
    }
  }, [isGenerating, progressStage, progressPct]);

  useEffect(() => {
    if (!isGenerating || progressStage !== "uploading") return;
    const timer = window.setTimeout(() => {
      setIsGenerating(false);
      setProgressStage("failed");
      setProgressStepText("Failed");
      setMessage("Upload did not start properly. Please try again or use a smaller MP4.");
      setShowDiagnostics(true);
      setShowPreviewFallback(true);
      setUploadDiagnostics((prev) =>
        prev
          ? {
              ...prev,
              dbError: prev.dbError || "Upload did not start properly. Please try again or use a smaller MP4.",
              uploadState: {
                uploadStarted: true,
                storageUploadCompleted: false,
                jobCreated: false,
              },
            }
          : prev,
      );
    }, 20000);
    return () => window.clearTimeout(timer);
  }, [isGenerating, progressStage]);

  useEffect(() => {
    if (!activeJobId || !isGenerating) return;
    const timer = window.setTimeout(() => {
      if (latestJobStatus === "queued" || latestJobStatus === "processing" || !latestJobStatus) {
        setIsGenerating(false);
        setMessage("Processing took too long. Please refresh and try a smaller MP4.");
        if (previewObjectUrl) {
          setShowPreviewFallback(true);
        }
      }
    }, 90000);
    return () => window.clearTimeout(timer);
  }, [activeJobId, isGenerating, latestJobStatus, previewObjectUrl]);

  useEffect(() => {
    return () => {
      if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl);
    };
  }, [previewObjectUrl]);

  useEffect(() => {
    if (activeJobId && latestJobStatus === "failed" && previewObjectUrl) {
      setShowPreviewFallback(true);
      setIsGenerating(false);
    }
  }, [activeJobId, latestJobStatus, previewObjectUrl]);

  useEffect(() => {
    if (clips.length > 0) {
      setShowPreviewFallback(false);
    }
  }, [clips.length]);

  useEffect(() => {
    if (!shouldScrollToResults || isLoading || clips.length === 0) return;

    resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

    if (pendingGeneratedTrack.current) {
      const projectId = ensureVideoMvpProjectId();

      void trackEvent("clips_generated", projectId, "link_clipper_generated", {
        clip_count: clips.length,
      });

      pendingGeneratedTrack.current = false;
    }

    setShouldScrollToResults(false);
  }, [shouldScrollToResults, isLoading, clips.length]);

  const handleUploadGenerate = async () => {
    if (!selectedFile) {
      setMessage("Choose a video file to upload");
      return;
    }
    setActiveJobId(null);
    setIsGenerating(true);
    setProgressStage("uploading");
    setProgressPct(5);
    setProgressStepText("Uploading video");
    setMessage("");
    setShowDiagnostics(false);
    setShowPreviewFallback(true);
    setClipVideoErrors({});
    setClipVideoReady({});
    setUploadDiagnostics(null);
    startedAtRef.current = Date.now();

    if (previewObjectUrl) {
      URL.revokeObjectURL(previewObjectUrl);
      setPreviewObjectUrl(null);
    }

    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewObjectUrl(objectUrl);

    const fileMeta = {
      name: selectedFile.name,
      size: selectedFile.size,
      mime: selectedFile.type || "unknown",
    };
    setUploadDiagnostics({
      file: fileMeta,
      probe: {},
      processJob: null,
      jobId: null,
      dbStatus: null,
      dbError: null,
      uploadState: {
        uploadStarted: true,
        storageUploadCompleted: false,
        jobCreated: false,
      },
    });

    if (selectedFile.size > MAX_MVP_UPLOAD_BYTES) {
      setIsGenerating(false);
      setProgressStage("failed");
      setProgressStepText("Failed");
      setProgressPct(0);
      setMessage(MAX_MVP_UPLOAD_MESSAGE);
      setShowPreviewFallback(true);
      setUploadDiagnostics({
        file: fileMeta,
        probe: {},
        processJob: null,
        jobId: null,
        dbStatus: null,
        dbError: MAX_MVP_UPLOAD_MESSAGE,
        uploadState: {
          uploadStarted: true,
          storageUploadCompleted: false,
          jobCreated: false,
        },
      });
      setSelectedFile(null);
      return;
    }

    let probe: Record<string, unknown> = {};
    try {
      const p = await probeLocalVideoFile(selectedFile);
      probe = { ...p };
    } catch (e) {
      probe = { error: e instanceof Error ? e.message : "probe_failed" };
    }

    console.log("[clipper][upload] client probe", { fileMeta, probe });

    try {
      const pid = ensureVideoMvpProjectId();
      const { job, processJob } = await uploadSourceVideoAndCreateJob(pid, selectedFile);

      const diagErr = job.error_message || processJob.error_message;
      setUploadDiagnostics({
        file: fileMeta,
        probe,
        processJob,
        jobId: job.id,
        dbStatus: job.status,
        dbError: job.error_message,
        uploadState: {
          uploadStarted: true,
          storageUploadCompleted: true,
          jobCreated: true,
        },
      });

      console.log("[clipper][upload] terminal snapshot", {
        jobId: job.id,
        dbStatus: job.status,
        processJobStatus: processJob.status,
        processJobOk: processJob.ok,
        error: diagErr,
        failureCause: categorizeFailureCause(diagErr),
      });

      localStorage.setItem(`alize_video_job_id_${pid}`, job.id);
      localStorage.setItem(`alize_clips_source_url_${pid}`, selectedFile.name);
      setActiveJobId(job.id);
      setSelectedFile(null);

      if (job.status === "failed") {
        setIsGenerating(false);
        setProgressStage("failed");
        setProgressStepText("Failed");
        setShowPreviewFallback(true);
        setMessage(diagErr || "Clipping failed.");
      } else {
        setIsGenerating(true);
        setProgressStage("processing");
        setProgressStepText("Processing clips");
        setProgressPct((prev) => Math.max(prev, 80));
        setShowPreviewFallback(false);
      }

      await queryClient.invalidateQueries({ queryKey: ["clips", pid] });
      await queryClient.refetchQueries({
        queryKey: ["clips", pid, job.id],
        type: "active",
      });
      pendingGeneratedTrack.current = true;
      setShouldScrollToResults(true);
    } catch (err) {
      console.error("[clipper][upload:error]", err);
      setIsGenerating(false);
      setProgressStage("failed");
      setProgressStepText("Failed");
      setProgressPct(0);
      setShowPreviewFallback(true);
      const errText = err instanceof Error && err.message ? err.message : "Could not process uploaded file.";
      setMessage(errText);
      setUploadDiagnostics({
        file: fileMeta,
        probe,
        processJob: null,
        jobId: null,
        dbStatus: null,
        dbError: errText,
        uploadState: {
          uploadStarted: true,
          storageUploadCompleted: false,
          jobCreated: false,
        },
      });
    }
  };

  const isQueuedOrProcessing = latestJobStatus === "queued" || latestJobStatus === "processing";
  const effectiveFailureText =
    message?.trim() ||
    latestJobError?.trim() ||
    uploadDiagnostics?.dbError?.trim() ||
    uploadDiagnostics?.processJob?.error_message?.trim() ||
    "";
  const isFailed = latestJobStatus === "failed" || Boolean(message?.trim()) || Boolean(latestJobError?.trim());
  const hasNoJob =
    !activeJobId && !latestJobStatus && !message && !uploadDiagnostics && !showPreviewFallback;
  const showProgressPanel =
    (((isQueuedOrProcessing || isGenerating) && !showPreviewFallback) ||
      (progressStage === "completed" && progressPct === 100)) &&
    !isFailed;
  const displayClips = clips
    .filter((clip) => !(clip.video_url?.includes("interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4")))
    .slice(0, 3);
  const showDevDiagnostics = localStorage.getItem("alize_show_clipper_diagnostics") === "1";

  console.log("[clips-render-final]", {
    isGenerating,
    latestJobStatus,
    clipsLength: clips.length,
    activeJobId,
    clipJobIds: clips.map((c) => c.job_id),
    videoUrls: clips.map((c) => c.video_url),
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold text-amber-700">
            CLIPPER_FINAL_VISIBLE_AND_FAST_CLIPS_FIX
          </p>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Alize Clips
          </p>

          <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Alize Clips
          </h1>

          <p className="mt-2 text-muted-foreground">
            Upload an MP4 and get 3 suggested Shorts clips.
          </p>

          <p className="mt-2 text-xs text-muted-foreground">
            Best with videos under 25 MB.
          </p>
        </div>

        <section className="mt-6 max-w-2xl rounded-2xl border border-border/60 bg-card p-5 sm:p-6">
          <div>
            <input
              type="file"
              accept="video/mp4,video/*"
              onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
              className="w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm text-foreground"
            />
            <button
              type="button"
              onClick={() => void handleUploadGenerate()}
              disabled={isGenerating || !selectedFile}
              className="mt-2 inline-flex w-full items-center justify-center rounded-md bg-black px-4 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-neutral-500 disabled:text-neutral-100"
            >
              {isGenerating ? "Generating..." : "Upload and Generate Clips"}
            </button>
          </div>

          {message ? (
            <div className="mt-3">
              <p className="text-sm text-foreground">{message}</p>
              {progressStage === "failed" && selectedFile ? (
                <button
                  type="button"
                  onClick={() => void handleUploadGenerate()}
                  className="mt-2 inline-flex items-center rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary"
                >
                  Retry
                </button>
              ) : null}
            </div>
          ) : null}

          {uploadDiagnostics && showDevDiagnostics ? (
            <div className="mt-4">
              {showDiagnostics ? (
                <div className="mt-2 rounded-md border border-dashed border-border/70 bg-muted/30 p-3 text-xs leading-relaxed text-foreground">
                  <p className="font-semibold text-foreground">Upload diagnostics</p>
                  <p className="mt-1">
                    File name: {uploadDiagnostics.file.name}
                    <br />
                    Size: {formatBytes(uploadDiagnostics.file.size)} · MIME: {uploadDiagnostics.file.mime}
                    <br />
                    MVP upload limit: {formatBytes(MAX_MVP_UPLOAD_BYTES)}
                    <br />
                    {typeof uploadDiagnostics.probe.durationSec === "number" ? (
                      <>
                        Duration (browser): {Math.round(uploadDiagnostics.probe.durationSec as number)}s · Resolution:{" "}
                        {uploadDiagnostics.probe.width ?? "?"}×{uploadDiagnostics.probe.height ?? "?"}
                        <br />
                      </>
                    ) : null}
                    Codec / container hint:{" "}
                    {typeof uploadDiagnostics.probe.codecHint === "string"
                      ? uploadDiagnostics.probe.codecHint
                      : (uploadDiagnostics.probe.error as string) || "unknown (browser could not decode metadata)"}
                    <br />
                    Job id: {uploadDiagnostics.jobId ?? "(pending)"}
                    <br />
                    upload started: {uploadDiagnostics.uploadState?.uploadStarted ? "yes" : "no"}
                    <br />
                    storage upload completed: {uploadDiagnostics.uploadState?.storageUploadCompleted ? "yes" : "no"}
                    <br />
                    job created: {uploadDiagnostics.uploadState?.jobCreated ? "yes" : "no"}
                    <br />
                    DB status: {uploadDiagnostics.dbStatus ?? "—"} · DB error_message:{" "}
                    {uploadDiagnostics.dbError ?? "—"}
                    <br />
                    process-job: HTTP {uploadDiagnostics.processJob?.httpStatus ?? "—"} · ok:{" "}
                    {uploadDiagnostics.processJob ? String(uploadDiagnostics.processJob.ok) : "—"} · API status:{" "}
                    {uploadDiagnostics.processJob?.status ?? "—"}
                    <br />
                    process-job error_message: {uploadDiagnostics.processJob?.error_message ?? "—"}
                    <br />
                    Failure class: {categorizeFailureCause(uploadDiagnostics.dbError || uploadDiagnostics.processJob?.error_message)}
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}
        </section>

        <section ref={resultsRef} className="mt-8">
          {showProgressPanel ? (
            <div className="max-w-2xl rounded-md border border-border/60 bg-card p-3">
              <p className="text-sm font-medium text-foreground">
                {progressStage === "completed" && progressPct === 100 ? "Completed" : "Generating clips..."}
              </p>
              {progressStage === "completed" && progressPct === 100 ? (
                <p className="mt-1 text-xs text-muted-foreground">3 suggested clips are ready</p>
              ) : null}
              <p className="mt-1 text-xs text-muted-foreground">{progressStepText}</p>
              <div className="mt-2 h-2 w-full overflow-hidden rounded bg-muted">
                <div
                  className="h-full rounded bg-foreground transition-all duration-500"
                  style={{ width: `${Math.max(0, Math.min(100, progressPct))}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{Math.round(progressPct)}%</p>
            </div>
          ) : null}

          {isFailed ? (
            <div className="rounded-md border border-border/60 bg-card p-3">
              <p className="text-sm font-semibold text-foreground">
                Failed to generate clips
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {effectiveFailureText || "Unknown error"}
              </p>
            </div>
          ) : null}

          {showPreviewFallback && previewObjectUrl ? (
            <div className="mt-6">
              <p className="text-sm font-semibold text-amber-800">
                {progressStage === "uploading"
                  ? "Local preview while upload starts"
                  : "Preview Mode — full original video, not cut clips"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {progressStage === "uploading"
                  ? "Showing local file preview immediately while upload attempts."
                  : "Full-source preview only — not separate clips. You can still review your video below."}
              </p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <article key={i} className="rounded-xl border border-border/60 bg-card p-3">
                    <p className="text-sm font-semibold">Preview {i}</p>
                    <div className="mt-3 aspect-video overflow-hidden rounded-lg border border-border/60 bg-black">
                      <video
                        src={previewObjectUrl}
                        controls
                        playsInline
                        preload="metadata"
                        className="h-full w-full object-contain"
                      />
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ) : null}

          {displayClips.length === 0 && !isQueuedOrProcessing && !isGenerating && hasNoJob ? (
            <p className="text-sm text-muted-foreground">
              No clips yet. Upload an MP4 to get started.
            </p>
          ) : null}

          {displayClips.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {displayClips.map((clip, idx) => {
                const directUrl = clip.video_url?.trim() ?? "";
                const canDownload = Boolean(directUrl);
                const clipRenderKey = `${clip.id}:${directUrl || "no-url"}`;
                const hasVideoLoadError = Boolean(clipVideoErrors[clipRenderKey]);
                const isVideoReady = Boolean(clipVideoReady[clipRenderKey]);

                const label = `Clip ${idx + 1}`;
                const suggestedReason = idx === 0 ? "Opening hook" : idx === 1 ? "Strong middle moment" : "Later highlight";

                const startSec = Math.max(0, Math.floor(Number(clip.start_time) || 0));
                const endSec = Math.max(startSec, Math.floor(Number(clip.end_time) || 0));
                const durationSec = Math.max(0, endSec - startSec);

                console.log("[clipper][render] clip", {
                  activeJobId,
                  clipId: clip.id,
                  video_url: directUrl || null,
                  youtube_video_id: clip.youtube_video_id ?? null,
                  startSec,
                  endSec,
                  durationSec,
                });

                return (
                  <article
                    key={clipRenderKey}
                    className="rounded-xl border border-border/60 bg-card p-3"
                  >
                    <p className="text-sm font-semibold">
                      {label}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">{suggestedReason}</p>

                    <div className="relative mt-3 aspect-video overflow-hidden rounded-lg border border-border/60 bg-black">
                      {directUrl && !hasVideoLoadError ? (
                        <video
                          src={directUrl}
                          controls
                          playsInline
                          preload="metadata"
                          poster={clip.thumbnail_url ?? undefined}
                          className="h-full w-full object-cover"
                          onError={() => {
                            setClipVideoErrors((prev) => ({ ...prev, [clipRenderKey]: true }));
                          }}
                          onLoadedData={() => {
                            setClipVideoReady((prev) => ({ ...prev, [clipRenderKey]: true }));
                          }}
                          onPlay={() => {
                            if (trackedPlayedClipIds.current.has(clip.id)) return;

                            trackedPlayedClipIds.current.add(clip.id);

                            const pid = ensureVideoMvpProjectId();

                            void trackEvent("clip_played", pid, clip.id, {
                              source: "direct_video",
                            });
                          }}
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center bg-muted text-xs text-muted-foreground">
                          {directUrl
                            ? "Clip preview failed to load. Tap Download MP4."
                            : "No playable source for this clip yet"}
                        </div>
                      )}
                      {directUrl && !hasVideoLoadError && !isVideoReady ? (
                        <div className="absolute inset-0 flex items-center justify-center bg-muted text-xs text-muted-foreground">
                          Loading clip preview...
                        </div>
                      ) : null}
                    </div>

                    <p className="mt-2 text-xs text-muted-foreground">
                      Start: {formatTime(startSec)}
                      {" · "}
                      End: {formatTime(endSec)}
                      {" · "}
                      Duration: {formatTime(durationSec)}
                    </p>
                    {clip.caption ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Reason: {clip.caption}
                      </p>
                    ) : null}

                    <div className="mt-3 flex gap-2">
                      {canDownload ? (
                        <a
                          href={clip.video_url ?? directUrl}
                          download={`clip-${idx + 1}.mp4`}
                          onClick={() => {
                            const pid = ensureVideoMvpProjectId();
                            void trackEvent("clip_downloaded", pid, clip.id);
                          }}
                          className="inline-flex w-full items-center justify-center rounded-md bg-black px-3 py-2 text-xs font-bold text-white hover:bg-neutral-900"
                        >
                          Download MP4
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          Processing download...
                        </span>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : null}
          {isGenerating && displayClips.length === 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <article key={`skeleton-${i}`} className="rounded-xl border border-border/60 bg-card p-3">
                  <p className="text-sm font-semibold">Clip {i}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Preparing suggested clip...</p>
                  <div className="mt-3 aspect-video animate-pulse rounded-lg border border-border/60 bg-muted" />
                  <div className="mt-3 h-8 animate-pulse rounded-md bg-muted" />
                </article>
              ))}
            </div>
          ) : null}
        </section>
      </main>
    </div>
  );
}