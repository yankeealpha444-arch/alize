import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import {
  getSupabaseTrackingEvents,
  getTrackingEvents,
  type TrackingEvent,
} from "@/lib/trackingEvents";
import { ensureVideoMvpProjectId } from "@/lib/videoMvpProject";
import { summarizeFounderLoop } from "@/lib/founderLoopAiCeo";
import { useFounderAuth } from "@/context/FounderAuthContext";

const CORE_EVENT_TYPES = new Set<TrackingEvent["type"]>([
  "session_started",
  "link_submitted",
  "clips_generated",
  "clip_played",
  "clip_downloaded",
  "generation_failed",
]);

export default function InternalMetrics() {
  const { isFounder } = useFounderAuth();
  const [events, setEvents] = useState<TrackingEvent[]>([]);
  const projectId = ensureVideoMvpProjectId();

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const localEvents = getTrackingEvents(projectId);
      const supabaseEvents = await getSupabaseTrackingEvents(projectId);
      if (!mounted) return;
      setEvents([...localEvents, ...supabaseEvents]);
    };
    void load();
    const onUpdate = () => void load();
    window.addEventListener("alize-tracking-updated", onUpdate);
    window.addEventListener("alize-mvp-tracking-updated", onUpdate);
    return () => {
      mounted = false;
      window.removeEventListener("alize-tracking-updated", onUpdate);
      window.removeEventListener("alize-mvp-tracking-updated", onUpdate);
    };
  }, [projectId]);

  const founderLoopEvents = useMemo(
    () => events.filter((e) => CORE_EVENT_TYPES.has(e.type)),
    [events],
  );
  const summary = useMemo(() => summarizeFounderLoop(founderLoopEvents), [founderLoopEvents]);
  const lastActivity = useMemo(() => {
    if (founderLoopEvents.length === 0) return null;
    const latest = founderLoopEvents.reduce((acc, cur) => {
      const accTime = Date.parse(acc.timestamp);
      const curTime = Date.parse(cur.timestamp);
      return curTime > accTime ? cur : acc;
    });
    return latest.timestamp;
  }, [founderLoopEvents]);

  if (!isFounder) {
    return <Navigate to="/video" replace />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <header>
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Founder only</p>
          <h1 className="text-2xl font-semibold mt-2">AI CEO founder loop</h1>
          <p className="text-sm text-muted-foreground mt-2">Project: {projectId}</p>
          <p className="text-sm text-muted-foreground mt-1">
            Last activity: {lastActivity ? new Date(lastActivity).toLocaleString() : "No activity yet"}
          </p>
        </header>

        <section className="rounded-xl border border-border/60 bg-card p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            <div className="rounded-md border border-border/60 px-3 py-2">Sessions: {summary.counts.sessionsStarted}</div>
            <div className="rounded-md border border-border/60 px-3 py-2">Links submitted: {summary.counts.linksSubmitted}</div>
            <div className="rounded-md border border-border/60 px-3 py-2">Clips generated: {summary.counts.clipsGenerated}</div>
            <div className="rounded-md border border-border/60 px-3 py-2">Clips played: {summary.counts.clipsPlayed}</div>
            <div className="rounded-md border border-border/60 px-3 py-2">Clips downloaded: {summary.counts.clipsDownloaded}</div>
            <div className="rounded-md border border-border/60 px-3 py-2">Generation failures: {summary.counts.generationFailed}</div>
          </div>
        </section>

        {founderLoopEvents.length === 0 ? (
          <section className="rounded-xl border border-border/60 bg-card p-4">
            <p className="text-sm text-muted-foreground">
              No usage data yet. Send the clipper to a few users, then come back here.
            </p>
          </section>
        ) : (
          <>
            <section className="rounded-xl border border-border/60 bg-card p-4">
              <h2 className="text-sm font-semibold">Current status</h2>
              <p className="text-sm text-muted-foreground mt-2">{summary.currentStatus}</p>
            </section>

            <section className="rounded-xl border border-border/60 bg-card p-4">
              <h2 className="text-sm font-semibold">Biggest bottleneck</h2>
              <p className="text-sm text-muted-foreground mt-2">{summary.biggestBottleneck}</p>
            </section>

            <section className="rounded-xl border border-border/60 bg-card p-4">
              <h2 className="text-sm font-semibold">Next best action</h2>
              <p className="text-sm text-muted-foreground mt-2">{summary.nextBestAction}</p>
            </section>

            <section className="rounded-xl border border-border/60 bg-card p-4">
              <h2 className="text-sm font-semibold">Suggested experiment</h2>
              <p className="text-sm text-muted-foreground mt-2">{summary.suggestedExperiment}</p>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
