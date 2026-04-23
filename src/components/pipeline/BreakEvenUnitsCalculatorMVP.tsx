import { useMemo, useState } from "react";
import { parseNumericSeeds, runBreakEvenUnitsLogic } from "@/lib/pipeline/specializedSegmentLogic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DEDICATED_CALC_ROOT,
  DedicatedCalculatorActions,
  DedicatedCalculatorHeader,
  DedicatedInputsHeading,
  DedicatedResultsBlock,
} from "@/components/pipeline/dedicatedCalculatorChrome";

type Props = { projectId: string; idea: string };

export default function BreakEvenUnitsCalculatorMVP({ projectId, idea }: Props) {
  const seed = useMemo(() => {
    const n = parseNumericSeeds(idea, 3);
    if (n.length >= 3) return { fixed: n[0], price: n[1], varCost: n[2] };
    return { fixed: 5000, price: 80, varCost: 35 };
  }, [idea]);

  const [fixedCosts, setFixedCosts] = useState(seed.fixed);
  const [pricePerUnit, setPricePerUnit] = useState(seed.price);
  const [variableCostPerUnit, setVariableCostPerUnit] = useState(seed.varCost);
  const [calculated, setCalculated] = useState(false);

  const outcome = useMemo(
    () => runBreakEvenUnitsLogic(fixedCosts, pricePerUnit, variableCostPerUnit),
    [fixedCosts, pricePerUnit, variableCostPerUnit],
  );

  const show = calculated && outcome.ok;

  const reset = () => {
    setFixedCosts(seed.fixed);
    setPricePerUnit(seed.price);
    setVariableCostPerUnit(seed.varCost);
    setCalculated(false);
  };

  const insights: [string, string] =
    show && outcome.ok
      ? [
          `Contribution per unit is ${outcome.contributionPerUnit.toFixed(2)} (price minus variable cost).`,
          "Raise price, cut variable cost, or reduce fixed cost to break even sooner.",
        ]
      : ["", ""];

  return (
    <div className={DEDICATED_CALC_ROOT}>
      <DedicatedCalculatorHeader
        kicker="Unit economics"
        title="Break Even Calculator"
        description="Fixed costs, price per unit, and variable cost per unit — break-even units and revenue."
      />

      <div className="space-y-4">
        <DedicatedInputsHeading />
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="rounded-2xl border-border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Fixed costs</CardTitle>
            </CardHeader>
            <CardContent>
              <input
                id={`beu-fixed-${projectId}`}
                type="number"
                min={0}
                step={0.01}
                value={fixedCosts}
                onChange={(e) => {
                  setFixedCosts(Math.max(0, Number(e.target.value) || 0));
                  setCalculated(false);
                }}
                aria-label="Fixed costs"
                className="w-full h-11 rounded-xl border border-border bg-background px-3 text-lg font-semibold tabular-nums"
              />
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Price per unit</CardTitle>
            </CardHeader>
            <CardContent>
              <input
                id={`beu-price-${projectId}`}
                type="number"
                min={0}
                step={0.01}
                value={pricePerUnit}
                onChange={(e) => {
                  setPricePerUnit(Math.max(0, Number(e.target.value) || 0));
                  setCalculated(false);
                }}
                aria-label="Price per unit"
                className="w-full h-11 rounded-xl border border-border bg-background px-3 text-lg font-semibold tabular-nums"
              />
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Variable cost per unit</CardTitle>
            </CardHeader>
            <CardContent>
              <input
                id={`beu-var-${projectId}`}
                type="number"
                min={0}
                step={0.01}
                value={variableCostPerUnit}
                onChange={(e) => {
                  setVariableCostPerUnit(Math.max(0, Number(e.target.value) || 0));
                  setCalculated(false);
                }}
                aria-label="Variable cost per unit"
                className="w-full h-11 rounded-xl border border-border bg-background px-3 text-lg font-semibold tabular-nums"
              />
            </CardContent>
          </Card>
        </div>
      </div>

      <DedicatedCalculatorActions
        calculateLabel="Calculate break even"
        onCalculate={() => setCalculated(true)}
        onReset={reset}
      />

      {calculated && !outcome.ok ? (
        <p className="text-sm text-destructive font-medium rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3">
          {outcome.error}
        </p>
      ) : null}

      {show && outcome.ok ? (
        <DedicatedResultsBlock
          primaryLabel="Break even units"
          primaryValue={outcome.breakEvenUnits.toFixed(2)}
          secondaryLabel="Break even revenue"
          secondaryValue={outcome.breakEvenRevenue.toFixed(2)}
          insights={insights}
        />
      ) : null}
    </div>
  );
}
