import { useNavigate } from "react-router-dom";
import { ArrowLeft, TrendingDown, ArrowRight } from "lucide-react";
import { useProjectId } from "@/hooks/useProject";
import { getProjectData } from "@/lib/projectData";
import { computeFunnel } from "@/lib/trackingEvents";
import { FunnelStep, getFunnelStepStatus, funnelBenchmarks, funnelInsights } from "@/lib/store";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

const benchmarkTargets: Record<string, { target: string; range: string }> = {
  "Tried Product": { target: "30–40%", range: "Visitors → Try" },
  "Signed Up": { target: "40–60%", range: "Try → Signup" },
  "Used Product": { target: "60–70%", range: "Signup → Use" },
  "Returned": { target: "30–40%", range: "Use → Return" },
  "Paid / Pre-order": { target: "10–20%", range: "Return → Pay" },
};

const DropOffDetail = () => {
  const projectId = useProjectId();
  const navigate = useNavigate();
  const tracked = computeFunnel(projectId);

  const funnel: FunnelStep[] = [
    { label: "Visitors", count: Math.max(tracked.visitors, 1) },
    { label: "Tried Product", count: tracked.usedProduct + tracked.surveyCompleted },
    { label: "Signed Up", count: tracked.emailEntered + tracked.accountCreated },
    { label: "Used Product", count: tracked.usedProduct },
    { label: "Returned", count: tracked.returnUsers },
    { label: "Paid / Pre-order", count: tracked.paid },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </button>

      <div className="flex items-center gap-3">
        <TrendingDown className="w-5 h-5 text-foreground" />
        <h1 className="text-xl font-bold text-foreground">Drop-Off Analysis</h1>
      </div>

      {/* Funnel Table with benchmarks */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Step</TableHead>
              <TableHead className="text-right">Users</TableHead>
              <TableHead className="text-right">Conversion</TableHead>
              <TableHead className="text-right">Drop-off</TableHead>
              <TableHead className="text-right">Target</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {funnel.map((step, i) => {
              const prev = i > 0 ? funnel[i - 1].count : step.count;
              const rate = prev > 0 ? (step.count / prev) * 100 : 0;
              const dropOff = i > 0 ? 100 - rate : 0;
              const status = i === 0 ? "good" : getFunnelStepStatus(step.label, rate);
              const bench = benchmarkTargets[step.label];

              const statusColors = {
                good: "text-[hsl(var(--success))]",
                ok: "text-[hsl(var(--warning))]",
                bad: "text-[hsl(var(--destructive))]",
              };
              const statusLabels = { good: "Strong", ok: "Needs work", bad: "Weak — fix this" };

              return (
                <TableRow key={step.label}>
                  <TableCell className="font-medium text-sm">{step.label}</TableCell>
                  <TableCell className="text-right font-mono">{step.count}</TableCell>
                  <TableCell className="text-right font-mono">{i === 0 ? "—" : `${rate.toFixed(0)}%`}</TableCell>
                  <TableCell className="text-right font-mono">{i === 0 ? "—" : `${dropOff.toFixed(0)}%`}</TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">{bench?.target || "—"}</TableCell>
                  <TableCell className={`text-xs font-semibold ${statusColors[status]}`}>
                    {i === 0 ? "—" : statusLabels[status]}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Recommendations per weak step */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-foreground">Recommended Actions</h2>
        {funnel.slice(1).map((step, i) => {
          const prev = funnel[i].count;
          const rate = prev > 0 ? (step.count / prev) * 100 : 0;
          const status = getFunnelStepStatus(step.label, rate);
          if (status === "good") return null;
          const insight = funnelInsights[step.label];
          if (!insight) return null;

          return (
            <div key={step.label} className="rounded-lg border border-border bg-secondary/30 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground">{step.label}</p>
                <span className={`text-xs font-semibold ${status === "bad" ? "text-[hsl(var(--destructive))]" : "text-[hsl(var(--warning))]"}`}>
                  {rate.toFixed(0)}% (target: {benchmarkTargets[step.label]?.target})
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{insight.meaning}</p>
              <p className="text-xs text-foreground">{insight.nextAction}</p>
              <button
                onClick={() => navigate(`/tests/${projectId}`)}
                className="flex items-center gap-1 text-xs font-medium text-foreground bg-secondary hover:bg-secondary/80 px-3 py-1.5 rounded-md transition-colors"
              >
                Run tests to improve <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DropOffDetail;
