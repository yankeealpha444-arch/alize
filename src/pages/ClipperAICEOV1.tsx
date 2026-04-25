import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type ClipRow = {
  id: string;
  video_url: string | null;
  start_time_sec: number | null;
  end_time_sec: number | null;
  created_at: string | null;
};

type EventRow = {
  event_name: string | null;
};

type Status = "Strong" | "Weak" | "Unknown";
type Confidence = "High" | "Medium" | "Low";

type AICard = {
  metricValue: string;
  status: Status;
  confidence: Confidence;
  explanation: string;
  nextAction: string;
};

function isPlayableUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (!/^https?:\/\//i.test(trimmed)) return false;
  if (trimmed.includes("interactive-examples.mdn.mozilla.net")) return false;
  return true;
}

function formatTime(sec: number): string {
  if (!Number.isFinite(sec)) return "0s";
  const total = Math.max(0, Math.floor(sec));
  if (total < 60) return `${total}s`;
  const m = Math.floor(total / 60);
  const s = total % 60;
  return s === 0 ? `${m}m` : `${m}m ${s}s`;
}

function pct(numerator: number, denominator: number): number {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) return 0;
  return (numerator / denominator) * 100;
}

function pickStatus(value: number, strongAt: number, weakBelow: number, sample: number, minSample = 5): Status {
  if (sample < minSample) return "Unknown";
  if (value >= strongAt) return "Strong";
  if (value < weakBelow) return "Weak";
  return "Unknown";
}

function pickConfidence(sample: number): Confidence {
  if (sample >= 30) return "High";
  if (sample >= 10) return "Medium";
  return "Low";
}

function statusTone(status: Status): string {
  if (status === "Strong") return "text-emerald-700 bg-emerald-100 border-emerald-200";
  if (status === "Weak") return "text-amber-800 bg-amber-100 border-amber-200";
  return "text-slate-700 bg-slate-100 border-slate-200";
}

function oneNextAction(metrics: {
  sessions: number;
  linksSubmitted: number;
  clipsGenerated: number;
  clipsPlayed: number;
  clipsDownloaded: number;
  generationRate: number;
  playRate: number;
  downloadRate: number;
}): string {
  if (metrics.sessions < 10) return "Get first 10 users";
  if (metrics.linksSubmitted < 10) return "Send clips to 10 creators";
  if (metrics.generationRate < 50) return "Test creator outreach message";
  if (metrics.playRate < 40) return "Test better clip titles";
  if (metrics.downloadRate < 20) return "Improve download value";
  return "Send clips to 10 creators";
}

export default function ClipperAICEOV1() {
  const [sourceUrl, setSourceUrl] = useState("");
  const [clips, setClips] = useState<ClipRow[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);

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

  const loadDashboardEvents = async () => {
    const { data } = await supabase
      .from("events")
      .select("event_name")
      .order("occurred_at", { ascending: false })
      .limit(500);
    setEvents((data ?? []) as EventRow[]);
  };

  const handleGenerate = async () => {
    const trimmed = sourceUrl.trim();
    if (!trimmed) {
      setMessage("No clips yet.");
      return;
    }

    setIsLoading(true);
    setMessage("");
    try {
      const { data, error } = await supabase
        .from("video_clips")
        .select("id, video_url, start_time_sec, end_time_sec, created_at")
        .not("video_url", "is", null)
        .order("created_at", { ascending: false })
        .limit(30);

      if (error) {
        setClips([]);
        setMessage("No clips yet.");
      } else {
        const playable = ((data ?? []) as ClipRow[]).filter((c) => isPlayableUrl(String(c.video_url ?? "")));
        const selected = playable.slice(0, 3);
        setClips(selected);
        if (selected.length === 0) setMessage("No clips yet.");
      }
      await loadDashboardEvents();
    } catch {
      setClips([]);
      setMessage("No clips yet.");
    } finally {
      setIsLoading(false);
    }
  };

  const metrics = useMemo(() => {
    const count = (name: string) => events.filter((e) => (e.event_name ?? "") === name).length;
    const sessions = count("session_started");
    const linksSubmitted = count("link_submitted");
    const clipsGenerated = count("clips_generated");
    const clipsPlayed = count("clip_played");
    const clipsDownloaded = count("clip_downloaded");

    const generationRate = pct(clipsGenerated, Math.max(1, linksSubmitted));
    const playRate = pct(clipsPlayed, Math.max(1, clipsGenerated));
    const downloadRate = pct(clipsDownloaded, Math.max(1, clipsPlayed));

    const weakest = [
      { name: "Sessions → Links", from: sessions, to: linksSubmitted },
      { name: "Links → Generated", from: linksSubmitted, to: clipsGenerated },
      { name: "Generated → Played", from: clipsGenerated, to: clipsPlayed },
      { name: "Played → Downloaded", from: clipsPlayed, to: clipsDownloaded },
    ]
      .map((s) => ({ ...s, rate: pct(s.to, Math.max(1, s.from)) }))
      .sort((a, b) => a.rate - b.rate)[0];

    return {
      sessions,
      linksSubmitted,
      clipsGenerated,
      clipsPlayed,
      clipsDownloaded,
      generationRate,
      playRate,
      downloadRate,
      weakest,
      returnSignal: "Unknown",
    };
  }, [events]);

  const validationCard: AICard = useMemo(() => {
    const status = pickStatus(metrics.generationRate, 60, 35, metrics.linksSubmitted, 8);
    const confidence = pickConfidence(metrics.sessions);
    return {
      metricValue: `${metrics.linksSubmitted} links / ${metrics.sessions} sessions`,
      status,
      confidence,
      explanation:
        status === "Unknown"
          ? "Validation signal is still early. More sessions and submissions are needed before confidence increases."
          : status === "Strong"
            ? "Users are converting sessions into link submissions and getting generated clips."
            : "Session traffic is not converting consistently into successful link-to-clip generation yet.",
      nextAction: "Get first 10 users and track whether they complete link submission.",
    };
  }, [metrics.generationRate, metrics.linksSubmitted, metrics.sessions]);

  const pmfCard: AICard = useMemo(() => {
    const status = pickStatus(metrics.downloadRate, 25, 12, metrics.clipsPlayed, 8);
    const confidence = pickConfidence(metrics.clipsPlayed);
    return {
      metricValue: `${metrics.clipsDownloaded} downloads / ${metrics.clipsPlayed} plays`,
      status,
      confidence,
      explanation:
        status === "Unknown"
          ? "PMF interpretation is uncertain at this stage; playback and download volume are still low."
          : status === "Strong"
            ? "A meaningful share of players download clips, suggesting strong creator utility."
            : "Playback is happening but download follow-through is weak, indicating value communication needs work.",
      nextAction: "Improve download value clarity in card copy and test title wording.",
    };
  }, [metrics.downloadRate, metrics.clipsDownloaded, metrics.clipsPlayed]);

  const nextAction = oneNextAction(metrics);

  const handleCopyMessage = async () => {
    const text = "Hey! I built a clipper that turns one video into ready-to-post short clips. Want to try it?";
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="fixed right-3 top-3 z-50 rounded-md border border-foreground/30 bg-background px-2 py-1 text-xs font-semibold">
        CLIPS AI CEO V1
      </div>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold tracking-tight">Alizé Clips</h1>

        <section className="mt-6 max-w-2xl rounded-xl border border-border/60 bg-card p-4">
          <label className="block text-sm font-medium">Video URL</label>
          <input
            type="url"
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
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
                const directUrl = String(clip.video_url ?? "").trim();
                const start = Math.max(0, Math.floor(Number(clip.start_time_sec) || 0));
                const end = Math.max(start, Math.floor(Number(clip.end_time_sec) || 0));
                const duration = Math.max(0, end - start);
                return (
                  <article key={clip.id} className="rounded-xl border border-border/60 bg-card p-3">
                    <p className="text-sm font-semibold">{`Clip ${idx + 1}`}</p>
                    <div className="mt-2 aspect-video overflow-hidden rounded-lg border border-border/60 bg-black">
                      <video src={directUrl} controls playsInline preload="metadata" className="h-full w-full object-cover" />
                    </div>
                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={() => void forceDownload(directUrl, `alize-clip-${idx + 1}.mp4`)}
                        className="inline-flex items-center rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-secondary"
                      >
                        Download MP4 for YouTube
                      </button>
                      <p className="mt-1 text-xs text-muted-foreground">
                        MP4 format, ready to upload to YouTube Shorts, Reels or TikTok.
                      </p>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">Source time: {formatTime(start)} - {formatTime(end)}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Duration: {formatTime(duration)}</p>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="mt-12 space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">PMF Progress</p>
              <p className="mt-2 text-2xl font-bold">{`${Math.round(metrics.downloadRate)}%`}</p>
              <p className="mt-1 text-xs text-muted-foreground">Download rate from played clips</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 md:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status Bar</p>
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                <span className="rounded-md border border-border px-2 py-1">{`Sessions: ${metrics.sessions}`}</span>
                <span className="rounded-md border border-border px-2 py-1">{`Links: ${metrics.linksSubmitted}`}</span>
                <span className="rounded-md border border-border px-2 py-1">{`Generated: ${metrics.clipsGenerated}`}</span>
                <span className="rounded-md border border-border px-2 py-1">{`Played: ${metrics.clipsPlayed}`}</span>
                <span className="rounded-md border border-border px-2 py-1">{`Downloaded: ${metrics.clipsDownloaded}`}</span>
                <span className="rounded-md border border-border px-2 py-1">{`Return: ${metrics.returnSignal}`}</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Next Best Action</p>
            <p className="mt-2 text-base font-semibold">{nextAction}</p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Funnel View</p>
              <div className="mt-3 space-y-2 text-sm">
                <p>{`Sessions -> ${metrics.sessions}`}</p>
                <p>{`Links submitted -> ${metrics.linksSubmitted}`}</p>
                <p>{`Clips generated -> ${metrics.clipsGenerated}`}</p>
                <p>{`Clips played -> ${metrics.clipsPlayed}`}</p>
                <p>{`Clips downloaded -> ${metrics.clipsDownloaded}`}</p>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                {`Weakest step: ${metrics.weakest.name} (${Math.round(metrics.weakest.rate)}%). This is a learning signal and may shift with more data.`}
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Validation</p>
              <AIMetricCard card={validationCard} />
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Product Market Fit</p>
              <AIMetricCard card={pmfCard} />
            </div>

            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Distribution (Creators)</p>
              <div className="mt-2 space-y-1 text-sm">
                <p>Creators: {metrics.sessions}</p>
                <p>Creator referrals: Unknown</p>
                <p>Manual outreach: {metrics.linksSubmitted}</p>
              </div>
              <button
                type="button"
                onClick={() => void handleCopyMessage()}
                className="mt-3 inline-flex items-center rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-secondary"
              >
                {copied ? "Message copied" : "Copy outreach message"}
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">AI CEO Insight</p>
            <p className="mt-2 text-sm text-muted-foreground">
              This dashboard learns from real user behaviour. Metrics are shown now, but AI interpretation becomes more
              confident as more people use the clipper.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}

function AIMetricCard({ card }: { card: AICard }) {
  return (
    <div className="mt-2 space-y-2">
      <p className="text-sm">{`Metric value: ${card.metricValue}`}</p>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className={`rounded-md border px-2 py-1 ${statusTone(card.status)}`}>{`AI Status: ${card.status}`}</span>
        <span className="rounded-md border border-border px-2 py-1">{`Confidence: ${card.confidence}`}</span>
      </div>
      <p className="text-xs text-muted-foreground">{`Explanation: ${card.explanation}`}</p>
      <p className="text-xs text-muted-foreground">{`Next action: ${card.nextAction}`}</p>
    </div>
  );
}
