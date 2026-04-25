import { useEffect, useMemo, useRef, useState } from "react";
import { trackEvent } from "@/lib/trackingEvents";
import { ensureVideoMvpProjectId } from "@/lib/videoMvpProject";
import { createVideoJobFromSourceUrl, fetchClipperState, type VideoClipRow, type VideoJobStatus } from "@/lib/mvp/videoClipperBackend";

type ClipRow = {
  id: string;
  video_url: string | null;
  start_time_sec: number | null;
  end_time_sec: number | null;
};

type FeedbackSentiment = "good" | "bad" | null;
type FeedbackState = {
  sentiment: FeedbackSentiment;
  reason: string | null;
  saved: boolean;
  completed: boolean;
};

const GOOD_REASONS = ["Strong hook", "Funny", "Useful", "Ready to post", "Clear moment", "Other"] as const;
const BAD_REASONS = ["Wrong moment", "Too long", "Bad quality", "Boring", "Not useful", "Other"] as const;

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

function toClipRows(rows: VideoClipRow[]): ClipRow[] {
  return rows
    .map((row) => ({
      id: row.id,
      video_url: row.video_url ?? null,
      start_time_sec: row.start_time_sec ?? 0,
      end_time_sec: row.end_time_sec ?? 0,
    }))
    .filter((row) => isPlayableUrl(String(row.video_url ?? "")))
    .slice(0, 3);
}

export default function ClipperUserV3() {
  const [videoUrlInput, setVideoUrlInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [clips, setClips] = useState<ClipRow[]>([]);
  const [previousPlayableClips, setPreviousPlayableClips] = useState<ClipRow[]>([]);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [activeJobStatus, setActiveJobStatus] = useState<VideoJobStatus | null>(null);
  const [viewedIds, setViewedIds] = useState<Record<string, true>>({});
  const [feedbackByClipId, setFeedbackByClipId] = useState<Record<string, FeedbackState>>({});
  const projectId = ensureVideoMvpProjectId();
  const pollStartedAtRef = useRef<number | null>(null);
  const POLL_TIMEOUT_MS = 45000;

  useEffect(() => {
    void trackEvent("page_view", projectId, "clips_v3");
  }, [projectId]);

  useEffect(() => {
    let cancelled = false;
    const loadInitialPlayable = async () => {
      try {
        const state = await fetchClipperState(projectId, null, { cacheBuster: Date.now() });
        if (cancelled) return;
        const playableRows = toClipRows(state.clips);
        console.log("[clips-v3] playable rows", { source: "initial", count: playableRows.length });
        if (playableRows.length > 0) {
          setClips(playableRows);
          setPreviousPlayableClips(playableRows);
          setMessage("");
        }
      } catch {
        // Keep UI stable without forcing an error banner on first load.
      }
    };
    void loadInitialPlayable();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  useEffect(() => {
    if (!activeJobId) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const state = await fetchClipperState(projectId, activeJobId, { cacheBuster: Date.now() });
        if (cancelled) return;
        const status = state.latestJob?.status ?? null;
        console.log("[clips-v3] poll status", { jobId: activeJobId, status });
        setActiveJobStatus(status);
        const playableRows = toClipRows(state.clips);
        console.log("[clips-v3] playable rows", { jobId: activeJobId, count: playableRows.length });
        if (playableRows.length > 0) {
          setClips(playableRows);
          setPreviousPlayableClips(playableRows);
          setMessage("");
        }
        const pollStartedAt = pollStartedAtRef.current;
        const timedOut =
          Boolean(pollStartedAt) &&
          (status === "queued" || status === "processing") &&
          playableRows.length === 0 &&
          Date.now() - (pollStartedAt ?? 0) > POLL_TIMEOUT_MS;
        if (timedOut) {
          setMessage("That video could not be processed. Showing previous clips.");
          setClips(previousPlayableClips);
          console.log("[clips-v3] restored previous clips", { reason: "timeout", count: previousPlayableClips.length });
          setIsLoading(false);
          setActiveJobId(null);
          setActiveJobStatus(null);
          pollStartedAtRef.current = null;
          return;
        }
        if (status === "failed") {
          setMessage("New job failed. Showing previous clips.");
          setClips(previousPlayableClips);
          console.log("[clips-v3] restored previous clips", { reason: "failed", count: previousPlayableClips.length });
          setIsLoading(false);
          setActiveJobId(null);
          setActiveJobStatus(null);
          pollStartedAtRef.current = null;
          return;
        }
        if (status === "completed" && playableRows.length === 0) {
          setMessage("No clips yet.");
          setClips(previousPlayableClips);
          console.log("[clips-v3] restored previous clips", { reason: "completed-no-playable", count: previousPlayableClips.length });
          setIsLoading(false);
          setActiveJobId(null);
          setActiveJobStatus(null);
          pollStartedAtRef.current = null;
          return;
        }
        if (status === "completed" && playableRows.length > 0) {
          setIsLoading(false);
          setActiveJobId(null);
          setActiveJobStatus(null);
          pollStartedAtRef.current = null;
        }
      } catch {
        if (!cancelled) {
          setMessage("Failed to poll new job.");
          setClips(previousPlayableClips);
          console.log("[clips-v3] restored previous clips", { reason: "poll-error", count: previousPlayableClips.length });
          setIsLoading(false);
          setActiveJobId(null);
          setActiveJobStatus(null);
          pollStartedAtRef.current = null;
        }
      }
    };

    void poll();
    const interval = window.setInterval(() => {
      void poll();
    }, 2000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [activeJobId, previousPlayableClips, projectId]);

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

  const markSavedBriefly = (clipId: string) => {
    setFeedbackByClipId((prev) => ({
      ...prev,
      [clipId]: { ...(prev[clipId] ?? { sentiment: null, reason: null, saved: false, completed: false }), saved: true },
    }));
    window.setTimeout(() => {
      setFeedbackByClipId((prev) => ({
        ...prev,
        [clipId]: { ...(prev[clipId] ?? { sentiment: null, reason: null, saved: false, completed: false }), saved: false },
      }));
    }, 1200);
  };

  const handleGenerate = async () => {
    const trimmed = videoUrlInput.trim();
    if (!trimmed) {
      setMessage("Enter a video URL first.");
      return;
    }

    setIsLoading(true);
    setMessage("");
    void trackEvent("generation_started", projectId, "clips_v3_generate");

    try {
      const createdJob = await createVideoJobFromSourceUrl(projectId, trimmed);
      console.log("[clips-v3] created job", { jobId: createdJob.id, status: createdJob.status });
      setPreviousPlayableClips(clips);
      setFeedbackByClipId({});
      setViewedIds({});
      setActiveJobId(createdJob.id);
      setActiveJobStatus(createdJob.status);
      pollStartedAtRef.current = Date.now();
      setMessage("Generating clips for new link...");
    } catch {
      setMessage("Failed to start generation.");
      setIsLoading(false);
      void trackEvent("generation_failed", projectId, "clips_v3_failed_start");
    }
  };

  const showProcessing = isLoading || activeJobStatus === "queued" || activeJobStatus === "processing";

  const headerStatus = useMemo(() => {
    if (showProcessing) return "Generating clips for new link...";
    if (activeJobStatus === "failed") return "Generation failed";
    return "";
  }, [showProcessing, activeJobStatus]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-2 text-xs font-semibold tracking-wide text-amber-700">CLIPPER USER V3</div>
        <h1 className="text-3xl font-bold tracking-tight">Alizé Clips</h1>

        <section className="mt-6 max-w-2xl rounded-xl border border-border/60 bg-card p-4">
          <label className="block text-sm font-medium">Video URL</label>
          <input
            type="url"
            value={videoUrlInput}
            onChange={(e) => setVideoUrlInput(e.target.value)}
            placeholder="Paste video URL"
            className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={() => void handleGenerate()}
            disabled={isLoading}
            className="mt-3 inline-flex items-center rounded-md bg-foreground px-4 py-2 text-sm font-semibold text-background disabled:opacity-60"
          >
            {isLoading ? "Loading..." : "Generate Clips"}
          </button>
          {headerStatus ? <p className="mt-2 text-sm text-muted-foreground">{headerStatus}</p> : null}
          {message ? <p className="mt-1 text-sm text-muted-foreground">{message}</p> : null}
        </section>

        <section className="mt-8">
          {clips.length === 0 ? (
            <p className="text-sm text-muted-foreground">No clips yet.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {clips.map((clip, idx) => {
                const directUrl = (clip.video_url ?? "").trim();
                const hasVideoUrl = directUrl.length > 0;
                const start = Math.max(0, Math.floor(Number(clip.start_time_sec) || 0));
                const end = Math.max(start, Math.floor(Number(clip.end_time_sec) || 0));
                const duration = Math.max(0, end - start);
                const feedback = feedbackByClipId[clip.id] ?? { sentiment: null, reason: null, saved: false, completed: false };
                const reasonOptions = feedback.sentiment === "bad" ? BAD_REASONS : feedback.sentiment === "good" ? GOOD_REASONS : [];

                return (
                  <article key={clip.id} className="rounded-xl border border-border/60 bg-card p-3">
                    <p className="text-sm font-semibold">{`Clip ${idx + 1}`}</p>
                    <div className="mt-2 aspect-video overflow-hidden rounded-lg border border-border/60 bg-black">
                      <video
                        src={directUrl}
                        controls
                        playsInline
                        preload="metadata"
                        className="h-full w-full object-cover"
                        onPlay={() => {
                          if (viewedIds[clip.id]) return;
                          setViewedIds((prev) => ({ ...prev, [clip.id]: true }));
                          void trackEvent("clip_viewed", projectId, clip.id);
                        }}
                      />
                    </div>

                    <div className="mt-3">
                      {hasVideoUrl ? (
                        <button
                          type="button"
                          onClick={() => {
                            void forceDownload(clip.video_url ?? directUrl, `alize-clip-${idx + 1}.mp4`);
                            void trackEvent("clip_downloaded", projectId, clip.id);
                          }}
                          className="inline-flex items-center rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-secondary"
                        >
                          Download MP4 for YouTube
                        </button>
                      ) : (
                        <span className="text-xs text-muted-foreground">Clip still processing</span>
                      )}
                    </div>

                    <p className="mt-2 text-xs text-muted-foreground">Source time: {formatTime(start)} - {formatTime(end)}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Duration: {formatTime(duration)}</p>

                    {!feedback.completed ? (
                      <>
                        <div className="mt-3 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setFeedbackByClipId((prev) => ({
                                ...prev,
                                [clip.id]: { sentiment: "good", reason: null, saved: false, completed: false },
                              }));
                            }}
                            className={`inline-flex items-center rounded-md border px-3 py-1 text-xs font-medium ${
                              feedback.sentiment === "good" ? "border-foreground bg-secondary" : "border-border hover:bg-secondary"
                            }`}
                          >
                            Good
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setFeedbackByClipId((prev) => ({
                                ...prev,
                                [clip.id]: { sentiment: "bad", reason: null, saved: false, completed: false },
                              }));
                            }}
                            className={`inline-flex items-center rounded-md border px-3 py-1 text-xs font-medium ${
                              feedback.sentiment === "bad" ? "border-foreground bg-secondary" : "border-border hover:bg-secondary"
                            }`}
                          >
                            Bad
                          </button>
                          {feedback.saved ? <span className="text-xs text-muted-foreground">Thanks for your feedback ✓</span> : null}
                        </div>

                        {feedback.sentiment ? (
                          <div className="mt-2">
                            <p className="text-xs text-muted-foreground">Why?</p>
                            <div className="mt-1 flex flex-wrap gap-1.5">
                              {reasonOptions.map((reason) => (
                                <button
                                  key={reason}
                                  type="button"
                                  onClick={() => {
                                    const eventName = feedback.sentiment === "good" ? "clip_feedback_good" : "clip_feedback_bad";
                                    void trackEvent(eventName, projectId, clip.id);
                                    void trackEvent("clip_feedback_reason" as any, projectId, reason, {
                                      clipId: clip.id,
                                      sentiment: feedback.sentiment,
                                    });
                                    setFeedbackByClipId((prev) => ({
                                      ...prev,
                                      [clip.id]: {
                                        sentiment: feedback.sentiment,
                                        reason,
                                        saved: true,
                                        completed: false,
                                      },
                                    }));
                                    window.setTimeout(() => {
                                      markSavedBriefly(clip.id);
                                      setFeedbackByClipId((prev) => ({
                                        ...prev,
                                        [clip.id]: {
                                          sentiment: feedback.sentiment,
                                          reason,
                                          saved: false,
                                          completed: true,
                                        },
                                      }));
                                    }, 900);
                                  }}
                                  className={`rounded-md border px-2 py-1 text-[11px] ${
                                    feedback.reason === reason ? "border-foreground bg-secondary" : "border-border hover:bg-secondary"
                                  }`}
                                >
                                  {reason}
                                </button>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </>
                    ) : null}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
