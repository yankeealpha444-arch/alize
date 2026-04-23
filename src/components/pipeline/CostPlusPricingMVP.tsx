import { useMemo, useState } from "react";
import { deriveCostPlusSeedFromPrompt, runCostPlusPricingLogic } from "@/lib/pipeline/costPlusPricingLogic";
import { roundStable } from "@/lib/calculator/formatNumber";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DEDICATED_CALC_ROOT,
  DedicatedCalculatorActions,
  DedicatedCalculatorHeader,
  DedicatedInputsHeading,
  DedicatedResultsBlock,
} from "@/components/pipeline/dedicatedCalculatorChrome";

type Props = { projectId: string; idea: string };

function cleanCost(raw: string): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return 0;
  return roundStable(Math.max(0, n), 4);
}

function cleanMarkupPct(raw: string): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return 0;
  return roundStable(Math.max(0, n), 4);
}

export default function CostPlusPricingMVP({ projectId, idea }: Props) {
  const seed = useMemo(() => deriveCostPlusSeedFromPrompt(idea), [idea]);
  const [cost, setCost] = useState(() => roundStable(seed.costPerUnit, 4));
  const [markupPct, setMarkupPct] = useState(() => roundStable(seed.markupPercent, 4));
  const [calculated, setCalculated] = useState(false);

  const outcome = useMemo(() => runCostPlusPricingLogic(cost, markupPct), [cost, markupPct]);
  const err = calculated && !outcome.ok ? outcome.error : null;
  const show = calculated && outcome.ok;

  const reset = () => {
    setCost(roundStable(seed.costPerUnit, 4));
    setMarkupPct(roundStable(seed.markupPercent, 4));
    setCalculated(false);
  };

  const insights: [string, string] =
    show && outcome.ok ? [outcome.insights.cost, outcome.insights.action] : ["", ""];

  return (
    <div className={DEDICATED_CALC_ROOT}>
      <DedicatedCalculatorHeader
        kicker="Pricing model"
        title="Cost Plus Pricing Calculator"
        description="Cost price and markup on cost — selling price and markup amount."
      />

      <div className="space-y-4">
        <DedicatedInputsHeading />
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="rounded-2xl border-border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Cost price</CardTitle>
            </CardHeader>
            <CardContent>
              <input
                id={`cp-c-${projectId}`}
                type="number"
                min={0}
                step={0.01}
                value={cost}
                onChange={(e) => {
                  setCost(cleanCost(e.target.value));
                  setCalculated(false);
                }}
                aria-label="Cost price"
                className="w-full h-11 rounded-xl border border-border bg-background px-3 text-lg font-semibold tabular-nums"
              />
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Markup percent on cost</CardTitle>
            </CardHeader>
            <CardContent>
              <input
                id={`cp-m-${projectId}`}
                type="number"
                min={0}
                step={1}
                value={markupPct}
                onChange={(e) => {
                  setMarkupPct(cleanMarkupPct(e.target.value));
                  setCalculated(false);
                }}
                aria-label="Markup percent on cost"
                className="w-full h-11 rounded-xl border border-border bg-background px-3 text-lg font-semibold tabular-nums"
              />
            </CardContent>
          </Card>
        </div>
      </div>

      <DedicatedCalculatorActions
        calculateLabel="Calculate selling price"
        onCalculate={() => setCalculated(true)}
        onReset={reset}
      />

      {err ? (
        <p className="text-sm text-destructive rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3">{err}</p>
      ) : null}

      {show && outcome.ok ? (
        <DedicatedResultsBlock
          primaryLabel="Selling price"
          primaryValue={outcome.sellingPrice.toFixed(2)}
          secondaryLabel="Markup amount"
          secondaryValue={outcome.markupAmount.toFixed(2)}
          insights={insights}
        />
      ) : null}
    </div>
  );
}
