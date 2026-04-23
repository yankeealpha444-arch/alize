import { useMemo, useState } from "react";
import type { PipelineRunResult } from "@/lib/pipeline/types";
import { roundStable } from "@/lib/calculator/formatNumber";
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

/** Gross margin % from selling price and cost — no competitor comparison blocks. */
export default function MarginCalculatorMVP({ projectId, pipeline }: Props) {
  const initial = pipeline.logic!;
  const seedSp = Math.max(0.01, initial.userPrice);
  const seedCost = Math.max(0, roundStable(initial.avgCompetitorPrice * 0.55, 4));
  const [sellingPrice, setSellingPrice] = useState(seedSp);
  const [cost, setCost] = useState(seedCost);
  const [calculated, setCalculated] = useState(false);

  const { marginPercent, contributionPerUnit } = useMemo(() => {
    const sp = Math.max(0.01, sellingPrice);
    const c = Math.max(0, cost);
    const margin = ((sp - c) / sp) * 100;
    return { marginPercent: margin, contributionPerUnit: sp - c };
  }, [sellingPrice, cost]);

  const reset = () => {
    setSellingPrice(seedSp);
    setCost(seedCost);
    setCalculated(false);
  };

  const insights: [string, string] = calculated
    ? [
        `Gross margin is ${marginPercent.toFixed(1)}% at this selling price and unit cost.`,
        `Contribution is ${contributionPerUnit.toFixed(2)} per unit before fixed overhead.`,
      ]
    : ["", ""];

  return (
    <div className={DEDICATED_CALC_ROOT}>
      <DedicatedCalculatorHeader
        kicker="Unit economics"
        title="Margin calculator"
        description="Gross margin from selling price and unit cost."
      />

      <div className="space-y-4">
        <DedicatedInputsHeading />
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="rounded-2xl border-border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Selling price</CardTitle>
            </CardHeader>
            <CardContent>
              <input
                id={`mg-sp-${projectId}`}
                type="number"
                min={0.01}
                step={0.01}
                value={sellingPrice}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  setSellingPrice(Number.isFinite(n) ? Math.max(0.01, n) : 0.01);
                  setCalculated(false);
                }}
                aria-label="Selling price"
                className="w-full h-11 rounded-xl border border-border bg-background px-3 text-lg font-semibold tabular-nums"
              />
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Unit cost</CardTitle>
            </CardHeader>
            <CardContent>
              <input
                id={`mg-cost-${projectId}`}
                type="number"
                min={0}
                step={0.01}
                value={cost}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  setCost(Number.isFinite(n) ? Math.max(0, n) : 0);
                  setCalculated(false);
                }}
                aria-label="Unit cost"
                className="w-full h-11 rounded-xl border border-border bg-background px-3 text-lg font-semibold tabular-nums"
              />
            </CardContent>
          </Card>
        </div>
      </div>

      <DedicatedCalculatorActions
        calculateLabel="Calculate margin"
        onCalculate={() => setCalculated(true)}
        onReset={reset}
      />

      {calculated ? (
        <DedicatedResultsBlock
          primaryLabel="Gross margin"
          primaryValue={`${marginPercent.toFixed(1)}%`}
          secondaryLabel="Contribution per unit"
          secondaryValue={contributionPerUnit.toFixed(2)}
          insights={insights}
        />
      ) : null}

      {pipeline.fallbackUsed ? (
        <p className="text-xs text-amber-700 dark:text-amber-400">Using deterministic fallback seed values.</p>
      ) : null}
    </div>
  );
}
