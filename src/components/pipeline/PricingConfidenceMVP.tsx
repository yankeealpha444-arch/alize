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

/**
 * Confidence-first layout: list price + market benchmark → confidence score (no multi-competitor grid).
 */
export default function PricingConfidenceMVP({ projectId, pipeline }: Props) {
  const initial = pipeline.logic!;
  const [userPrice, setUserPrice] = useState(initial.userPrice);
  const [benchmark, setBenchmark] = useState(initial.avgCompetitorPrice);
  const [frozen, setFrozen] = useState<LogicEngineOutput | null>(null);

  const live = useMemo(
    () =>
      runPricingLogic({
        userPrice,
        competitorPrices: [benchmark * 0.97, benchmark, benchmark * 1.03],
        marginPercent: 52,
        segmentMatch: true,
      }),
    [userPrice, benchmark],
  );

  const reset = () => {
    setUserPrice(initial.userPrice);
    setBenchmark(initial.avgCompetitorPrice);
    setFrozen(null);
  };

  const onCalculate = () => {
    setFrozen(live);
  };

  const display = frozen;
  const insights: [string, string] = display
    ? [display.insights.position, display.insights.action]
    : ["", ""];

  return (
    <div className={DEDICATED_CALC_ROOT}>
      <DedicatedCalculatorHeader
        kicker="Pricing confidence"
        title="Pricing Confidence Calculator"
        description="How strong your price looks against a market benchmark — adjust inputs and calculate."
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
                id={`pc-price-${projectId}`}
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
              <CardTitle className="text-sm font-medium text-muted-foreground">Market benchmark</CardTitle>
            </CardHeader>
            <CardContent>
              <input
                id={`pc-bench-${projectId}`}
                type="number"
                min={1}
                step={1}
                value={Math.round(benchmark)}
                onChange={(e) => {
                  setBenchmark(Number(e.target.value) || 0);
                  setFrozen(null);
                }}
                aria-label="Market benchmark"
                className="w-full h-11 rounded-xl border border-border bg-background px-3 text-lg font-semibold tabular-nums"
              />
            </CardContent>
          </Card>
        </div>
      </div>

      <DedicatedCalculatorActions calculateLabel="Calculate confidence" onCalculate={onCalculate} onReset={reset} />

      {display ? (
        <DedicatedResultsBlock
          primaryLabel="Confidence score"
          primaryValue={
            <>
              {display.pricingConfidenceScore}
              <span className="text-lg font-semibold text-muted-foreground"> / 100</span>
            </>
          }
          secondaryLabel="Gap vs benchmark"
          secondaryValue={
            <>
              {display.priceGapPercent >= 0 ? "+" : ""}
              {display.priceGapPercent.toFixed(1)}%
            </>
          }
          insights={insights}
        />
      ) : null}

      {pipeline.fallbackUsed ? (
        <p className="text-xs text-amber-700 dark:text-amber-400">Using deterministic fallback dataset.</p>
      ) : null}
    </div>
  );
}
