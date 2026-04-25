import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/trackingEvents";
import { ensureVideoMvpProjectId } from "@/lib/videoMvpProject";

type ClipRow = {
  id: string;
  video_url: string | null;
  start_time_sec: number | null;
  end_time_sec: number | null;
  start_time?: number | null;
  end_time?: number | null;
};

type FeedbackSentiment = "good" | "bad" | null;
type FeedbackState = {
  sentiment: FeedbackSentiment;
  reason: string | null;
  saved: boolean;
  hidden: boolean;
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

export default function ClipperUserV2FeedbackFix() {
  const [videoUrlInput, setVideoUrlInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [clips, setClips] = useState<ClipRow[]>([]);
  const [viewedIds, setViewedIds] = useState<Record<string, true>>({});
  const [feedbackByClipId, setFeedbackByClipId] = useState<Record<string, FeedbackState>>({});
  const projectId = ensureVideoMvpProjectId();

  useEffect(() => {
    void trackEvent("page_view", projectId, "clips_v2_feedback_fix");
  }, [projectId]);

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

  const setSentiment = (clipId: string, sentiment: FeedbackSentiment) => {
    setFeedbackByClipId((prev) => ({
      ...prev,
      [clipId]: {
        ...(prev[clipId] ?? { sentiment: null, reason: null, saved: false, hidden: false }),
        sentiment,
      },
    }));
  };

  const setReason = (clipId: string, reason: string) => {
    setFeedbackByClipId((prev) => ({
      ...prev,
      [clipId]: {
        ...(prev[clipId] ?? { sentiment: null, reason: null, saved: false, hidden: false }),
        reason,
      },
    }));
  };

  const handleGenerate = async () => {
    const trimmed = videoUrlInput.trim();
    if (!trimmed) {
      setMessage("Enter a video URL first.");
      return;
    }

    setIsLoading(true);
    setMessage("");
    void trackEvent("generation_started", projectId, "clips_v2_generate");

    try {
      const { data, error } = await supabase
        .from("video_clips")
        .select("id, video_url, start_time_sec, end_time_sec")
        .not("video_url", "is", null)
        .order("created_at", { ascending: false })
        .limit(30);

      if (error) {
        setMessage(error.message || "Failed to load clips.");
        setClips([]);
        void trackEvent("generation_failed", projectId, "clips_v2_failed");
        return;
      }

      const rows = ((data ?? []) as ClipRow[]).filter((row) => isPlayableUrl(String(row.video_url ?? "")));
      setClips(rows.slice(0, 3));
      if (rows.length === 0) {
        setMessage("No clips yet.");
      }
    } catch {
      setMessage("Failed to load clips.");
      setClips([]);
      void trackEvent("generation_failed", projectId, "clips_v2_failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-2 text-xs font-semibold tracking-wide text-amber-700">CLIPPER V2 FEEDBACK FIX</div>
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
          {message ? <p className="mt-2 text-sm text-muted-foreground">{message}</p> : null}
        </section>

        <section className="mt-8">
          {clips.length === 0 ? (
            <p className="text-sm text-muted-foreground">No clips yet.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {clips.map((clip, idx) => {
                const directUrl = (clip.video_url ?? "").trim();
                const hasVideoUrl = directUrl.length > 0;
                const startRaw = Number(clip.start_time_sec ?? clip.start_time ?? 0);
                const endRaw = Number(clip.end_time_sec ?? clip.end_time ?? 0);
                const start = Math.max(0, Math.floor(startRaw));
                const end = Math.max(start, Math.floor(endRaw));
                const duration = Math.max(0, end - start);
                const feedback = feedbackByClipId[clip.id] ?? { sentiment: null, reason: null, saved: false, hidden: false };
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

                    {!feedback.hidden ? (
                      <>
                        <div className="mt-3 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setSentiment(clip.id, "good");
                              void trackEvent("clip_feedback_good", projectId, clip.id);
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
                              setSentiment(clip.id, "bad");
                              void trackEvent("clip_feedback_bad", projectId, clip.id);
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
                                    setReason(clip.id, reason);
                                    setFeedbackByClipId((prev) => ({
                                      ...prev,
                                      [clip.id]: {
                                        ...(prev[clip.id] ?? { sentiment: null, reason: null, saved: false, hidden: false }),
                                        reason,
                                        saved: true,
                                      },
                                    }));
                                    void trackEvent("clip_feedback_reason" as any, projectId, reason, {
                                      clipId: clip.id,
                                      sentiment: feedback.sentiment,
                                    });
                                    window.setTimeout(() => {
                                      setFeedbackByClipId((prev) => ({
                                        ...prev,
                                        [clip.id]: {
                                          ...(prev[clip.id] ?? { sentiment: null, reason: null, saved: false, hidden: false }),
                                          saved: false,
                                          hidden: true,
                                        },
                                      }));
                                    }, 1000);
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
