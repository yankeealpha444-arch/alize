import { useMemo, useState } from "react";
import {
  deriveProfitMarginSeedFromPrompt,
  runProfitMarginLogic,
  shouldShowProfitMarginUnitsInput,
} from "@/lib/pipeline/profitMarginLogic";
import { formatNumber, formatPercent, roundStable } from "@/lib/calculator/formatNumber";
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

function cleanNumericInput(raw: string): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return 0;
  return roundStable(n, 4);
}

/**
 * Profit margin: inputs follow the prompt contract only (price + cost, or + units when defined).
 * margin = (profit / price) × 100, profit = price − cost.
 */
export default function ProfitMarginCalculatorMVP({ projectId, idea }: Props) {
  const includeUnits = useMemo(() => shouldShowProfitMarginUnitsInput(idea), [idea]);
  const seed = useMemo(() => deriveProfitMarginSeedFromPrompt(idea), [idea]);
  const [sellingPricePerUnit, setSellingPricePerUnit] = useState(() => roundStable(seed.sellingPricePerUnit, 4));
  const [costPerUnit, setCostPerUnit] = useState(() => roundStable(seed.costPerUnit, 4));
  const [estimatedUnitsSold, setEstimatedUnitsSold] = useState(seed.estimatedUnitsSold);
  const [calculated, setCalculated] = useState(false);

  const outcome = useMemo(
    () => runProfitMarginLogic(sellingPricePerUnit, costPerUnit, estimatedUnitsSold, { includeUnits }),
    [sellingPricePerUnit, costPerUnit, estimatedUnitsSold, includeUnits],
  );

  const validationMessage = calculated && !outcome.ok ? outcome.error : null;
  const showResults = calculated && outcome.ok;

  const reset = () => {
    setSellingPricePerUnit(roundStable(seed.sellingPricePerUnit, 4));
    setCostPerUnit(roundStable(seed.costPerUnit, 4));
    setEstimatedUnitsSold(seed.estimatedUnitsSold);
    setCalculated(false);
  };

  const insights: [string, string] =
    showResults && outcome.ok
      ? [outcome.result.insights.profit, outcome.result.insights.action]
      : ["", ""];

  return (
    <div className={DEDICATED_CALC_ROOT}>
      <DedicatedCalculatorHeader
        kicker="Unit economics"
        title="Profit Margin Calculator"
        description={
          includeUnits
            ? "Selling price, cost price, and estimated units — profit per unit, margin %, and totals."
            : "Selling price and cost price — profit per unit and margin %."
        }
      />

      <div className="space-y-4">
        <DedicatedInputsHeading />
        <div className={`grid gap-4 ${includeUnits ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
          <Card className="rounded-2xl border-border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Selling price per unit</CardTitle>
            </CardHeader>
            <CardContent>
              <input
                id={`pm-sp-${projectId}`}
                type="number"
                min={0}
                step={0.01}
                value={sellingPricePerUnit}
                onChange={(e) => {
                  setSellingPricePerUnit(cleanNumericInput(e.target.value));
                  setCalculated(false);
                }}
                aria-label="Selling price per unit"
                className="w-full h-11 rounded-xl border border-border bg-background px-3 text-lg font-semibold tabular-nums"
              />
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Cost price</CardTitle>
            </CardHeader>
            <CardContent>
              <input
                id={`pm-cost-${projectId}`}
                type="number"
                min={0}
                step={0.01}
                value={costPerUnit}
                onChange={(e) => {
                  setCostPerUnit(cleanNumericInput(e.target.value));
                  setCalculated(false);
                }}
                aria-label="Cost price"
                className="w-full h-11 rounded-xl border border-border bg-background px-3 text-lg font-semibold tabular-nums"
              />
            </CardContent>
          </Card>
          {includeUnits ? (
            <Card className="rounded-2xl border-border shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Estimated units sold</CardTitle>
              </CardHeader>
              <CardContent>
                <input
                  id={`pm-units-${projectId}`}
                  type="number"
                  min={0}
                  step={1}
                  value={estimatedUnitsSold}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    setEstimatedUnitsSold(Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0);
                    setCalculated(false);
                  }}
                  aria-label="Estimated number of units sold"
                  className="w-full h-11 rounded-xl border border-border bg-background px-3 text-lg font-semibold tabular-nums"
                />
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>

      <DedicatedCalculatorActions
        calculateLabel="Calculate profit"
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
          primaryLabel="Profit per unit"
          primaryValue={formatNumber(outcome.result.profitPerUnit)}
          secondaryLabel="Profit margin"
          secondaryValue={formatPercent(outcome.result.profitMarginPercent)}
          insights={insights}
        />
      ) : null}
    </div>
  );
}
