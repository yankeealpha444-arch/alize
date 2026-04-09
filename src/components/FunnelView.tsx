import { useState } from "react";
import { FunnelStep, getFunnelStepStatus, funnelInsights, funnelBenchmarks, FunnelStatus } from "@/lib/store";
import { Switch } from "@/components/ui/switch";
import { ChevronDown, ChevronUp, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface FunnelViewProps {
  funnel: FunnelStep[];
}

const statusConfig: Record<FunnelStatus, { label: string; className: string; dotClass: string }> = {
  good: { label: "Strong", className: "text-[hsl(var(--success))]", dotClass: "bg-[hsl(var(--success))]" },
  ok: { label: "Okay", className: "text-[hsl(var(--warning))]", dotClass: "bg-[hsl(var(--warning))]" },
  bad: { label: "Weak", className: "text-[hsl(var(--destructive))]", dotClass: "bg-[hsl(var(--destructive))]" },
};

const barBgClass: Record<FunnelStatus, string> = {
  good: "bg-[hsl(var(--success))]",
  ok: "bg-[hsl(var(--warning))]",
  bad: "bg-[hsl(var(--destructive))]",
};

const FunnelView = ({ funnel }: FunnelViewProps) => {
  const [advanced, setAdvanced] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const navigate = useNavigate();
  const maxCount = funnel[0]?.count || 1;

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-bold text-foreground">Product Funnel</h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{advanced ? "Advanced" : "Simple"}</span>
          <Switch checked={advanced} onCheckedChange={setAdvanced} />
        </div>
      </div>

      <p className="text-xs text-muted-foreground mb-4">
        Where users drop off.{" "}
        <span className="text-[hsl(var(--destructive))]">Red</span> = weak.{" "}
        <span className="text-[hsl(var(--warning))]">Orange</span> = okay.{" "}
        <span className="text-[hsl(var(--success))]">Green</span> = strong.{" "}
        Fix the biggest red step first.
      </p>

      <div className="space-y-1">
        {funnel.map((step, i) => {
          const prevCount = i > 0 ? funnel[i - 1].count : step.count;
          const rate = prevCount > 0 ? (step.count / prevCount) * 100 : 0;
          const status: FunnelStatus = i === 0 ? "good" : getFunnelStepStatus(step.label, rate);
          const cfg = statusConfig[status];
          const barColor = i === 0 ? "bg-muted-foreground/30" : barBgClass[status];
          const width = Math.max((step.count / maxCount) * 100, 6);
          const isExpanded = expanded === step.label;
          const insight = funnelInsights[step.label];
          const benchmark = funnelBenchmarks[step.label];
          const canExpand = i > 0 && insight;

          return (
            <div key={step.label}>
              <button
                className={`w-full text-left rounded-md px-3 py-2 transition-colors ${canExpand ? "hover:bg-secondary/50 cursor-pointer" : "cursor-default"}`}
                onClick={() => canExpand && setExpanded(isExpanded ? null : step.label)}
                type="button"
              >
                <div className="flex items-center gap-3">
                  <div className="w-28 shrink-0 text-xs text-muted-foreground truncate">{step.label}</div>

                  {advanced ? (
                    <div className="flex-1 relative h-6">
                      <div
                        className={`absolute inset-y-0 left-0 rounded ${barColor} opacity-70`}
                        style={{ width: `${width}%` }}
                      />
                      <div className="absolute inset-y-0 left-2 flex items-center">
                        <span className="text-xs font-mono font-semibold text-foreground">{step.count}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center">
                      <span className="text-sm font-mono font-semibold text-foreground">{step.count}</span>
                    </div>
                  )}

                  {i === 0 ? (
                    <div className="w-36 text-right text-xs text-muted-foreground">—</div>
                  ) : (
                    <div className="w-36 flex items-center justify-end gap-2">
                      {advanced && (
                        <span className="text-xs font-mono text-muted-foreground">{rate.toFixed(0)}%</span>
                      )}
                      <div className="flex items-center gap-1.5">
                        <div className={`w-2 h-2 rounded-full ${cfg.dotClass}`} />
                        <span className={`text-xs font-medium ${cfg.className}`}>{cfg.label}</span>
                      </div>
                    </div>
                  )}

                  {canExpand && (
                    <div className="w-4 shrink-0">
                      {isExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                      )}
                    </div>
                  )}
                </div>
              </button>

              {isExpanded && insight && (
                <div className="ml-6 mr-4 mt-1 mb-3 p-4 rounded-md bg-secondary/40 border border-border space-y-3">
                  <div>
                    <p className="text-xs font-semibold text-foreground mb-1">Problem</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{insight.meaning}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground mb-1">Why this matters</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{insight.whyItMatters}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground mb-1">What to do next</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{insight.nextAction}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground mb-1">Expected impact</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{insight.expectedImpact}</p>
                  </div>
                  {benchmark && (
                    <div>
                      <p className="text-xs font-semibold text-foreground mb-1">Benchmark</p>
                      <p className="text-xs text-muted-foreground">{benchmark.target}</p>
                    </div>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate("/tests");
                    }}
                    className="flex items-center gap-1 text-xs font-medium text-foreground bg-secondary hover:bg-secondary/80 px-3 py-1.5 rounded-md transition-colors"
                  >
                    Run tests to improve
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FunnelView;
