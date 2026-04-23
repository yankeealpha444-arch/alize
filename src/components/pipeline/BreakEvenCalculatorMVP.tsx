import { useMemo, useState } from "react";
import { deriveBreakEvenSeedFromPrompt, runBreakEvenLogic } from "@/lib/pipeline/breakEvenLogic";
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
  idea: string;
};

function cleanMoney(raw: string): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return 0;
  return roundStable(Math.max(0, n), 4);
}

function cleanUnits(raw: string): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.floor(n));
}

/**
 * Break-even price per unit from fixed costs, variable cost per unit, and volume — no competitor comparison UI.
 */
export default function BreakEvenCalculatorMVP({ projectId, idea }: Props) {
  const seed = useMemo(() => deriveBreakEvenSeedFromPrompt(idea), [idea]);
  const [fixedCosts, setFixedCosts] = useState(() => roundStable(seed.fixedCosts, 4));
  const [costPerUnit, setCostPerUnit] = useState(() => roundStable(seed.costPerUnit, 4));
  const [expectedUnitsSold, setExpectedUnitsSold] = useState(seed.expectedUnitsSold);
  const [calculated, setCalculated] = useState(false);

  const outcome = useMemo(
    () => runBreakEvenLogic(fixedCosts, costPerUnit, expectedUnitsSold),
    [fixedCosts, costPerUnit, expectedUnitsSold],
  );

  const validationMessage = calculated && !outcome.ok ? outcome.error : null;
  const showResults = calculated && outcome.ok;

  const reset = () => {
    setFixedCosts(roundStable(seed.fixedCosts, 4));
    setCostPerUnit(roundStable(seed.costPerUnit, 4));
    setExpectedUnitsSold(seed.expectedUnitsSold);
    setCalculated(false);
  };

  const insights: [string, string] =
    showResults && outcome.ok
      ? [outcome.result.insights.cost, outcome.result.insights.action]
      : ["", ""];

  return (
    <div className={DEDICATED_CALC_ROOT}>
      <DedicatedCalculatorHeader
        kicker="Unit economics"
        title="Break Even Price Calculator"
        description="Recover fixed plus variable costs across your expected sales volume."
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
                id={`be-fixed-${projectId}`}
                type="number"
                min={0}
                step={0.01}
                value={fixedCosts}
                onChange={(e) => {
                  setFixedCosts(cleanMoney(e.target.value));
                  setCalculated(false);
                }}
                aria-label="Fixed costs"
                className="w-full h-11 rounded-xl border border-border bg-background px-3 text-lg font-semibold tabular-nums"
              />
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Cost per unit</CardTitle>
            </CardHeader>
            <CardContent>
              <input
                id={`be-cpu-${projectId}`}
                type="number"
                min={0}
                step={0.01}
                value={costPerUnit}
                onChange={(e) => {
                  setCostPerUnit(cleanMoney(e.target.value));
                  setCalculated(false);
                }}
                aria-label="Cost per unit"
                className="w-full h-11 rounded-xl border border-border bg-background px-3 text-lg font-semibold tabular-nums"
              />
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Expected units sold</CardTitle>
            </CardHeader>
            <CardContent>
              <input
                id={`be-units-${projectId}`}
                type="number"
                min={0}
                step={1}
                value={expectedUnitsSold}
                onChange={(e) => {
                  setExpectedUnitsSold(cleanUnits(e.target.value));
                  setCalculated(false);
                }}
                aria-label="Expected number of units sold"
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

      {validationMessage ? (
        <p className="text-sm text-destructive font-medium rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3">
          {validationMessage}
        </p>
      ) : null}

      {showResults && outcome.ok ? (
        <DedicatedResultsBlock
          primaryLabel="Break even price per unit"
          primaryValue={outcome.result.breakEvenPricePerUnit.toFixed(2)}
          secondaryLabel="Total revenue at break even"
          secondaryValue={outcome.result.totalRevenueAtBreakEven.toFixed(2)}
          insights={insights}
        />
      ) : null}
    </div>
  );
}
