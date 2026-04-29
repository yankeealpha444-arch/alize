import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type GuideResult = {
  stage: "Validation" | "Product Market Fit" | "Growth";
  metric: string;
  bottleneck: string;
  action: string;
  whyThisMovesMetric: string;
  successCondition: string;
};

function toWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function buildLocalFallback(input: string): GuideResult {
  const words = toWords(input);
  const hasMetrics = /\d/.test(input);
  const mentionsTraffic = words.includes("visit") || words.includes("visits") || words.includes("traffic");
  const mentionsSignup =
    words.includes("signup") || words.includes("signups") || words.includes("conversion") || words.includes("activation");
  const mentionsRevenue =
    words.includes("paying") || words.includes("paid") || words.includes("revenue") || words.includes("price");
  const mentionsUpload =
    words.includes("upload") ||
    words.includes("uploads") ||
    words.includes("clipper") ||
    words.includes("clips") ||
    words.includes("freeze") ||
    words.includes("stuck");

  if (mentionsUpload) {
    return {
      stage: "Product Market Fit",
      metric: "activation_rate = clips_generated / uploads_started",
      bottleneck: "Users fail to complete upload or abandon during processing",
      action: "Fix upload reliability and ensure progress never freezes or feels broken",
      whyThisMovesMetric:
        "Users must complete the core action before experiencing value; removing friction increases completion rate",
      successCondition:
        "activation_rate increases because more uploads successfully produce 3 clips without drop-off",
    };
  }

  if (!hasMetrics || (!mentionsTraffic && !mentionsSignup && !mentionsRevenue)) {
    return {
      stage: "Validation",
      metric: "problem_interview_pass_rate = positive_problem_confirmations / interviews_run",
      bottleneck: "Problem clarity is weak, so demand confidence is low",
      action: "Run 10 customer interviews using one problem statement and capture yes/no urgency",
      whyThisMovesMetric: "Validation improves when a single problem statement is tested repeatedly against real users",
      successCondition: "problem_interview_pass_rate reaches at least 0.6 over the next 10 interviews",
    };
  }

  if (mentionsRevenue) {
    return {
      stage: "Growth",
      metric: "weekly_paid_conversion = paying_users / active_trials",
      bottleneck: "Upgrade intent exists but conversion to paid is leaking at decision moment",
      action: "Add one in-product upgrade prompt tied to the most-used value moment",
      whyThisMovesMetric: "Prompting at peak value timing increases paid conversion without adding new acquisition spend",
      successCondition: "weekly_paid_conversion improves versus the prior 7-day baseline",
    };
  }

  return {
    stage: "Product Market Fit",
    metric: "activation_rate = activated_users / signups",
    bottleneck: "Users sign up but do not reach first value quickly enough",
    action: "Reduce time-to-first-value by removing one blocking step before core outcome",
    whyThisMovesMetric: "Faster first value increases activation and enables progression toward repeat usage",
    successCondition: "activation_rate increases week-over-week with stable signup volume",
  };
}

export default function AiCeoGuide() {
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GuideResult | null>(null);
  const [error, setError] = useState("");

  const canAnalyze = useMemo(() => inputText.trim().length > 0 && !loading, [inputText, loading]);

  const resolveProjectId = async (): Promise<number> => {
    const stored = localStorage.getItem("alize_projectId") || "default";
    const numericStored = Number(String(stored).trim());
    const sb = supabase as unknown as {
      from: (table: string) => {
        select: (cols: string) => {
          eq: (col: string, val: string) => {
            limit: (n: number) => Promise<{ data: Array<Record<string, unknown>> | null; error: { message?: string } | null }>;
          };
          order: (col: string, opts: { ascending: boolean }) => {
            limit: (n: number) => Promise<{ data: Array<Record<string, unknown>> | null; error: { message?: string } | null }>;
          };
        };
      };
    };
    if (Number.isFinite(numericStored) && numericStored > 0) return numericStored;

    const specRes = await sb.from("project_specs").select("project_id").order("created_at", { ascending: false }).limit(1);
    const specProjectId = Number(specRes.data?.[0]?.project_id);
    if (Number.isFinite(specProjectId) && specProjectId > 0) return specProjectId;

    const outputRes = await sb.from("project_outputs").select("project_id").order("created_at", { ascending: false }).limit(1);
    const outputProjectId = Number(outputRes.data?.[0]?.project_id);
    if (Number.isFinite(outputProjectId) && outputProjectId > 0) return outputProjectId;

    throw new Error("Could not resolve project context for AI CEO.");
  };

  const onAnalyze = async () => {
    const trimmed = inputText.trim();
    if (!trimmed) {
      setError("MISSING\nWhat product, idea, or metrics should be analyzed?");
      setResult(null);
      return;
    }

    setError("");
    setLoading(true);

    try {
      const projectId = await resolveProjectId();
      const sb = supabase as unknown as {
        from: (table: string) => {
          select: (cols: string) => {
            eq: (col: string, val: string) => {
              order: (col: string, opts: { ascending: boolean }) => {
                limit: (n: number) => Promise<{ data: Array<Record<string, unknown>> | null; error: { message?: string } | null }>;
              };
            };
          };
          insert: (row: Record<string, unknown>) => Promise<{ error: { message?: string } | null }>;
        };
      };

      const latestSpecRes = await sb
        .from("project_specs")
        .select("version")
        .eq("project_id", String(projectId))
        .order("version", { ascending: false })
        .limit(1);
      const latestSpecVersion = Number(latestSpecRes.data?.[0]?.version ?? 0) || 0;
      const nextSpecVersion = latestSpecVersion + 1;
      const structuredSpec = {
        source: "ai_ceo_guide",
        input_text: trimmed,
      };
      const specInsert = await sb.from("project_specs").insert({
        project_id: projectId,
        spec: trimmed,
        structured_spec: structuredSpec,
        version: nextSpecVersion,
        status: "active",
      });
      if (specInsert.error) {
        throw new Error(specInsert.error.message || "Could not save project spec");
      }

      // TODO(ai): Replace local Growth Ruler generation with real AI call.
      // Keep output hard-locked to STAGE / METRIC / BOTTLENECK / ACTION / WHY / SUCCESS CONDITION.
      const fallback = buildLocalFallback(trimmed);

      const latestOutputRes = await sb
        .from("project_outputs")
        .select("version_number")
        .eq("project_id", String(projectId))
        .order("version_number", { ascending: false })
        .limit(1);
      const latestOutputVersion = Number(latestOutputRes.data?.[0]?.version_number ?? 0) || 0;
      const nextOutputVersion = latestOutputVersion + 1;
      const outputInsert = await sb.from("project_outputs").insert({
        project_id: projectId,
        output_type: "ai_ceo_decision",
        content: JSON.stringify(fallback),
        version_number: nextOutputVersion,
        status: "active",
      });
      if (outputInsert.error) {
        throw new Error(outputInsert.error.message || "Could not save AI CEO output");
      }

      setResult(fallback);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Analysis failed.";
      setError(msg);
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">AI CEO</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">AI CEO</h1>
          <p className="mt-2 text-muted-foreground">
            Paste your product, idea, or metrics. Get the next action.
          </p>
        </div>

        <section className="mt-6 max-w-2xl rounded-2xl border border-border/60 bg-card p-5 sm:p-6">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Example: I have 500 visits, 30 signups, 3 paying users. What should I fix first?"
            className="min-h-32 w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm text-foreground"
          />
          <button
            type="button"
            onClick={() => void onAnalyze()}
            disabled={!canAnalyze}
            className="mt-3 inline-flex w-full items-center justify-center rounded-md bg-black px-4 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-neutral-500 disabled:text-neutral-100"
          >
            {loading ? "Analyzing..." : "Analyze"}
          </button>
          {error ? <p className="mt-3 whitespace-pre-line text-sm text-foreground">{error}</p> : null}
        </section>

        {result ? (
          <section className="mt-6 max-w-2xl rounded-2xl border border-border/60 bg-card p-5 sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">STAGE</p>
            <p className="mt-1 text-sm">{result.stage}</p>

            <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">METRIC</p>
            <p className="mt-1 text-sm">{result.metric}</p>

            <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">BOTTLENECK</p>
            <p className="mt-1 text-sm">{result.bottleneck}</p>

            <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">ACTION (one only)</p>
            <p className="mt-1 text-sm">{result.action}</p>

            <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">WHY THIS MOVES THE METRIC</p>
            <p className="mt-1 text-sm">{result.whyThisMovesMetric}</p>

            <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">SUCCESS CONDITION</p>
            <p className="mt-1 text-sm">{result.successCondition}</p>
          </section>
        ) : null}
      </main>
    </div>
  );
}
