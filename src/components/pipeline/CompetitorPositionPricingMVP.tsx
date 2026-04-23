import { useMemo, useState } from "react";
import type { LogicEngineOutput, PipelineRunResult } from "@/lib/pipeline/types";
import { runPricingLogic } from "@/lib/pipeline/logicEngine";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DEDICATED_CALC_ROOT,
  DedicatedCalculatorActions,
  DedicatedCalculatorHeader,
  DedicatedInputsHeading,
  DedicatedResultsBlock,
} from "@/components/pipeline/dedicatedCalculatorChrome";

type Props = {
  projectId: string;
  pipeline: PipelineRunResult;
};

/** Competitor / position comparison: sample competitors, confidence score, market position. */
export default function CompetitorPositionPricingMVP({ projectId, pipeline }: Props) {
  const initial = pipeline.logic!;
  const [userPrice, setUserPrice] = useState(initial.userPrice);
  const [c1, setC1] = useState(initial.avgCompetitorPrice * 0.92);
  const [c2, setC2] = useState(initial.avgCompetitorPrice);
  const [c3, setC3] = useState(initial.avgCompetitorPrice * 1.12);
  const [frozen, setFrozen] = useState<LogicEngineOutput | null>(null);

  const live = useMemo(
    () =>
      runPricingLogic({
        userPrice,
        competitorPrices: [c1, c2, c3],
        marginPercent: 52,
        segmentMatch: true,
      }),
    [userPrice, c1, c2, c3],
  );

  const reset = () => {
    setUserPrice(initial.userPrice);
    setC1(initial.avgCompetitorPrice * 0.92);
    setC2(initial.avgCompetitorPrice);
    setC3(initial.avgCompetitorPrice * 1.12);
    setFrozen(null);
  };

  const onCalculate = () => setFrozen(live);

  const display = frozen;
  const insights: [string, string] = display
    ? [display.insights.position, display.insights.action]
    : ["", ""];

  return (
    <div className={DEDICATED_CALC_ROOT}>
      <DedicatedCalculatorHeader
        kicker="Market comparison"
        title="Competitor position"
        description="Your list price against competitor references — confidence score and gap."
      />

      <div className="space-y-4">
        <DedicatedInputsHeading />
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="rounded-2xl border-border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">List price</CardTitle>
            </CardHeader>
            <CardContent>
              <input
                id={`cp-price-${projectId}`}
                type="number"
                min={1}
                step={1}
                value={Math.round(userPrice)}
                onChange={(e) => {
                  setUserPrice(Number(e.target.value) || 0);
                  setFrozen(null);
                }}
                aria-label="List price"
                className="w-full h-11 rounded-xl border border-border bg-background px-3 text-lg font-semibold tabular-nums"
              />
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Competitor references</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-2">
              {[
                [c1, setC1] as const,
                [c2, setC2] as const,
                [c3, setC3] as const,
              ].map(([v, setV], i) => (
                <div key={i}>
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wide" htmlFor={`cp-c${i}-${projectId}`}>
                    Ref {i + 1}
                  </label>
                  <input
                    id={`cp-c${i}-${projectId}`}
                    type="number"
                    min={1}
                    step={1}
                    value={Math.round(v)}
                    onChange={(e) => {
                      setV(Number(e.target.value) || 0);
                      setFrozen(null);
                    }}
                    aria-label={`Competitor reference ${i + 1}`}
                    className="mt-1 w-full h-9 rounded-lg border border-border bg-background px-2 text-sm tabular-nums"
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <DedicatedCalculatorActions calculateLabel="Calculate position" onCalculate={onCalculate} onReset={reset} />

      {display ? (
        <DedicatedResultsBlock
          primaryLabel="Confidence score"
          primaryValue={
            <>
              {display.pricingConfidenceScore}
              <span className="text-lg font-semibold text-muted-foreground"> / 100</span>
            </>
          }
          secondaryLabel="Average competitor"
          secondaryValue={display.avgCompetitorPrice.toFixed(0)}
          insights={insights}
        />
      ) : null}

      {pipeline.fallbackUsed ? (
        <p className="text-xs text-amber-700 dark:text-amber-400">Using deterministic fallback dataset — tighten inputs for a custom fit.</p>
      ) : null}
    </div>
  );
}
