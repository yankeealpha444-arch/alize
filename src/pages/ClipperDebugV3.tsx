import { useEffect, useMemo, useRef, useState } from "react";
import { trackEvent } from "@/lib/trackingEvents";
import { ensureVideoMvpProjectId } from "@/lib/videoMvpProject";
import {
  createVideoJobFromSourceUrl,
  fetchClipperState,
  type VideoClipRow,
  type VideoJobStatus,
} from "@/lib/mvp/videoClipperBackend";

type ClipRow = {
  id: string;
  video_url: string | null;
  start_time_sec: number | null;
  end_time_sec: number | null;
  start_time?: number | null;
  end_time?: number | null;
  source_url?: string | null;
};

const FEEDBACK_OPTIONS = ["Good clip", "Too long", "Too short", "Wrong moment", "Not useful"] as const;

function formatTime(sec: number): string {
  if (!Number.isFinite(sec)) return "0s";
  const total = Math.max(0, Math.floor(sec));
  if (total < 60) return `${total}s`;
  const m = Math.floor(total / 60);
  const s = total % 60;
  return s === 0 ? `${m}m` : `${m}m ${s}s`;
}

function isPlayableUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (trimmed.includes("interactive-examples.mdn.mozilla.net")) return false;
  return /^https?:\/\//i.test(trimmed);
}

function deriveNoClipReason(errorMessage: string | null, clipCount: number): string {
  if (errorMessage) {
    const lower = errorMessage.toLowerCase();
    if (lower.includes("yt-dlp") && (lower.includes("timeout") || lower.includes("timed out"))) return "yt-dlp timeout";
    if (lower.includes("processvideofromurl") || lower.includes("ffmpeg")) return "processVideoFromUrl failed";
    return errorMessage;
  }
  if (clipCount === 0) return "no clips generated";
  return "no clips generated";
}

export default function ClipperDebugV3() {
  const [videoUrlInput, setVideoUrlInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [clips, setClips] = useState<ClipRow[]>([]);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [activeJobStatus, setActiveJobStatus] = useState<VideoJobStatus | null>(null);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [feedbackByClipId, setFeedbackByClipId] = useState<Record<string, { choice: string; hidden: boolean }>>({});
  const [downloadsByClipId, setDownloadsByClipId] = useState<Record<string, true>>({});
  const [playedByClipId, setPlayedByClipId] = useState<Record<string, true>>({});
  const [watchMarksByClipId, setWatchMarksByClipId] = useState<Record<string, Record<number, true>>>({});
  const [showOriginal, setShowOriginal] = useState(false);
  const [debugErrorMessage, setDebugErrorMessage] = useState<string | null>(null);
  const [debugClipCount, setDebugClipCount] = useState(0);
  const [debugHasVideoUrl, setDebugHasVideoUrl] = useState(false);
  const [debugNoClipReason, setDebugNoClipReason] = useState<string | null>(null);
  const [lastJobId, setLastJobId] = useState<string | null>(null);
  const firstSelectedTrackedRef = useRef(false);
  const projectId = ensureVideoMvpProjectId();
  const pollStartedAtRef = useRef<number | null>(null);
  const POLL_TIMEOUT_MS = 45000;

  useEffect(() => {
    void trackEvent("page_view", projectId, "lsa_clips_debug_v3");
  }, [projectId]);

  const cardSlots = useMemo(() => [clips[0] ?? null, clips[1] ?? null, clips[2] ?? null], [clips]);

  const forceDownload = async (url: string, filename: string) => {
    const response = await fetch(url);
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(blobUrl);
  };

  const trackIgnored = (existingClips: ClipRow[]) => {
    existingClips.forEach((clip) => {
      const hadInteraction =
        Boolean(playedByClipId[clip.id]) ||
        Boolean(downloadsByClipId[clip.id]) ||
        Boolean(feedbackByClipId[clip.id]) ||
        selectedClipId === clip.id;
      if (!hadInteraction) {
        void trackEvent("clip_ignored" as any, projectId, clip.id);
      }
    });
  };

  const toClipRows = (rows: VideoClipRow[]): ClipRow[] =>
    rows
      .map((row) => ({
        id: row.id,
        video_url: row.video_url,
        start_time_sec: row.start_time_sec ?? 0,
        end_time_sec: row.end_time_sec ?? 0,
        source_url: row.source_url ?? null,
      }))
      .filter((row) => isPlayableUrl(String(row.video_url ?? "")))
      .slice(0, 3);

  const handleGenerate = async () => {
    const trimmed = videoUrlInput.trim();
    if (!trimmed) {
      setMessage("Paste a video link to continue.");
      return;
    }

    if (clips.length > 0) trackIgnored(clips);
    setIsLoading(true);
    setActiveJobStatus("queued");
    setMessage("");
    setSelectedClipId(null);
    setFeedbackByClipId({});
    setDownloadsByClipId({});
    setPlayedByClipId({});
    setWatchMarksByClipId({});
    setDebugErrorMessage(null);
    setDebugClipCount(0);
    setDebugHasVideoUrl(false);
    setDebugNoClipReason(null);
    firstSelectedTrackedRef.current = false;
    void trackEvent("generation_started", projectId, "lsa_clips_debug_generate");

    try {
      const created = await createVideoJobFromSourceUrl(projectId, trimmed);
      console.log("[debug] job created", { id: created.id, status: created.status });
      setLastJobId(created.id);
      setClips([]);
      setActiveJobId(created.id);
      setActiveJobStatus(created.status);
      pollStartedAtRef.current = Date.now();
    } catch (error) {
      const fallback = error instanceof Error ? error.message : "processVideoFromUrl failed";
      setDebugErrorMessage(fallback);
      setDebugNoClipReason(deriveNoClipReason(fallback, 0));
      setMessage(fallback);
      setActiveJobId(null);
      setActiveJobStatus(null);
      setIsLoading(false);
      void trackEvent("generation_failed", projectId, "lsa_clips_debug_generation_failed");
    }
  };

  useEffect(() => {
    if (!activeJobId) return;
    let cancelled = false;

    const poll = async () => {
      try {
        const state = await fetchClipperState(projectId, activeJobId, { cacheBuster: Date.now() });
        if (cancelled) return;
        const status = state.latestJob?.status ?? null;
        const errorMessage = state.latestJob?.error_message ?? null;
        const playable = toClipRows(state.clips);
        const hasVideoUrl = playable.some((clip) => Boolean(clip.video_url && clip.video_url.trim()));

        setActiveJobStatus(status);
        setDebugErrorMessage(errorMessage);
        setDebugClipCount(playable.length);
        setDebugHasVideoUrl(hasVideoUrl);

        console.log("[debug] job status", { id: activeJobId, status });
        console.log("[debug] error_message", errorMessage);

        if (playable.length === 3) {
          setClips(playable);
          setIsLoading(false);
          setMessage("");
          setDebugNoClipReason(null);
          setActiveJobId(null);
          setActiveJobStatus(null);
          pollStartedAtRef.current = null;
          return;
        }

        const timedOut =
          Boolean(pollStartedAtRef.current) &&
          (status === "queued" || status === "processing") &&
          Date.now() - (pollStartedAtRef.current ?? 0) > POLL_TIMEOUT_MS;

        if (status === "failed" || timedOut || status === "completed") {
          const reason = timedOut ? "yt-dlp timeout" : deriveNoClipReason(errorMessage, playable.length);
          setDebugNoClipReason(reason);
          setMessage(reason);
          setClips(playable);
          setIsLoading(false);
          setActiveJobId(null);
          setActiveJobStatus(null);
          pollStartedAtRef.current = null;
          if (status === "failed") {
            void trackEvent("generation_failed", projectId, "lsa_clips_debug_poll_failed");
          }
        }
      } catch (error) {
        if (!cancelled) {
          const fallback = error instanceof Error ? error.message : "processVideoFromUrl failed";
          setDebugErrorMessage(fallback);
          setDebugNoClipReason(deriveNoClipReason(fallback, 0));
          setMessage(fallback);
          setClips([]);
          setIsLoading(false);
          setActiveJobId(null);
          setActiveJobStatus(null);
          pollStartedAtRef.current = null;
          void trackEvent("generation_failed", projectId, "lsa_clips_debug_poll_error");
        }
      }
    };

    void poll();
    const interval = window.setInterval(() => void poll(), 2000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [activeJobId, projectId]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-2 text-xs font-semibold tracking-wide text-amber-700">VERSION: V3 DEBUG PIPELINE</div>
        <h1 className="text-3xl font-bold tracking-tight">LSA Clips</h1>
        <p className="mt-1 text-sm text-muted-foreground">Paste a video link and get clips instantly</p>

        <section className="mt-6 max-w-2xl rounded-xl border border-border/60 bg-card p-4">
          <label className="block text-sm font-medium">Video link</label>
          <input
            type="url"
            value={videoUrlInput}
            onChange={(e) => setVideoUrlInput(e.target.value)}
            placeholder="Paste YouTube or public video link"
            className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void handleGenerate()}
              disabled={isLoading}
              className="inline-flex items-center rounded-md bg-foreground px-4 py-2 text-sm font-semibold text-background disabled:opacity-60"
            >
              Generate Clips
            </button>
            <button
              type="button"
              onClick={() => void handleGenerate()}
              disabled={isLoading || !videoUrlInput.trim()}
              className="inline-flex items-center rounded-md border border-border px-4 py-2 text-sm font-semibold hover:bg-secondary disabled:opacity-60"
            >
              Regenerate Clips
            </button>
          </div>
          {isLoading || activeJobStatus === "queued" || activeJobStatus === "processing" ? (
            <p className="mt-2 text-sm text-muted-foreground">Generating clips...</p>
          ) : null}
          {message ? <p className="mt-2 text-sm text-muted-foreground">{message}</p> : null}

          <div className="mt-3 rounded-md border border-border/60 p-2 text-xs text-muted-foreground">
            <p>Job created: {lastJobId ?? "-"}</p>
            <p>Job status: {activeJobStatus ?? "idle"}</p>
            <p>error_message: {debugErrorMessage ?? "-"}</p>
            <p>Worker clips returned: {debugClipCount}</p>
            <p>Worker video_url exists: {debugHasVideoUrl ? "yes" : "no"}</p>
            {debugNoClipReason ? <p>No clips reason: {debugNoClipReason}</p> : null}
          </div>
        </section>

        {clips.length > 0 ? (
          <section className="mt-4 max-w-2xl">
            <button
              type="button"
              onClick={() => setShowOriginal((prev) => !prev)}
              className="text-xs text-muted-foreground underline underline-offset-2"
            >
              {showOriginal ? "Hide original video" : "View original video"}
            </button>
            {showOriginal && videoUrlInput.trim() ? (
              <div className="mt-2 rounded-xl border border-border/60 bg-card p-3">
                <a href={videoUrlInput.trim()} target="_blank" rel="noopener noreferrer" className="text-sm underline">
                  Open original source link
                </a>
              </div>
            ) : null}
          </section>
        ) : null}

        <section className="mt-8">
          {clips.length === 0 && !isLoading && !activeJobId ? (
            <p className="text-sm text-muted-foreground">No clips yet. Paste a video link to get started.</p>
          ) : clips.length > 0 || isLoading || activeJobId ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {cardSlots.map((clip, idx) => {
                const hasClip = Boolean(clip);
                const clipId = clip?.id ?? `pending-${idx}`;
                const directUrl = (clip?.video_url ?? "").trim();
                const hasVideoUrl = directUrl.length > 0 && isPlayableUrl(directUrl);
                const startRaw = Number(clip?.start_time_sec ?? clip?.start_time ?? 0);
                const endRaw = Number(clip?.end_time_sec ?? clip?.end_time ?? 0);
                const start = Math.max(0, Math.floor(startRaw));
                const end = Math.max(start, Math.floor(endRaw));
                const duration = Math.max(0, end - start);
                const feedback = feedbackByClipId[clipId];
                const feedbackHidden = Boolean(feedback?.hidden);
                const isSelected = selectedClipId === clipId;

                return (
                  <article
                    key={clipId}
                    onClick={() => {
                      if (!hasClip) return;
                      setSelectedClipId(clipId);
                      if (!firstSelectedTrackedRef.current) {
                        firstSelectedTrackedRef.current = true;
                        void trackEvent("first_clip_selected" as any, projectId, clipId);
                      }
                    }}
                    className={`rounded-xl border bg-card p-3 transition ${
                      isSelected ? "border-foreground/80 ring-1 ring-foreground/30" : "border-border/60"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold">{`Clip ${idx + 1}`}</p>
                      {idx === 0 && hasClip ? <span className="text-xs text-amber-700">⭐ Best Clip</span> : null}
                    </div>
                    <div className="mt-2 aspect-video overflow-hidden rounded-lg border border-border/60 bg-black">
                      {hasVideoUrl ? (
                        <video
                          src={directUrl}
                          controls
                          playsInline
                          preload="metadata"
                          className="h-full w-full object-cover"
                          onPlay={(e) => {
                            const alreadyPlayed = Boolean(playedByClipId[clipId]);
                            if (!alreadyPlayed) {
                              setPlayedByClipId((prev) => ({ ...prev, [clipId]: true }));
                              void trackEvent("clip_played" as any, projectId, clipId);
                            } else {
                              void trackEvent("clip_replayed" as any, projectId, clipId);
                            }
                            const node = e.currentTarget;
                            if (node.currentTime <= 0.3 && alreadyPlayed) {
                              void trackEvent("clip_replayed" as any, projectId, clipId);
                            }
                          }}
                          onTimeUpdate={(e) => {
                            const node = e.currentTarget;
                            if (!node.duration || !Number.isFinite(node.duration)) return;
                            const pct = Math.floor((node.currentTime / node.duration) * 100);
                            const marks = [25, 50, 75, 100] as const;
                            const clipMarks = watchMarksByClipId[clipId] ?? {};
                            marks.forEach((mark) => {
                              if (pct >= mark && !clipMarks[mark]) {
                                setWatchMarksByClipId((prev) => ({
                                  ...prev,
                                  [clipId]: { ...(prev[clipId] ?? {}), [mark]: true },
                                }));
                                void trackEvent("clip_watch_percentage" as any, projectId, clipId, { percent: mark });
                              }
                            });
                          }}
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <span className="text-xs text-muted-foreground">Clip still processing</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-3 min-h-8">
                      {hasVideoUrl ? (
                        <button
                          type="button"
                          onClick={() => {
                            void forceDownload(directUrl, `alize-clip-${idx + 1}.mp4`);
                            setDownloadsByClipId((prev) => ({ ...prev, [clipId]: true }));
                            void trackEvent("clip_downloaded", projectId, clipId);
                          }}
                          className="inline-flex items-center rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-secondary"
                        >
                          Download MP4 for YouTube Shorts
                        </button>
                      ) : (
                        <span className="text-xs text-muted-foreground">Clip still processing</span>
                      )}
                      {hasVideoUrl ? (
                        <p className="mt-1 text-[11px] text-muted-foreground">Ready for YouTube Shorts, Reels or TikTok</p>
                      ) : null}
                    </div>

                    {hasVideoUrl ? (
                      <div className="mt-2 text-xs text-muted-foreground">
                        <p>Start: {formatTime(start)}</p>
                        <p>End: {formatTime(end)}</p>
                        <p>Duration: {formatTime(duration)}</p>
                      </div>
                    ) : null}

                    {hasVideoUrl && !feedbackHidden ? (
                      <div className="mt-3">
                        {feedback?.choice ? (
                          <p className="text-xs text-muted-foreground">Thank you for your feedback</p>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {FEEDBACK_OPTIONS.map((choice) => (
                              <button
                                key={choice}
                                type="button"
                                onClick={() => {
                                  setFeedbackByClipId((prev) => ({
                                    ...prev,
                                    [clipId]: { choice, hidden: false },
                                  }));
                                  void trackEvent("clip_feedback_submitted" as any, projectId, clipId, { choice });
                                  window.setTimeout(() => {
                                    setFeedbackByClipId((prev) => ({
                                      ...prev,
                                      [clipId]: { choice, hidden: true },
                                    }));
                                  }, 1000);
                                }}
                                className="rounded-md border border-border px-2 py-1 text-[11px] hover:bg-secondary"
                              >
                                {choice}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No clips yet. Paste a video link to get started.</p>
          )}
        </section>
      </main>
    </div>
  );
}
