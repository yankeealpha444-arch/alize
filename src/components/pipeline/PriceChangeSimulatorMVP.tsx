import { useMemo, useState } from "react";
import type { PipelineRunResult } from "@/lib/pipeline/types";
import { formatNumber, formatPercent, roundStable } from "@/lib/calculator/formatNumber";
import { CalculatorMessages } from "@/lib/calculator/calculatorValidation";
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

/** Revenue before/after a straight price change at fixed volume — not competitor comparison. */
export default function PriceChangeSimulatorMVP({ projectId, pipeline }: Props) {
  const initial = pipeline.logic!;
  const seedCurrent = roundStable(initial.userPrice, 8);
  const seedNew = roundStable(initial.userPrice * 1.05, 8);
  const [currentPrice, setCurrentPrice] = useState(seedCurrent);
  const [newPrice, setNewPrice] = useState(seedNew);
  const [monthlyUnits, setMonthlyUnits] = useState(120);
  const [calculated, setCalculated] = useState(false);

  const { revenueBefore, revenueAfter, pctChange } = useMemo(() => {
    const u = Math.max(0, monthlyUnits);
    const cp = roundStable(currentPrice, 8);
    const np = roundStable(newPrice, 8);
    const before = roundStable(cp * u, 8);
    const after = roundStable(np * u, 8);
    const pct =
      before > 0 && Number.isFinite(before) ? roundStable(((after - before) / before) * 100, 8) : 0;

    return { revenueBefore: before, revenueAfter: after, pctChange: pct };
  }, [currentPrice, newPrice, monthlyUnits]);

  const invalidPrice =
    !Number.isFinite(currentPrice) ||
    !Number.isFinite(newPrice) ||
    currentPrice <= 0 ||
    newPrice <= 0;
  const validationMessage = calculated && invalidPrice ? CalculatorMessages.PRICES_MUST_BE_POSITIVE : null;

  const reset = () => {
    setCurrentPrice(seedCurrent);
    setNewPrice(seedNew);
    setMonthlyUnits(120);
    setCalculated(false);
  };

  const showResults = calculated && !invalidPrice;

  const insights: [string, string] = showResults
    ? [
        `Monthly revenue moves from ${formatNumber(revenueBefore)} to ${formatNumber(revenueAfter)} at ${monthlyUnits} units.`,
        "Hold unit volume flat unless your sales forecast changes.",
      ]
    : ["", ""];

  return (
    <div className={DEDICATED_CALC_ROOT}>
      <DedicatedCalculatorHeader
        kicker="Simulation"
        title="Price change simulator"
        description="Hold volume steady and compare monthly revenue at two price points."
      />

      <div className="space-y-4">
        <DedicatedInputsHeading />
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="rounded-2xl border-border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Current price</CardTitle>
            </CardHeader>
            <CardContent>
              <input
                id={`pcs-cur-${projectId}`}
                type="number"
                min={0.01}
                step={0.01}
                value={currentPrice}
                onChange={(e) => {
                  setCurrentPrice(Number(e.target.value) || 0);
                  setCalculated(false);
                }}
                aria-label="Current price"
                className="w-full h-11 rounded-xl border border-border bg-background px-3 text-lg font-semibold tabular-nums"
              />
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">New price</CardTitle>
            </CardHeader>
            <CardContent>
              <input
                id={`pcs-new-${projectId}`}
                type="number"
                min={0.01}
                step={0.01}
                value={newPrice}
                onChange={(e) => {
                  setNewPrice(Number(e.target.value) || 0);
                  setCalculated(false);
                }}
                aria-label="New price"
                className="w-full h-11 rounded-xl border border-border bg-background px-3 text-lg font-semibold tabular-nums"
              />
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Monthly units</CardTitle>
            </CardHeader>
            <CardContent>
              <input
                id={`pcs-u-${projectId}`}
                type="number"
                min={0}
                step={1}
                value={monthlyUnits}
                onChange={(e) => {
                  setMonthlyUnits(Math.max(0, Math.floor(Number(e.target.value)) || 0));
                  setCalculated(false);
                }}
                aria-label="Monthly units"
                className="w-full h-11 rounded-xl border border-border bg-background px-3 text-lg font-semibold tabular-nums"
              />
            </CardContent>
          </Card>
        </div>
      </div>

      <DedicatedCalculatorActions
        calculateLabel="Calculate simulation"
        onCalculate={() => setCalculated(true)}
        onReset={reset}
      />

      {validationMessage ? (
        <p role="alert" className="text-sm text-destructive rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3">
          {validationMessage}
        </p>
      ) : null}

      {showResults ? (
        <DedicatedResultsBlock
          primaryLabel="Revenue after"
          primaryValue={formatNumber(revenueAfter)}
          secondaryLabel="Revenue change"
          secondaryValue={
            <>
              {pctChange >= 0 ? "+" : ""}
              {formatPercent(pctChange)}
            </>
          }
          insights={insights}
        />
      ) : null}

      {pipeline.fallbackUsed ? (
        <p className="text-xs text-amber-700 dark:text-amber-400">Using deterministic fallback seed values.</p>
      ) : null}
    </div>
  );
}
