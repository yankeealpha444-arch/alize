import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowDownRight, ArrowRight, Minus, TrendingUp } from "lucide-react";
import { sanitizeIdeaForPersistence } from "@/lib/mvp/ideaContentSafety";
import { useProjectId } from "@/hooks/useProject";
import VideoMvpSessionPanel from "@/components/mvp/VideoMvpSessionPanel";
import { getSupabaseTrackingEvents, getTrackingEvents, type TrackingEvent } from "@/lib/trackingEvents";
import { fetchGrowthSummary, type GrowthSummary } from "@/lib/mvp/videoClipperBackend";
import VideoDashboardIntel from "@/components/mvp/VideoDashboardIntel";

function countNamed(events: TrackingEvent[], type: TrackingEvent["type"]): number {
  return events.filter((e) => e.type === type).length;
}

function growthVelocityLabel(events: TrackingEvent[]): "improving" | "flat" | "declining" {
  const weights: Partial<Record<TrackingEvent["type"], number>> = {
    play_clicked: 1,
    clip_selected: 1.2,
    thumbnail_confirmed: 2,
    use_clicked: 1.5,
    completed_flow: 2.5,
    download_clicked: 0.8,
  };
  const scored = events
    .filter((e) => weights[e.type] != null)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  if (scored.length < 4) return "flat";
  const mid = Math.floor(scored.length / 2) || 1;
  const early = scored.slice(0, mid);
  const late = scored.slice(mid);
  const sum = (arr: TrackingEvent[]) =>
    arr.reduce((acc, e) => acc + (weights[e.type] ?? 0), 0);
  const s0 = sum(early);
  const s1 = sum(late);
  if (s1 > s0 * 1.15) return "improving";
  if (s1 < s0 * 0.85) return "declining";
  return "flat";
}

const Dashboard = () => {
  const projectId = useProjectId();
  const navigate = useNavigate();
  const [supabaseEvents, setSupabaseEvents] = useState<TrackingEvent[] | null>(null);
  const [growthSummary, setGrowthSummary] = useState<GrowthSummary>({
    clipsUsed: 0,
    distributionActions: 0,
    competitionActions: 0,
    feedback: { likes: 0, saves: 0, none: 0 },
  });

  useEffect(() => {
    let alive = true;
    const read = async () => {
      const rows = await getSupabaseTrackingEvents(projectId);
      if (!alive) return;
      setSupabaseEvents(rows.length > 0 ? rows : getTrackingEvents(projectId));
    };
    void read();
    const onTracking = () => void read();
    window.addEventListener("alize-tracking-updated", onTracking);
    window.addEventListener("alize-mvp-tracking-updated", onTracking);
    return () => {
      alive = false;
      window.removeEventListener("alize-tracking-updated", onTracking);
      window.removeEventListener("alize-mvp-tracking-updated", onTracking);
    };
  }, [projectId]);

  useEffect(() => {
    let alive = true;
    const read = async () => {
      try {
        const summary = await fetchGrowthSummary(projectId);
        if (!alive) return;
        setGrowthSummary(summary);
      } catch {
        // optional tables
      }
    };
    void read();
    const interval = window.setInterval(() => void read(), 8000);
    return () => {
      alive = false;
      window.clearInterval(interval);
    };
  }, [projectId]);

  const events = supabaseEvents ?? getTrackingEvents(projectId);

  const metrics = useMemo(() => {
    const uploads = countNamed(events, "upload_started");
    const plays = countNamed(events, "play_clicked");
    const clipSel = countNamed(events, "clip_selected");
    const thumbSel = countNamed(events, "thumbnail_selected");
    const thumbConf = countNamed(events, "thumbnail_confirmed");
    const uses = countNamed(events, "use_clicked");
    const downloads = countNamed(events, "download_clicked");
    const feedback = countNamed(events, "result_feedback");
    const completed = countNamed(events, "completed_flow");
    const aiFollows = countNamed(events, "ai_follow");

    let channelStatus: "No data yet" | "Early clips" | "Momentum up" | "Strong momentum" | "Full loop streak" =
      "No data yet";
    if (uploads === 0 && plays < 2) channelStatus = "No data yet";
    else if (completed >= 4 && uses >= 3 && thumbConf >= 2) channelStatus = "Full loop streak";
    else if (thumbConf >= 2 && completed >= 2 && plays >= 8) channelStatus = "Strong momentum";
    else if (thumbConf >= 1 && plays >= 3) channelStatus = "Momentum up";
    else if (uploads >= 1 && thumbConf === 0) channelStatus = "Early clips";
    else if (uploads >= 1) channelStatus = "Early clips";

    const velocity = growthVelocityLabel(events);

    const channelMomentum =
      growthSummary.clipsUsed + growthSummary.distributionActions + completed > 0
        ? `${growthSummary.clipsUsed} clip actions · ${completed} completed Shorts loops · ${growthSummary.distributionActions} distribute`
        : completed > 0
          ? `${completed} full Shorts loops recorded`
          : "Momentum builds as you confirm thumbnails and ship each Short";

    let winningPattern = "No pattern yet — confirm a thumbnail and add feedback after you post.";
    if (thumbConf >= 1 && aiFollows >= thumbConf * 0.5) {
      winningPattern = "You often keep the AI-recommended thumbnail — double down on that style.";
    } else if (uses > clipSel * 0.4) {
      winningPattern = "Strong “use” intent on ranked clips — your top pick is resonating.";
    } else if (plays > 5) {
      winningPattern = "High replay on clips — hooks are earning another look.";
    }

    let nextBest =
      "Upload a video, pick your best clip, confirm a thumbnail, post, paste your live link, then track results here.";
    if (uploads >= 1 && thumbConf === 0) nextBest = "Confirm a thumbnail on this dashboard to finish this Short’s loop.";
    else if (thumbConf >= 1 && feedback === 0)
      nextBest = "After your Short is live, add quick result feedback so the next clip can be sharper.";
    else if (velocity === "declining") nextBest = "Try a bolder thumbnail (B) or a different clip from the top 3.";
    else if (velocity === "improving") nextBest = "Keep the same rhythm: one clip, one thumbnail choice per upload.";

    let loopProof: "Keep posting" | "Ready to double down" | "Standout streak" = "Keep posting";
    if (completed >= 2 && uses >= 2 && feedback >= 1) loopProof = "Ready to double down";
    if (completed >= 4 && uses >= 4 && plays >= 12) loopProof = "Standout streak";

    return {
      uploads,
      plays,
      clipSel,
      thumbSel,
      thumbConf,
      uses,
      downloads,
      feedback,
      completed,
      aiFollows,
      channelStatus,
      velocity,
      channelMomentum,
      winningPattern,
      nextBest,
      loopProof,
    };
  }, [events, growthSummary]);

  const idea = sanitizeIdeaForPersistence(localStorage.getItem("alize_idea") || "") || "My project";
  const projectName = idea.split(" ").slice(0, 5).join(" ");

  const trendUi =
    metrics.velocity === "improving"
      ? {
          label: "Improving",
          sub: "Recent activity is stronger than earlier sessions.",
          className: "border-emerald-500/50 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200",
          Icon: TrendingUp,
        }
      : metrics.velocity === "declining"
        ? {
            label: "Declining",
            sub: "Recent signals are softer than your earlier uploads.",
            className: "border-amber-500/50 bg-amber-500/10 text-amber-900 dark:text-amber-100",
            Icon: ArrowDownRight,
          }
        : {
            label: "Flat",
            sub: "Steady — add one more upload to see a clearer trend.",
            className: "border-border bg-muted/40 text-foreground",
            Icon: Minus,
          };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">YouTube Shorts growth — {projectName}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Upload a video, select your best clip, confirm a thumbnail, post your Short, paste the live YouTube link, track
            results, then improve your next video. Everything saves automatically.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate(`/video-mvp/${projectId}`)}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-xs font-semibold hover:bg-secondary"
        >
          Back to clips
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className={`rounded-xl border p-4 flex items-start gap-3 ${trendUi.className}`}>
        <trendUi.Icon className="w-5 h-5 shrink-0 mt-0.5" aria-hidden />
        <div>
          <p className="text-xs font-bold uppercase tracking-widest opacity-80">Growth velocity</p>
          <p className="text-lg font-semibold mt-1">{trendUi.label}</p>
          <p className="text-sm opacity-90 mt-1">{trendUi.sub}</p>
        </div>
      </div>

      <section className="rounded-xl border border-border bg-card p-5 space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Creator · Shorts growth loop</h3>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => navigate(`/tests/${projectId}`)}
            className="rounded-full border border-border bg-background px-5 py-2 text-sm font-semibold text-foreground hover:bg-muted"
          >
            Open tool hub
          </button>
          <button
            type="button"
            onClick={() => navigate(`/preview/${projectId}`)}
            className="rounded-full border border-border bg-background px-5 py-2 text-sm font-semibold text-foreground hover:bg-muted"
          >
            Open Preview Changes
          </button>
          <button
            type="button"
            onClick={() => navigate(`/builder/${projectId}`)}
            className="rounded-full border border-border bg-background px-5 py-2 text-sm font-semibold text-foreground hover:bg-muted"
          >
            Open Builder
          </button>
        </div>
      </section>

      <VideoMvpSessionPanel
        projectId={projectId}
        stepLabel="Video MVP · AI CEO (private)"
        showPublicMvpLink
      />

      <VideoDashboardIntel projectId={projectId} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <section className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">1. Channel status</h3>
          <p className="text-2xl font-bold text-foreground mt-2">{metrics.channelStatus}</p>
          <p className="text-xs text-muted-foreground mt-2">
            Uploads {metrics.uploads} · Confirms {metrics.thumbConf} · Completed flows {metrics.completed}
          </p>
        </section>
        <section className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">2. Growth velocity</h3>
          <p className="text-2xl font-bold text-foreground mt-2 capitalize">{metrics.velocity}</p>
          <p className="text-xs text-muted-foreground mt-2">Compared from first half vs second half of in-app signals.</p>
        </section>
        <section className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">3. Channel momentum</h3>
          <p className="text-sm text-foreground mt-2 leading-relaxed">{metrics.channelMomentum}</p>
        </section>
        <section className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">4. Winning pattern</h3>
          <p className="text-sm text-foreground mt-2 leading-relaxed">{metrics.winningPattern}</p>
        </section>
        <section className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">5. Next best action</h3>
          <p className="text-sm text-foreground mt-2 leading-relaxed">{metrics.nextBest}</p>
        </section>
        <section className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">6. Loop proof</h3>
          <p className="text-2xl font-bold text-foreground mt-2">{metrics.loopProof}</p>
          <p className="text-xs text-muted-foreground mt-2">
            Uses {metrics.uses} · Feedback {metrics.feedback} · AI follow events {metrics.aiFollows}
          </p>
        </section>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Clip & thumbnail signals</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <p className="text-muted-foreground">Plays</p>
            <p className="text-lg font-semibold text-foreground">{metrics.plays}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Clip selects</p>
            <p className="text-lg font-semibold text-foreground">{metrics.clipSel}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Thumbnail picks</p>
            <p className="text-lg font-semibold text-foreground">{metrics.thumbSel}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Downloads</p>
            <p className="text-lg font-semibold text-foreground">{metrics.downloads}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
