import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { trackEvent } from "@/lib/trackingEvents";
import { getLatestPatternInsight, type PatternInsight } from "@/lib/mvp/videoClipperBackend";

function readOutcome(projectId: string): string {
  return localStorage.getItem(`alize_last_outcome_${projectId}`) || "not_posted";
}

function readClipScoreLabel(projectId: string): "High" | "Medium" | "Low" {
  const raw = Number(localStorage.getItem(`alize_selected_clip_score_${projectId}`) || 0);
  if (raw >= 80) return "High";
  if (raw >= 60) return "Medium";
  return "Low";
}

function buildGuidance(score: "High" | "Medium" | "Low", outcome: string) {
  if (outcome === "not_posted") return { summary: "This clip has not been posted yet.", next: "Post it first and capture the first 24h signal.", scale: "Test again", tip: "Post at your audience's peak hour tomorrow." };
  if (score === "High" && outcome === "strong_views") return { summary: "This clip is a strong performer.", next: "Post more clips with the same opening pattern.", scale: "Scale", tip: "Queue one similar clip for tomorrow." };
  if (score === "High" && outcome === "flopped") return { summary: "Strong clip quality but weak result.", next: "Try a stronger hook in the first 2 seconds.", scale: "Test again", tip: "Rewrite the first line before reposting." };
  if (score === "Medium" && outcome === "some_views") return { summary: "You have a workable clip.", next: "Test another variation of this angle.", scale: "Test again", tip: "Test a shorter cut tomorrow." };
  if (score === "Low" && outcome === "flopped") return { summary: "This clip did not land.", next: "Switch to a different clip from this video.", scale: "Swap", tip: "Pick a different moment with faster pacing." };
  return { summary: "You have enough signal to iterate.", next: "Try another clip and compare outcomes.", scale: "Test again", tip: "Keep one variable constant tomorrow." };
}

export default function Guidance() {
  const navigate = useNavigate();
  const { projectId = "default" } = useParams<{ projectId: string }>();
  const [patternInsight, setPatternInsight] = useState<PatternInsight | null>(null);

  useEffect(() => {
    void trackEvent("guidance_viewed", projectId, "guidance_page");
  }, [projectId]);

  useEffect(() => {
    let active = true;
    const run = async () => {
      try {
        const insight = await getLatestPatternInsight(projectId);
        if (!active) return;
        setPatternInsight(insight);
        if (insight) {
          void trackEvent("pattern_applied", projectId, insight.patternType, { surface: "guidance" });
        }
      } catch {
        if (active) setPatternInsight(null);
      }
    };
    void run();
    return () => {
      active = false;
    };
  }, [projectId]);

  const outcome = readOutcome(projectId);
  const scoreLabel = readClipScoreLabel(projectId);
  const g = useMemo(() => {
    const base = buildGuidance(scoreLabel, outcome);
    if (!patternInsight) return base;
    const scale =
      patternInsight.suggestedSignal === "scale"
        ? "Scale"
        : patternInsight.suggestedSignal === "swap"
          ? "Swap"
          : "Test again";
    return {
      summary: `${base.summary} ${patternInsight.message}`,
      next: base.next,
      scale,
      tip: base.tip,
    };
  }, [scoreLabel, outcome, patternInsight]);

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-6">
      <h1 className="text-2xl font-semibold text-foreground">Next step guidance</h1>
      {patternInsight ? (
        <p className="text-xs text-muted-foreground">
          {patternInsight.suggestedSignal === "scale"
            ? "This pattern has worked for you before."
            : "You're improving — your recent clips are performing better."}
        </p>
      ) : null}

      <section className="rounded-xl border border-border bg-card p-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Summary</p>
        <p className="text-sm text-foreground">{g.summary}</p>
      </section>

      <section className="rounded-xl border border-border bg-card p-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">What to do next</p>
        <p className="text-sm text-foreground">{g.next}</p>
      </section>

      <section className="rounded-xl border border-border bg-card p-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Scale decision</p>
        <p className="text-sm text-foreground">{g.scale}</p>
        <p className="text-xs text-muted-foreground mt-2">Tomorrow tip: {g.tip}</p>
      </section>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => {
            void trackEvent("test_another_clip", projectId, "guidance");
            navigate(`/p/${projectId}`);
          }}
          className="rounded-full bg-foreground text-background px-5 py-2.5 text-sm font-semibold hover:opacity-90"
        >
          Try next clip from this video
        </button>
        <button
          type="button"
          onClick={() => {
            void trackEvent("try_another_video", projectId, "guidance");
            localStorage.removeItem(`alize_video_job_id_${projectId}`);
            localStorage.removeItem(`alize_selected_clip_id_${projectId}`);
            localStorage.removeItem(`alize_selected_clip_score_${projectId}`);
            localStorage.removeItem(`alize_selected_clip_label_${projectId}`);
            navigate("/");
          }}
          className="rounded-full border border-border px-5 py-2.5 text-sm font-medium hover:bg-secondary"
        >
          Try another video
        </button>
      </div>
    </div>
  );
}
