import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useClips } from "@/hooks/useClips";
import { ensureVideoMvpProjectId } from "../../../src/lib/videoMvpProject";
import { trackEvent } from "../../../src/lib/trackingEvents";
import {
  fetchClipperState,
  fetchVideoClipsByJobIdFresh,
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

const MAX_MVP_UPLOAD_BYTES = 100 * 1024 * 1024;
const MAX_MVP_UPLOAD_MESSAGE =
  "This file is too large for the current MVP. Please upload a video under 100 MB.";

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
  const [shouldScrollToResults, setShouldScrollToResults] = useState(false);
  const [clipVideoErrors, setClipVideoErrors] = useState<Record<string, boolean>>({});
  const [selectedFileName, setSelectedFileName] = useState<string>("");
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
  const processingStartedAtRef = useRef<number | null>(null);

  useEffect(() => {
    const projectId = ensureVideoMvpProjectId();
    void trackEvent("session_started", projectId, "link_clipper_session");
  }, []);

  useEffect(() => {
    console.log("[clipper][render] activeJobId", activeJobId);
  }, [activeJobId]);

  useEffect(() => {
    if (!activeJobId) return;
    if (latestJobStatus === "completed") {
      setProgressStage("completed");
      setProgressPct(100);
      setProgressStepText("Completed");
      setIsGenerating(false);
      startedAtRef.current = null;
      processingStartedAtRef.current = null;
    }
    if (latestJobStatus === "failed") {
      setProgressStage("failed");
      setProgressStepText("Failed");
      setIsGenerating(false);
      startedAtRef.current = null;
      processingStartedAtRef.current = null;
    }
  }, [activeJobId, latestJobStatus]);

  useEffect(() => {
    if (!isGenerating) return;
    const tick = () => {
      setProgressPct((prev) => {
        if (progressStage === "uploading") {
          setProgressStepText("Uploading video");
          const started = startedAtRef.current ?? Date.now();
          const elapsedMs = Date.now() - started;
          const target = 5 + Math.min(1, elapsedMs / 20000) * 50; // 5 -> 55 in ~20s
          return Math.max(prev, Math.min(55, target));
        }
        if (progressStage === "processing") {
          const started = processingStartedAtRef.current ?? Date.now();
          const elapsedMs = Date.now() - started;
          if (elapsedMs < 25000) {
            setProgressStepText("Creating clips");
            const target = 55 + (elapsedMs / 25000) * 30; // 55 -> 85
            return Math.max(prev, Math.min(85, target));
          }
          if (elapsedMs < 70000) {
            setProgressStepText("Finalising downloads");
            const target = 85 + ((elapsedMs - 25000) / 45000) * 10; // 85 -> 95
            return Math.max(prev, Math.min(95, target));
          }
          setProgressStepText("Almost ready... still processing");
          const target = 95 + Math.min(3, ((elapsedMs - 70000) / 60000) * 3); // 95 -> 98 slowly
          return Math.max(prev, Math.min(98, target));
        }
        return prev;
      });
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [isGenerating, progressStage]);

  useEffect(() => {
    if (!isGenerating) return;
    if (progressStage === "uploading" && progressPct >= 55) {
      setProgressStage("processing");
      setProgressStepText("Creating clips");
      processingStartedAtRef.current = Date.now();
    }
  }, [isGenerating, progressStage, progressPct]);

  useEffect(() => {
    if (!isGenerating || progressStage !== "uploading") return;
    const timer = window.setTimeout(() => {
      setIsGenerating(false);
      setProgressStage("failed");
      setProgressStepText("Failed");
      setMessage("Upload did not start properly. Please try again or use a smaller MP4.");
      setUploadDiagnostics((prev) =>
        prev
          ? {
              ...prev,
              dbError: prev.dbError || "Upload did not start properly. Please try again or use a smaller MP4.",
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
        setMessage("Still processing. Please wait or refresh to check the job.");
      }
    }, 180000);
    return () => window.clearTimeout(timer);
  }, [activeJobId, isGenerating, latestJobStatus]);

  useEffect(() => {
    if (!activeJobId || !isGenerating) return;
    let cancelled = false;
    let inFlight = false;
    const pid = ensureVideoMvpProjectId();
    const poll = async () => {
      if (cancelled || inFlight) return;
      inFlight = true;
      try {
        console.log("[clipper-poll] activeJobId", activeJobId);
        const state = await fetchClipperState(pid, activeJobId, {
          cacheBuster: Date.now(),
          uploadOnly: true,
        });
        const dbStatus = state.latestJob?.status ?? null;
        const dbError = state.latestJob?.error_message ?? null;
        console.log("[clipper-poll] db status", dbStatus);
        console.log("[clipper-poll] db error_message", dbError);

        if (dbStatus === "completed") {
          setProgressStage("completed");
          setProgressPct(100);
          setProgressStepText("Completed");
          setIsGenerating(false);
          startedAtRef.current = null;
          processingStartedAtRef.current = null;

          const exact = await fetchVideoClipsByJobIdFresh(activeJobId, { cacheBuster: Date.now() });
          const exactCount = exact.filter((c) => c.job_id === activeJobId).length;
          console.log("[clipper-poll] clips fetched count", exactCount);

          await queryClient.invalidateQueries({ queryKey: ["clips", pid] });
          await queryClient.refetchQueries({
            queryKey: ["clips", pid, activeJobId],
            type: "active",
          });
          console.log("[clipper-poll] transition completed");
          return;
        }

        if (dbStatus === "failed") {
          const errText = dbError?.trim() || "Processing failed";
          setProgressStage("failed");
          setProgressStepText("Failed");
          setIsGenerating(false);
          setMessage(errText);
          startedAtRef.current = null;
          processingStartedAtRef.current = null;
          console.log("[clipper-poll] clips fetched count", 0);
          return;
        }

        // queued | processing | null: keep status and continue smooth 55-98 band.
        setProgressStage("processing");
        const started = processingStartedAtRef.current ?? Date.now();
        if (!processingStartedAtRef.current) processingStartedAtRef.current = started;
        const elapsedMs = Date.now() - started;
        if (elapsedMs < 25000) {
          setProgressStepText("Creating clips");
          setProgressPct((prev) => Math.max(prev, Math.min(85, 55 + (elapsedMs / 25000) * 30)));
        } else if (elapsedMs < 70000) {
          setProgressStepText("Finalising downloads");
          setProgressPct((prev) => Math.max(prev, Math.min(95, 85 + ((elapsedMs - 25000) / 45000) * 10)));
        } else {
          setProgressStepText("Almost ready... still processing");
          setProgressPct((prev) =>
            Math.max(prev, Math.min(98, 95 + Math.min(3, ((elapsedMs - 70000) / 60000) * 3))),
          );
        }
      } catch (err) {
        console.error("[clipper-poll] error", err);
      } finally {
        inFlight = false;
      }
    };
    void poll();
    const timer = window.setInterval(() => {
      void poll();
    }, 2000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [activeJobId, isGenerating, queryClient]);

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
    setProgressPct(0);
    setProgressStepText("Uploading video...");
    setMessage("");
    setClipVideoErrors({});
    setSelectedFileName(selectedFile.name);
    setUploadDiagnostics(null);
    startedAtRef.current = Date.now();
    processingStartedAtRef.current = null;

    const fileMeta = {
      name: selectedFile.name,
      size: selectedFile.size,
      mime: selectedFile.type || "unknown",
    };
    setUploadDiagnostics(null);

    if (selectedFile.size > MAX_MVP_UPLOAD_BYTES) {
      setIsGenerating(false);
      setProgressStage("failed");
      setProgressStepText("Failed");
      setProgressPct(0);
      setMessage(MAX_MVP_UPLOAD_MESSAGE);
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
        setProgressStage("failed");
        setProgressStepText("Failed");
        setMessage(diagErr || "Clipping failed.");
      } else {
        setIsGenerating(true);
        setProgressStage("processing");
        processingStartedAtRef.current = Date.now();
        setProgressStepText("Creating clips");
        setProgressPct((prev) => Math.max(prev, 55));
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
    message?.trim() ||
    latestJobError?.trim() ||
    uploadDiagnostics?.dbError?.trim() ||
    uploadDiagnostics?.processJob?.error_message?.trim() ||
    "";
  const isFailed = latestJobStatus === "failed" || Boolean(message?.trim()) || Boolean(latestJobError?.trim());
  const hasNoJob =
    !activeJobId && !latestJobStatus && !message && !uploadDiagnostics;
  const showProgressPanel =
    (((isQueuedOrProcessing || isGenerating) ||
      (progressStage === "completed" && progressPct === 100)) &&
      !isFailed);
  const displayClips = clips
    .filter((clip) => !(clip.video_url?.includes("interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4")))
    .slice(0, 3);
  const showFinalClips = latestJobStatus === "completed" && !isGenerating && displayClips.length > 0;

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
            Best with videos under 100 MB.
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
            {selectedFileName ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Selected file: {selectedFileName}
              </p>
            ) : null}
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

          {uploadDiagnostics ? null : null}
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

          {displayClips.length === 0 && !isQueuedOrProcessing && !isGenerating && hasNoJob ? (
            <p className="text-sm text-muted-foreground">
              No clips yet. Upload an MP4 to get started.
            </p>
          ) : null}

          {showFinalClips ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {displayClips.map((clip, idx) => {
                const clipAny = clip as unknown as Record<string, unknown>;
                const videoUrlRaw =
                  (typeof clipAny.video_url === "string" ? clipAny.video_url : "") ||
                  (typeof clipAny.videoUrl === "string" ? clipAny.videoUrl : "");
                const directUrl = videoUrlRaw.trim();
                const canDownload = Boolean(directUrl);
                const clipId = typeof clipAny.id === "string" && clipAny.id ? clipAny.id : `clip-${idx + 1}`;
                const rawStart =
                  Number(
                    clipAny.start_time ??
                      clipAny.start_time_sec ??
                      clipAny.start ??
                      0,
                  ) || 0;
                const rawEnd =
                  Number(
                    clipAny.end_time ??
                      clipAny.end_time_sec ??
                      clipAny.end ??
                      0,
                  ) || 0;
                const rawDuration =
                  Number(
                    clipAny.duration_sec ??
                      clipAny.duration ??
                      0,
                  ) || 0;
                const startSec = Math.max(0, Math.floor(rawStart));
                const endSec = Math.max(startSec, Math.floor(rawEnd));
                const durationSec = Math.max(0, Math.floor(rawDuration || (endSec - startSec)));
                const clipRenderKey = `${clipId}:${idx}:${startSec}:${endSec}:${directUrl || "no-url"}`;
                const hasVideoLoadError = Boolean(clipVideoErrors[clipRenderKey]);

                const label = `Clip ${idx + 1}`;

                console.log("[clipper][render] clip", {
                  activeJobId,
                  clipId,
                  video_url: directUrl || null,
                  youtube_video_id: (typeof clipAny.youtube_video_id === "string" ? clipAny.youtube_video_id : null),
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

                    <div className="mt-3 aspect-video overflow-hidden rounded-lg border border-border/60 bg-muted">
                      {directUrl && !hasVideoLoadError ? (
                        <video
                          src={directUrl}
                          controls
                          playsInline
                          preload="metadata"
                          poster={(typeof clipAny.thumbnail_url === "string" ? clipAny.thumbnail_url : undefined)}
                          className="h-full w-full object-cover"
                          onError={() => {
                            setClipVideoErrors((prev) => ({ ...prev, [clipRenderKey]: true }));
                          }}
                          onPlay={() => {
                            if (trackedPlayedClipIds.current.has(clipId)) return;

                            trackedPlayedClipIds.current.add(clipId);

                            const pid = ensureVideoMvpProjectId();

                            void trackEvent("clip_played", pid, clipId, {
                              source: "direct_video",
                            });
                          }}
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center bg-muted text-xs text-muted-foreground">
                          {directUrl ? "Preview unavailable. Download clip." : "Preview unavailable. Download clip."}
                        </div>
                      )}
                    </div>

                    <div className="mt-3 flex gap-2">
                      <a
                        href={canDownload ? directUrl : "#"}
                        download={`clip-${idx + 1}.mp4`}
                        onClick={async (e) => {
                          e.preventDefault();
                          if (!canDownload) return;
                          const fallbackOpen = () => {
                            window.open(directUrl, "_blank", "noopener,noreferrer");
                          };
                          try {
                            const resp = await fetch(directUrl);
                            if (!resp.ok) throw new Error(`download_http_${resp.status}`);
                            const blob = await resp.blob();
                            const objUrl = URL.createObjectURL(blob);
                            const a = document.createElement("a");
                            a.href = objUrl;
                            a.download = `alize-clip-${idx + 1}.mp4`;
                            document.body.appendChild(a);
                            a.click();
                            a.remove();
                            window.setTimeout(() => URL.revokeObjectURL(objUrl), 1000);
                          } catch {
                            fallbackOpen();
                          }
                          const pid = ensureVideoMvpProjectId();
                          void trackEvent("clip_downloaded", pid, clipId);
                        }}
                        className={`inline-flex w-full items-center justify-center rounded-md px-3 py-2 text-xs font-bold ${
                          canDownload
                            ? "bg-black text-white hover:bg-neutral-900"
                            : "bg-neutral-500 text-neutral-100 cursor-not-allowed"
                        }`}
                        aria-disabled={!canDownload}
                      >
                        Download MP4
                      </a>
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