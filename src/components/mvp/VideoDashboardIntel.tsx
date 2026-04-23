import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { trackEvent } from "@/lib/trackingEvents";
import {
  fetchClipperState,
  storeClipPerformanceFeedback,
  type PerformFeedback,
  type VideoClipRow,
} from "@/lib/mvp/videoClipperBackend";
import { loadSignals, saveSignals, type LearningSignal } from "@/lib/mvp/clipperLearningSignals";
import { generateThumbnailDataUrl, type ThumbnailVariant } from "@/lib/mvp/thumbnailCanvas";
import { connectYoutubeReadonly, fetchYoutubeGrowthImpact, type YoutubeGrowthImpact } from "@/lib/youtubeAnalytics";

type Props = {
  projectId: string;
};

function scoreForRanking(clip: VideoClipRow): number {
  const raw = Number(clip.score);
  if (!Number.isFinite(raw) || raw <= 0) return 0;
  if (raw <= 1) return raw * 100;
  return raw;
}

function boostedScoreForClip(projectId: string, clip: VideoClipRow, signals: LearningSignal[]): number {
  const byClip: Record<string, number> = {};
  for (const s of signals) {
    const w =
      s.action_type === "use_clicked"
        ? 10
        : s.action_type === "thumbnail_confirmed"
          ? 6
          : s.action_type === "thumbnail_selected"
            ? 2
            : 1;
    byClip[s.clip_id] = (byClip[s.clip_id] ?? 0) + w;
  }
  const anySignals = Object.keys(byClip).length > 0;
  const base = scoreForRanking(clip);
  const boost = byClip[clip.id] ?? 0;
  const penalty = anySignals && boost === 0 ? 2 : 0;
  return Math.max(0, base + boost - penalty);
}

function rankClips(projectId: string, clips: VideoClipRow[]): VideoClipRow[] {
  const signals = loadSignals(projectId);
  const copy = [...clips];
  copy.sort((a, b) => boostedScoreForClip(projectId, b, signals) - boostedScoreForClip(projectId, a, signals));
  return copy;
}

function aiRecommendedVariant(clipId: string): ThumbnailVariant {
  const n = clipId.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return (["A", "B", "C"] as const)[n % 3];
}

const CONFIRM_KEY = (pid: string) => `alize_thumb_confirmed_${pid}`;

export default function VideoDashboardIntel({ projectId }: Props) {
  const [clips, setClips] = useState<VideoClipRow[]>([]);
  const [bestClip, setBestClip] = useState<VideoClipRow | null>(null);
  const [selected, setSelected] = useState<ThumbnailVariant | null>(null);
  const [confirmed, setConfirmed] = useState<ThumbnailVariant | null>(null);
  const [youtubeToken, setYoutubeToken] = useState<string | null>(null);
  const [ytImpact, setYtImpact] = useState<YoutubeGrowthImpact | null>(null);
  const [ytBusy, setYtBusy] = useState(false);
  const [feedbackBusy, setFeedbackBusy] = useState(false);

  const refresh = async () => {
    try {
      const persistedJobId = localStorage.getItem(`alize_video_job_id_${projectId}`);
      const next = await fetchClipperState(projectId, persistedJobId);
      const ranked = rankClips(projectId, next.clips);
      setClips(next.clips);
      setBestClip(ranked[0] ?? null);
    } catch {
      setClips([]);
      setBestClip(null);
    }
  };

  useEffect(() => {
    void refresh();
  }, [projectId]);

  useEffect(() => {
    const raw = localStorage.getItem(CONFIRM_KEY(projectId));
    if (raw === "A" || raw === "B" || raw === "C") setConfirmed(raw);
  }, [projectId]);

  const aiRec = useMemo(() => (bestClip ? aiRecommendedVariant(bestClip.id) : "A"), [bestClip]);

  const thumbUrls = useMemo(() => {
    if (!bestClip) return { A: "", B: "", C: "" };
    const seed = projectId;
    return {
      A: generateThumbnailDataUrl("A", bestClip, seed),
      B: generateThumbnailDataUrl("B", bestClip, seed),
      C: generateThumbnailDataUrl("C", bestClip, seed),
    };
  }, [bestClip, projectId]);

  useEffect(() => {
    if (!bestClip) return;
    void trackEvent("recommendation_viewed", projectId, "thumbnail_ai", {
      clip_id: bestClip.id,
      ai_variant: aiRec,
    });
  }, [bestClip?.id, projectId, aiRec]);

  const recordSignal = (signal: LearningSignal) => {
    const prev = loadSignals(projectId);
    prev.push(signal);
    saveSignals(projectId, prev);
  };

  const onPick = (v: ThumbnailVariant) => {
    if (!bestClip) return;
    setSelected(v);
    recordSignal({
      clip_id: bestClip.id,
      thumbnail_variant: v,
      action_type: "thumbnail_selected",
      timestamp: Date.now(),
    });
    void trackEvent("thumbnail_selected", projectId, "thumbnail", { clip_id: bestClip.id, variant: v });
  };

  const onConfirm = () => {
    if (!bestClip || !selected) {
      toast.error("Pick a thumbnail first.");
      return;
    }
    recordSignal({
      clip_id: bestClip.id,
      thumbnail_variant: selected,
      action_type: "thumbnail_confirmed",
      timestamp: Date.now(),
    });
    void trackEvent("thumbnail_confirmed", projectId, "thumbnail", { clip_id: bestClip.id, variant: selected });
    if (selected === aiRec) {
      void trackEvent("ai_follow", projectId, "thumbnail", { clip_id: bestClip.id, variant: selected });
    }
    void trackEvent("completed_flow", projectId, "thumbnail_confirmed", { clip_id: bestClip.id });
    localStorage.setItem(CONFIRM_KEY(projectId), selected);
    setConfirmed(selected);
    toast.success("Thumbnail locked in for this clip.");
  };

  const onPerfFeedback = async (kind: PerformFeedback) => {
    if (!bestClip) return;
    setFeedbackBusy(true);
    try {
      await storeClipPerformanceFeedback(projectId, bestClip.id, kind);
      void trackEvent("result_feedback", projectId, "post_performance", { clip_id: bestClip.id, feedback: kind });
      toast.message("Thanks — that sharpens the next recommendation.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save feedback");
    } finally {
      setFeedbackBusy(false);
    }
  };

  const onConnectYoutube = async () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
    if (!clientId) {
      toast.error("YouTube connect requires VITE_GOOGLE_CLIENT_ID.");
      return;
    }
    setYtBusy(true);
    try {
      const conn = await connectYoutubeReadonly(clientId);
      setYoutubeToken(conn.accessToken);
      const impact = await fetchYoutubeGrowthImpact(conn.accessToken);
      setYtImpact(impact);
      toast.message("YouTube connected — growth snapshot updated.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "YouTube connect failed");
    } finally {
      setYtBusy(false);
    }
  };

  useEffect(() => {
    if (!youtubeToken) return;
    let alive = true;
    void (async () => {
      try {
        const impact = await fetchYoutubeGrowthImpact(youtubeToken);
        if (alive) setYtImpact(impact);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      alive = false;
    };
  }, [youtubeToken]);

  if (!bestClip) {
    return (
      <section className="rounded-xl border border-dashed border-border bg-muted/20 p-6">
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Clip intelligence</h3>
        <p className="text-sm text-muted-foreground mt-2">
          Generate clips on the Clips page first — then you can pick thumbnails, connect YouTube, and log performance here.
        </p>
      </section>
    );
  }

  const userChoice = confirmed ?? selected;

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">AI recommendation vs your choice</h3>
        <p className="text-sm text-foreground">
          Alizé recommends variant <span className="font-semibold">{aiRec}</span>
          {userChoice ? (
            <>
              {" "}
              · Your pick: <span className="font-semibold">{userChoice}</span>
              {userChoice === aiRec ? (
                <span className="text-emerald-700 dark:text-emerald-300"> (aligned)</span>
              ) : (
                <span className="text-muted-foreground"> (different — both are valid tests)</span>
              )}
            </>
          ) : (
            <span className="text-muted-foreground"> · Select a thumbnail below.</span>
          )}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {(["A", "B", "C"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => onPick(v)}
              className={`rounded-lg border overflow-hidden text-left transition ${
                selected === v ? "ring-2 ring-foreground border-foreground" : "border-border hover:bg-secondary/60"
              }`}
            >
              <div className="aspect-video w-full bg-neutral-900">
                {thumbUrls[v] ? <img src={thumbUrls[v]} alt="" className="w-full h-full object-cover" /> : null}
              </div>
              <div className="px-3 py-2 flex items-center justify-between gap-2">
                <span className="text-xs font-semibold">Variant {v}</span>
                {aiRec === v ? (
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground">AI pick</span>
                ) : null}
              </div>
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onConfirm}
          disabled={!selected}
          className="w-full sm:w-auto rounded-full bg-foreground text-background px-6 py-2.5 text-xs font-semibold disabled:opacity-40"
        >
          Confirm thumbnail
        </button>
      </section>

      <section className="rounded-xl border border-border bg-card p-5 space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Post performance (quick)</h3>
        <p className="text-xs text-muted-foreground">After you publish, what performed best?</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={feedbackBusy}
            onClick={() => void onPerfFeedback("saves")}
            className="rounded-full border border-border px-4 py-2 text-xs font-medium hover:bg-secondary disabled:opacity-50"
          >
            Saves
          </button>
          <button
            type="button"
            disabled={feedbackBusy}
            onClick={() => void onPerfFeedback("likes")}
            className="rounded-full border border-border px-4 py-2 text-xs font-medium hover:bg-secondary disabled:opacity-50"
          >
            Likes
          </button>
          <button
            type="button"
            disabled={feedbackBusy}
            onClick={() => void onPerfFeedback("none")}
            className="rounded-full border border-border px-4 py-2 text-xs font-medium hover:bg-secondary disabled:opacity-50"
          >
            Neither yet
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">YouTube growth impact</h3>
            <p className="text-xs text-muted-foreground mt-1">Read-only channel snapshot to contextualize uploads.</p>
          </div>
          <button
            type="button"
            onClick={() => void onConnectYoutube()}
            disabled={ytBusy}
            className="rounded-full border border-border px-4 py-2 text-xs font-semibold hover:bg-secondary disabled:opacity-50"
          >
            {ytBusy ? "Connecting…" : youtubeToken ? "Reconnect YouTube" : "Connect YouTube"}
          </button>
        </div>
        {ytImpact ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-2 border-t border-border">
            <div>
              <p className="text-muted-foreground">Channel views</p>
              <p className="text-lg font-semibold text-foreground">{ytImpact.channel.viewCount.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Subscribers</p>
              <p className="text-lg font-semibold text-foreground">{ytImpact.channel.subscriberCount.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Δ Avg views</p>
              <p className="text-lg font-semibold text-foreground">{ytImpact.growth.viewsGrowthPct.toFixed(1)}%</p>
            </div>
            <div>
              <p className="text-muted-foreground">Δ Engagement</p>
              <p className="text-lg font-semibold text-foreground">{ytImpact.growth.engagementGrowthPct.toFixed(1)}%</p>
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Connect to compare recent uploads vs baseline.</p>
        )}
      </section>

      <section className="rounded-xl border border-border bg-card p-5 space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Attributed performance</h3>
        <p className="text-sm text-foreground leading-relaxed">
          Clips in project: {clips.length}. Top ranked clip score (server):{" "}
          <span className="font-mono tabular-nums">{Number(bestClip.score).toFixed(2)}</span>. Events in this session are
          attributed to project <span className="font-mono text-xs">{projectId.slice(0, 8)}…</span>
        </p>
      </section>
    </div>
  );
}
