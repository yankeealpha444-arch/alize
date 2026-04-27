import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getSupabaseTrackingEvents,
  getTrackingEvents,
  type TrackingEvent,
} from "@/lib/trackingEvents";
import { ensureVideoMvpProjectId } from "@/lib/videoMvpProject";
import { summarizeFounderLoop } from "@/lib/founderLoopAiCeo";
import { mapEventsToCanonical } from "@/lib/aiCeoAdapter";
import { clipperEventMap } from "@/lib/productEventMaps";

const CORE_EVENT_TYPES = new Set<TrackingEvent["type"]>([
  "session_started",
  "link_submitted",
  "clips_generated",
  "clip_played",
  "clip_downloaded",
  "generation_failed",
]);

const SESSION_COUNTS_KEY = "alize_founder_session_counts";
const SESSION_COUNTED_FLAG = "alize_founder_session_counted";

function countByType(events: TrackingEvent[], type: TrackingEvent["type"]): number {
  return events.filter((event) => event.type === type).length;
}

function pct(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function safeRatio(numerator: number, denominator: number): number {
  return denominator > 0 ? numerator / denominator : 0;
}

function ensureSessionId(): string {
  let sessionId = sessionStorage.getItem("alize_session");
  if (!sessionId) {
    sessionId = Math.random().toString(36).slice(2, 10);
    sessionStorage.setItem("alize_session", sessionId);
  }
  return sessionId;
}

export default function InternalMetrics() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<TrackingEvent[]>([]);
  const [sessionCountsVersion, setSessionCountsVersion] = useState(0);
  const projectId = ensureVideoMvpProjectId();

  useEffect(() => {
    const sessionId = ensureSessionId();
    if (sessionStorage.getItem(SESSION_COUNTED_FLAG) === "true") return;
    const rawCounts = localStorage.getItem(SESSION_COUNTS_KEY);
    const parsedCounts = rawCounts ? (JSON.parse(rawCounts) as Record<string, number>) : {};
    parsedCounts[sessionId] = (parsedCounts[sessionId] ?? 0) + 1;
    localStorage.setItem(SESSION_COUNTS_KEY, JSON.stringify(parsedCounts));
    sessionStorage.setItem(SESSION_COUNTED_FLAG, "true");
    setSessionCountsVersion((v) => v + 1);
  }, []);

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
  const canonical = useMemo(
    () => mapEventsToCanonical(founderLoopEvents, clipperEventMap),
    [founderLoopEvents],
  );
  const sessionsStarted = canonical.visit;
  const linksSubmitted = canonical.intent;
  const clipsGenerated = canonical.activation;
  const clipsPlayed = canonical.engagement;
  const clipsDownloaded = canonical.value;
  const generationFailed = useMemo(
    () => countByType(founderLoopEvents, "generation_failed"),
    [founderLoopEvents],
  );

  const computedReturningSessions = useMemo(() => {
    const perSessionStarts = founderLoopEvents
      .filter((event) => event.type === "session_started")
      .reduce<Record<string, number>>((acc, event) => {
        acc[event.sessionId] = (acc[event.sessionId] ?? 0) + 1;
        return acc;
      }, {});

    const rawCounts = localStorage.getItem(SESSION_COUNTS_KEY);
    const storedCounts = rawCounts ? (JSON.parse(rawCounts) as Record<string, number>) : {};
    const sessionIds = new Set<string>([
      ...Object.keys(storedCounts),
      ...Object.keys(perSessionStarts),
      ...founderLoopEvents.map((event) => event.sessionId),
    ]);

    let returning = 0;
    sessionIds.forEach((sessionId) => {
      const eventStarts = perSessionStarts[sessionId] ?? 0;
      const persistedCount = storedCounts[sessionId] ?? 0;
      if (eventStarts > 1 || persistedCount > 1) returning += 1;
    });
    return returning;
  }, [founderLoopEvents, sessionCountsVersion]);
  const returningSessions = computedReturningSessions;

  const interestRate = useMemo(
    () => safeRatio(linksSubmitted, sessionsStarted),
    [linksSubmitted, sessionsStarted],
  );
  const activationRate = useMemo(
    () => safeRatio(clipsGenerated, linksSubmitted),
    [clipsGenerated, linksSubmitted],
  );
  const engagementRate = useMemo(
    () => safeRatio(clipsPlayed, clipsGenerated),
    [clipsPlayed, clipsGenerated],
  );
  const valueRate = useMemo(
    () => safeRatio(clipsDownloaded, clipsPlayed),
    [clipsDownloaded, clipsPlayed],
  );
  const returnRate = useMemo(
    () => safeRatio(returningSessions, sessionsStarted),
    [returningSessions, sessionsStarted],
  );
  const failureRate = useMemo(
    () => safeRatio(generationFailed, linksSubmitted),
    [generationFailed, linksSubmitted],
  );

  const validationStatus = useMemo(() => {
    if (linksSubmitted === 0) return "No validation";
    if (interestRate < 0.3) return "Weak interest";
    return "Strong interest";
  }, [linksSubmitted, interestRate]);

  const pmfStatus = useMemo(() => {
    if (valueRate === 0) return "No PMF";
    if (valueRate > 0 && returnRate === 0) return "Weak PMF signal";
    return "PMF emerging";
  }, [valueRate, returnRate]);

  const funnelSteps = useMemo(
    () => [
      { key: "sessions", label: "Sessions", count: sessionsStarted, conversion: 1 },
      {
        key: "links",
        label: "Links",
        count: linksSubmitted,
        conversion: safeRatio(linksSubmitted, sessionsStarted),
      },
      {
        key: "generated",
        label: "Generated",
        count: clipsGenerated,
        conversion: safeRatio(clipsGenerated, linksSubmitted),
      },
      {
        key: "played",
        label: "Played",
        count: clipsPlayed,
        conversion: safeRatio(clipsPlayed, clipsGenerated),
      },
      {
        key: "downloaded",
        label: "Downloaded",
        count: clipsDownloaded,
        conversion: safeRatio(clipsDownloaded, clipsPlayed),
      },
    ],
    [sessionsStarted, linksSubmitted, clipsGenerated, clipsPlayed, clipsDownloaded],
  );

  const weakestStep = useMemo(() => {
    const candidates = funnelSteps
      .filter((step) => step.key !== "sessions")
      .filter((step) => Number.isFinite(step.conversion));
    if (candidates.length === 0) return null;
    return candidates.reduce((weakest, current) =>
      current.conversion < weakest.conversion ? current : weakest
    );
  }, [funnelSteps]);

  const pmfScore = useMemo(() => {
    const rawScore =
      activationRate * 25 + engagementRate * 25 + valueRate * 30 + returnRate * 20;
    return Math.max(0, Math.min(100, rawScore));
  }, [activationRate, engagementRate, valueRate, returnRate]);

  const pmfLabel = useMemo(() => {
    if (pmfScore < 20) return "No PMF";
    if (pmfScore < 50) return "Weak";
    if (pmfScore < 75) return "Improving";
    return "Strong";
  }, [pmfScore]);

  const summary = useMemo(
    () =>
      summarizeFounderLoop(founderLoopEvents, {
        weakestFunnelStep: (weakestStep?.key as "links" | "generated" | "played" | "downloaded") ?? null,
        failureRate,
        valueRate,
        returnRate,
      }),
    [founderLoopEvents, weakestStep, failureRate, valueRate, returnRate],
  );
  const lastActivity = useMemo(() => {
    if (founderLoopEvents.length === 0) return null;
    const latest = founderLoopEvents.reduce((acc, cur) => {
      const accTime = Date.parse(acc.timestamp);
      const curTime = Date.parse(cur.timestamp);
      return curTime > accTime ? cur : acc;
    });
    return latest.timestamp;
  }, [founderLoopEvents]);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Founder only</p>
          <h1 className="text-2xl font-bold text-foreground tracking-tight mt-2">AI CEO founder loop</h1>
          <p className="text-sm text-muted-foreground mt-2">Project: {projectId}</p>
          <p className="text-sm text-muted-foreground mt-1">
            Last activity: {lastActivity ? new Date(lastActivity).toLocaleString() : "No activity yet"}
          </p>
        </div>
        <button
          type="button"
          className="rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          onClick={() => navigate("/internal/dev-check")}
        >
          Open Dev Check
        </button>
        <button
          type="button"
          className="rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          onClick={() => {
            localStorage.removeItem("alize_founder_session");
            navigate("/");
          }}
        >
          Logout
        </button>
      </header>

        <section className="rounded-xl border border-border/60 bg-card p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            <div className="rounded-md border border-border/60 px-3 py-2">Sessions: {sessionsStarted}</div>
            <div className="rounded-md border border-border/60 px-3 py-2">Links submitted: {linksSubmitted}</div>
            <div className="rounded-md border border-border/60 px-3 py-2">Clips generated: {clipsGenerated}</div>
            <div className="rounded-md border border-border/60 px-3 py-2">Clips played: {clipsPlayed}</div>
            <div className="rounded-md border border-border/60 px-3 py-2">Clips downloaded: {clipsDownloaded}</div>
            <div className="rounded-md border border-border/60 px-3 py-2">Generation failures: {generationFailed}</div>
          </div>
        </section>

        <section className="rounded-xl border border-border/60 bg-card p-4">
          <h2 className="text-sm font-semibold">Validation Status</h2>
          <p className="text-sm text-muted-foreground mt-2">Status: {validationStatus}</p>
          <p className="text-sm text-muted-foreground mt-1">Interest Rate: {pct(interestRate)}</p>
        </section>

        <section className="rounded-xl border border-border/60 bg-card p-4">
          <h2 className="text-sm font-semibold">PMF Metrics</h2>
          <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-muted-foreground">
            <p>Activation Rate: {pct(activationRate)}</p>
            <p>Engagement Rate: {pct(engagementRate)}</p>
            <p>Value Rate: {pct(valueRate)}</p>
            <p>Return Rate: {pct(returnRate)}</p>
          </div>
          <p className="text-sm text-muted-foreground mt-2">PMF Status: {pmfStatus}</p>
        </section>

        <section className="rounded-xl border border-border/60 bg-card p-4">
          <h2 className="text-sm font-semibold">Funnel</h2>
          <div className="mt-2 space-y-2 text-sm">
            {funnelSteps.map((step, idx) => {
              const isWeakest = weakestStep?.key === step.key;
              const conversionText =
                idx === 0 ? "100%" : `${pct(step.conversion)} from ${funnelSteps[idx - 1].label}`;
              return (
                <div
                  key={step.key}
                  className={`rounded-md border px-3 py-2 ${
                    isWeakest ? "border-destructive/60 bg-destructive/5" : "border-border/60"
                  }`}
                >
                  <p className="font-medium">{step.label}: {step.count}</p>
                  <p className="text-muted-foreground">{conversionText}</p>
                </div>
              );
            })}
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Weakest step: {weakestStep ? weakestStep.label : "Insufficient data"}
          </p>
        </section>

        <section className="rounded-xl border border-border/60 bg-card p-4">
          <h2 className="text-sm font-semibold">PMF Score</h2>
          <p className="text-sm text-muted-foreground mt-2">Score: {Math.round(pmfScore)}/100</p>
          <p className="text-sm text-muted-foreground mt-1">Label: {pmfLabel}</p>
        </section>

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

        <section className="rounded-xl border border-border/60 bg-card p-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Founder debug
          </h2>
          <div className="mt-2 grid grid-cols-1 gap-1 text-xs text-muted-foreground sm:grid-cols-2">
            <p>sessionsStarted: {sessionsStarted}</p>
            <p>linksSubmitted: {linksSubmitted}</p>
            <p>clipsGenerated: {clipsGenerated}</p>
            <p>clipsPlayed: {clipsPlayed}</p>
            <p>clipsDownloaded: {clipsDownloaded}</p>
            <p>generationFailed: {generationFailed}</p>
            <p>returningSessions: {returningSessions}</p>
            <p>computedReturningSessions: {computedReturningSessions}</p>
            <p>interestRate: {interestRate}</p>
            <p>activationRate: {activationRate}</p>
            <p>engagementRate: {engagementRate}</p>
            <p>valueRate: {valueRate}</p>
            <p>returnRate: {returnRate}</p>
            <p>failureRate: {failureRate}</p>
            <p>weakestFunnelStep: {weakestStep?.key ?? "none"}</p>
            <p>pmfScore: {pmfScore}</p>
            <p>validationStatus: {validationStatus}</p>
            <p>pmfStatus: {pmfStatus}</p>
          </div>
        </section>
    </div>
  );
}
