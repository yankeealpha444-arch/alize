import { useMemo, useState } from "react";

type GuideResult = {
  goal: string;
  problem: string;
  plan: [string, string, string];
  action: string;
  successCheck: string;
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
  const mentionsSignup = words.includes("signup") || words.includes("signups") || words.includes("conversion");
  const mentionsRevenue =
    words.includes("paying") || words.includes("paid") || words.includes("revenue") || words.includes("price");

  const goal = hasMetrics
    ? "Increase conversion to paying users from current funnel."
    : "Define one measurable growth target for the next 7 days.";

  let problem = "Main blocker is unclear funnel priority between acquisition, activation, and conversion.";
  if (mentionsTraffic && !mentionsSignup) problem = "Main blocker is weak activation after visits land on the product.";
  if (mentionsSignup && !mentionsRevenue) problem = "Main blocker is signup-to-paid conversion and unclear upgrade trigger.";
  if (mentionsRevenue) problem = "Main blocker is paid conversion friction after initial interest.";

  return {
    goal,
    problem,
    plan: [
      "Measure each funnel step (visit -> signup -> paid) for the last 7 days.",
      "Identify the largest percentage drop and review that step's UX and offer clarity.",
      "Run one focused change on that step and compare next 7-day conversion.",
    ],
    action: "Add one clear paid CTA and value proof directly on the first post-signup screen.",
    successCheck: "Signup-to-paid conversion rate increases within 7 days versus the previous 7-day baseline.",
  };
}

export default function AiCeoGuide() {
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GuideResult | null>(null);
  const [error, setError] = useState("");

  const canAnalyze = useMemo(() => inputText.trim().length > 0 && !loading, [inputText, loading]);

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
      // TODO(ai): Replace local fallback with real AI call.
      // Keep output hard-locked to GOAL / PROBLEM / PLAN / ACTION / SUCCESS CHECK.
      const fallback = buildLocalFallback(trimmed);
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
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">GOAL</p>
            <p className="mt-1 text-sm">{result.goal}</p>

            <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">PROBLEM</p>
            <p className="mt-1 text-sm">{result.problem}</p>

            <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">PLAN</p>
            <p className="mt-1 text-sm">1. {result.plan[0]}</p>
            <p className="mt-1 text-sm">2. {result.plan[1]}</p>
            <p className="mt-1 text-sm">3. {result.plan[2]}</p>

            <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">ACTION</p>
            <p className="mt-1 text-sm">{result.action}</p>

            <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">SUCCESS CHECK</p>
            <p className="mt-1 text-sm">{result.successCheck}</p>
          </section>
        ) : null}
      </main>
    </div>
  );
}
