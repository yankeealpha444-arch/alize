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
  const [shouldScrollToResults, setShouldScrollToResults] = useState(false);
  const [previewObjectUrl, setPreviewObjectUrl] = useState<string | null>(null);
  const [showPreviewFallback, setShowPreviewFallback] = useState(false);
  const [uploadDiagnostics, setUploadDiagnostics] = useState<{
    file: { name: string; size: number; mime: string };
    probe: Record<string, unknown>;
    processJob: ProcessJobApiPayload | null;
    jobId: string | null;
    dbStatus: string | null;
    dbError: string | null;
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
      setIsGenerating(false);
      startedAtRef.current = null;
    }
    if (latestJobStatus === "failed") {
      setIsGenerating(false);
      startedAtRef.current = null;
    }
  }, [activeJobId, latestJobStatus, clips.length]);

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
    setMessage("");
    setShowPreviewFallback(false);
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

    if (selectedFile.size > MAX_MVP_UPLOAD_BYTES) {
      setIsGenerating(false);
      setMessage(MAX_MVP_UPLOAD_MESSAGE);
      setShowPreviewFallback(true);
      setUploadDiagnostics({
        file: fileMeta,
        probe: {},
        processJob: null,
        jobId: null,
        dbStatus: null,
        dbError: MAX_MVP_UPLOAD_MESSAGE,
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
        setShowPreviewFallback(true);
        setMessage(diagErr || "Clipping failed.");
      } else {
        setIsGenerating(true);
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
      });
    }
  };

  const isQueuedOrProcessing = latestJobStatus === "queued" || latestJobStatus === "processing";
  const effectiveFailureText =
    message?.trim() || latestJobError?.trim() || uploadDiagnostics?.dbError?.trim() || "";
  const isFailed = latestJobStatus === "failed" || Boolean(message?.trim()) || Boolean(latestJobError?.trim());
  const hasNoJob =
    !activeJobId && !latestJobStatus && !message && !uploadDiagnostics && !showPreviewFallback;
  const displayClips = clips
    .filter((clip) => !(clip.video_url?.includes("interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4")))
    .slice(0, 3);

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
            CLIPPER_UPLOAD_ONLY_LOCKED_V1
          </p>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Alize Clips
          </p>

          <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Alize Clips
          </h1>

          <p className="mt-2 text-muted-foreground">
            Upload a short MP4 and get 3 ready-to-use clips.
          </p>

          <p className="mt-2 text-xs text-muted-foreground">
            For best results, upload an MP4 under 25 MB.
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
              className="mt-2 inline-flex w-full items-center justify-center rounded-md border border-border px-4 py-2.5 text-sm font-semibold text-foreground disabled:opacity-60"
            >
              {isGenerating ? "Generating..." : "Upload and Generate Clips"}
            </button>
          </div>

          {message ? (
            <p className="mt-3 text-sm text-foreground">
              {message}
            </p>
          ) : null}

          {uploadDiagnostics ? (
            <div className="mt-4 rounded-md border border-dashed border-border/70 bg-muted/30 p-3 text-xs leading-relaxed text-foreground">
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
        </section>

        <section ref={resultsRef} className="mt-8">
          {(isQueuedOrProcessing || isGenerating) && !showPreviewFallback ? (
            <p className="text-sm text-muted-foreground">
              Generating clips...
            </p>
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
                Preview Mode (clipping failed)
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Full-source preview only — not separate clips. You can still review your video below.
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

                const label = `Clip ${idx + 1}`;

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
                    key={clip.id}
                    className="rounded-xl border border-border/60 bg-card p-3"
                  >
                    <p className="text-sm font-semibold">
                      {label}
                    </p>

                    <div className="mt-3 aspect-video overflow-hidden rounded-lg border border-border/60 bg-black">
                      {directUrl ? (
                        <video
                          src={directUrl}
                          controls
                          playsInline
                          preload="metadata"
                          className="h-full w-full object-cover"
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
                          No playable source for this clip yet
                        </div>
                      )}
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
                          className="inline-flex items-center rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-secondary"
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
        </section>
      </main>
    </div>
  );
}