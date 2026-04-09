import { FlaskConical, TrendingUp, Check, X, Minus, Play, Zap, Eye } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useProjectId } from "@/hooks/useProject";
import { updateMvpCustomizations } from "@/lib/projectData";

interface Test {
  name: string;
  status: "Running" | "Completed" | "Pending";
  result: string;
  outcome: "positive" | "negative" | "inconclusive" | "none";
  impact?: string;
  pmfChange?: number;
  actionTaken?: string;
  problem?: string;
  expectedImpact?: string;
  changeField?: string;
  changeValue?: string;
}

const allTests: Test[] = [
  // Completed
  { name: "Pricing Test ($9 vs $19)", status: "Completed", result: "76% preferred $9", outcome: "positive", impact: "+12% conversion", pmfChange: 5, actionTaken: "Pricing updated to $9", problem: "Users hesitate at checkout", expectedImpact: "+12% conversion", changeField: "pricingCopy", changeValue: "Start free — upgrade to Pro for $9/mo" },
  { name: "Short Onboarding Test", status: "Completed", result: "1-step had 22% higher activation", outcome: "positive", impact: "+22% activation", pmfChange: 4, actionTaken: "Applied 1-step flow", problem: "Users drop off during onboarding", expectedImpact: "+22% activation" },
  { name: "CTA Button Text Test", status: "Completed", result: "No significant difference", outcome: "inconclusive", impact: "No change", pmfChange: 0, problem: "CTA might not be compelling", expectedImpact: "+5–10% signup" },
  // Running
  { name: "Headline A/B Test", status: "Running", result: "Variant B leading +6%", outcome: "none", problem: "Headline may not resonate", expectedImpact: "+5–15% engagement", changeField: "headline", changeValue: "" },
  // Recommended (Pending)
  { name: "Simplify onboarding to 2 steps", status: "Pending", result: "—", outcome: "none", problem: "Users find onboarding confusing — 38% drop off at step 3", expectedImpact: "+15–30% activation" },
  { name: "Test social proof on hero", status: "Pending", result: "—", outcome: "none", problem: "Low trust — users leave before scrolling", expectedImpact: "+10–20% trust", changeField: "showTestimonials", changeValue: "true" },
  { name: "Remove signup friction", status: "Pending", result: "—", outcome: "none", problem: "62% of users drop off after sign-up form", expectedImpact: "+20–40% signup" },
  { name: "Add guided tutorial", status: "Pending", result: "—", outcome: "none", problem: "Users don't know where to start after signup", expectedImpact: "+10–25% activation" },
  { name: "A/B test CTA button text", status: "Pending", result: "—", outcome: "none", problem: "CTA might not match user intent", expectedImpact: "+5–10% signup", changeField: "ctaText", changeValue: "Try it now — free" },
];

const pmfScore = 39;
const pmfChange = 4;

const outcomeIcon = {
  positive: <Check className="w-3.5 h-3.5 text-[hsl(var(--success))]" />,
  negative: <X className="w-3.5 h-3.5 text-[hsl(var(--destructive))]" />,
  inconclusive: <Minus className="w-3.5 h-3.5 text-muted-foreground" />,
  none: null,
};

const Tests = () => {
  const projectId = useProjectId();
  const navigate = useNavigate();
  const [tests, setTests] = useState<Test[]>(allTests);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggleSelect = (name: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  };

  const runTest = (name: string) => {
    setTests(prev => prev.map(t => t.name === name ? { ...t, status: "Running" as const, result: "Starting…" } : t));
    // Apply change if test has one, then navigate to preview
    const test = tests.find(t => t.name === name);
    if (test?.changeField) {
      if (test.changeField === "showTestimonials") {
        updateMvpCustomizations({ showTestimonials: test.changeValue === "true" }, projectId);
      } else if (test.changeValue) {
        updateMvpCustomizations({ [test.changeField]: test.changeValue } as any, projectId);
      }
      window.dispatchEvent(new Event("alize-mvp-updated"));
    }
    toast.success(`Test "${name}" started`);
    navigate(`/preview/${projectId}`);
  };

  const runSelected = () => {
    if (selected.size === 0) { toast.info("Select tests first"); return; }
    setTests(prev => prev.map(t => selected.has(t.name) && t.status === "Pending" ? { ...t, status: "Running" as const, result: "Starting…" } : t));
    toast.success(`${selected.size} tests started`);
    setSelected(new Set());
    navigate(`/preview/${projectId}`);
  };

  const runAllRecommended = () => {
    const pending = tests.filter(t => t.status === "Pending");
    if (pending.length === 0) { toast.info("No pending tests"); return; }
    setTests(prev => prev.map(t => t.status === "Pending" ? { ...t, status: "Running" as const, result: "Starting…" } : t));
    toast.success(`${pending.length} tests started`);
    navigate(`/preview/${projectId}`);
  };

  const applyWinner = (name: string) => {
    const test = tests.find(t => t.name === name);
    if (test?.changeField) {
      if (test.changeField === "showTestimonials") {
        updateMvpCustomizations({ showTestimonials: test.changeValue === "true" }, projectId);
      } else if (test.changeValue) {
        updateMvpCustomizations({ [test.changeField]: test.changeValue } as any, projectId);
      }
      window.dispatchEvent(new Event("alize-mvp-updated"));
    }
    setTests(prev => prev.map(t => t.name === name ? { ...t, actionTaken: "Change applied" } : t));
    toast.success(`Applied winning change from "${name}"`);
  };

  const applyAllWinners = () => {
    const winners = tests.filter(t => t.outcome === "positive" && !t.actionTaken);
    if (winners.length === 0) { toast.info("No unapplied winners"); return; }
    setTests(prev => prev.map(t => t.outcome === "positive" && !t.actionTaken ? { ...t, actionTaken: "Change applied" } : t));
    toast.success(`Applied ${winners.length} winning changes`);
  };

  const running = tests.filter(t => t.status === "Running");
  const completed = tests.filter(t => t.status === "Completed");
  const pending = tests.filter(t => t.status === "Pending");
  const unappliedWinners = completed.filter(t => t.outcome === "positive" && !t.actionTaken);

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
            <FlaskConical className="w-5 h-5 text-foreground" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Tests & Results</h2>
            <p className="text-sm text-muted-foreground">Run experiments → apply winners → increase PMF</p>
          </div>
        </div>
      </div>

      {/* PMF Progress — compact */}
      <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-4">
        <TrendingUp className="w-5 h-5 text-foreground shrink-0" />
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl font-bold text-foreground">{pmfScore}</span>
            <span className="text-xs text-muted-foreground">/ 100 PMF</span>
            <span className="text-xs font-semibold text-[hsl(var(--success))]">↑ {pmfChange} this week</span>
          </div>
          <div className="w-full h-2 rounded-full bg-secondary overflow-hidden">
            <div className="h-full rounded-full bg-foreground transition-all" style={{ width: `${pmfScore}%` }} />
          </div>
        </div>
      </div>

      {/* Bulk actions */}
      <div className="flex flex-wrap gap-2">
        <button onClick={runAllRecommended} className="flex items-center gap-2 text-xs font-semibold bg-foreground text-background px-4 py-2.5 rounded-lg hover:opacity-90 transition-opacity">
          <Play className="w-3.5 h-3.5" /> Run All Recommended Tests
        </button>
        {selected.size > 0 && (
          <button onClick={runSelected} className="flex items-center gap-2 text-xs font-semibold bg-secondary text-foreground px-4 py-2.5 rounded-lg hover:bg-secondary/70 transition-colors">
            <Play className="w-3.5 h-3.5" /> Run Selected ({selected.size})
          </button>
        )}
        {unappliedWinners.length > 0 && (
          <button onClick={applyAllWinners} className="flex items-center gap-2 text-xs font-semibold bg-secondary text-foreground px-4 py-2.5 rounded-lg hover:bg-secondary/70 transition-colors">
            <Zap className="w-3.5 h-3.5" /> Apply All Winners ({unappliedWinners.length})
          </button>
        )}
      </div>

      {/* All tests — unified list */}
      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-secondary/50">
              <th className="w-8 px-3 py-2"><input type="checkbox" className="accent-foreground" onChange={(e) => { if (e.target.checked) setSelected(new Set(pending.map(t => t.name))); else setSelected(new Set()); }} /></th>
              <th className="text-[10px] font-bold text-muted-foreground uppercase px-3 py-2">Test</th>
              <th className="text-[10px] font-bold text-muted-foreground uppercase px-3 py-2">Problem it solves</th>
              <th className="text-[10px] font-bold text-muted-foreground uppercase px-3 py-2">Expected</th>
              <th className="text-[10px] font-bold text-muted-foreground uppercase px-3 py-2">Status</th>
              <th className="text-[10px] font-bold text-muted-foreground uppercase px-3 py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {/* Running first */}
            {running.map(test => (
              <tr key={test.name} className="border-t border-border bg-[hsl(var(--warning))]/5">
                <td className="px-3 py-3" />
                <td className="px-3 py-3">
                  <p className="text-sm font-medium text-foreground">{test.name}</p>
                  {test.result !== "—" && <p className="text-[10px] text-muted-foreground mt-0.5">{test.result}</p>}
                </td>
                <td className="px-3 py-3 text-xs text-muted-foreground">{test.problem || "—"}</td>
                <td className="px-3 py-3 text-xs text-[hsl(var(--success))]">{test.expectedImpact || "—"}</td>
                <td className="px-3 py-3">
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))]">Running</span>
                </td>
                <td className="px-3 py-3">
                  <button onClick={() => navigate(`/preview/${projectId}`)} className="text-xs text-foreground hover:underline flex items-center gap-1">
                    <Eye className="w-3 h-3" /> View
                  </button>
                </td>
              </tr>
            ))}
            {/* Pending */}
            {pending.map(test => (
              <tr key={test.name} className="border-t border-border">
                <td className="px-3 py-3">
                  <input type="checkbox" checked={selected.has(test.name)} onChange={() => toggleSelect(test.name)} className="accent-foreground" />
                </td>
                <td className="px-3 py-3">
                  <p className="text-sm font-medium text-foreground">{test.name}</p>
                </td>
                <td className="px-3 py-3 text-xs text-muted-foreground">{test.problem || "—"}</td>
                <td className="px-3 py-3 text-xs text-[hsl(var(--success))]">{test.expectedImpact || "—"}</td>
                <td className="px-3 py-3">
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-secondary text-muted-foreground">Recommended</span>
                </td>
                <td className="px-3 py-3">
                  <button onClick={() => runTest(test.name)} className="text-xs font-semibold bg-foreground text-background px-3 py-1.5 rounded-md hover:opacity-90 transition-opacity">
                    Run test
                  </button>
                </td>
              </tr>
            ))}
            {/* Completed */}
            {completed.map(test => (
              <tr key={test.name} className="border-t border-border">
                <td className="px-3 py-3" />
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2">
                    {outcomeIcon[test.outcome]}
                    <p className="text-sm font-medium text-foreground">{test.name}</p>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{test.result}</p>
                </td>
                <td className="px-3 py-3 text-xs text-muted-foreground">{test.problem || "—"}</td>
                <td className="px-3 py-3 text-xs font-medium text-foreground">{test.impact || "—"}</td>
                <td className="px-3 py-3">
                  {test.pmfChange != null && test.pmfChange > 0 ? (
                    <span className="text-xs font-bold text-[hsl(var(--success))]">+{test.pmfChange} PMF</span>
                  ) : (
                    <span className="text-xs text-muted-foreground">No change</span>
                  )}
                </td>
                <td className="px-3 py-3">
                  {test.outcome === "positive" && !test.actionTaken ? (
                    <button onClick={() => applyWinner(test.name)} className="text-xs font-semibold bg-secondary text-foreground px-3 py-1.5 rounded-md hover:bg-secondary/70 transition-colors">
                      Apply
                    </button>
                  ) : test.actionTaken ? (
                    <span className="text-xs text-[hsl(var(--success))]">✓ Applied</span>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Tests;
