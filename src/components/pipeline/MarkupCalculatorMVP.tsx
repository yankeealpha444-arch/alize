import { useMemo, useState } from "react";
import { deriveMarkupSeedFromPrompt, runMarkupLogic } from "@/lib/pipeline/markupLogic";
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

function cleanNumericInput(raw: string): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return 0;
  return roundStable(Math.max(0, n), 4);
}

export default function MarkupCalculatorMVP({ projectId, idea }: Props) {
  const seed = useMemo(() => deriveMarkupSeedFromPrompt(idea), [idea]);
  const [selling, setSelling] = useState(() => roundStable(seed.selling, 4));
  const [cost, setCost] = useState(() => roundStable(seed.cost, 4));
  const [calculated, setCalculated] = useState(false);

  const outcome = useMemo(() => runMarkupLogic(selling, cost), [selling, cost]);
  const err = calculated && !outcome.ok ? outcome.error : null;
  const show = calculated && outcome.ok;

  const reset = () => {
    setSelling(roundStable(seed.selling, 4));
    setCost(roundStable(seed.cost, 4));
    setCalculated(false);
  };

  const insights: [string, string] =
    show && outcome.ok
      ? [outcome.insights.margin, outcome.insights.action]
      : ["", ""];

  return (
    <div className={DEDICATED_CALC_ROOT}>
      <DedicatedCalculatorHeader
        kicker="Unit economics"
        title="Markup Calculator"
        description="Selling price and cost price — markup amount and percent on cost."
      />

      <div className="space-y-4">
        <DedicatedInputsHeading />
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="rounded-2xl border-border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Selling price per unit</CardTitle>
            </CardHeader>
            <CardContent>
              <input
                id={`mk-sp-${projectId}`}
                type="number"
                min={0}
                step={0.01}
                value={selling}
                onChange={(e) => {
                  setSelling(cleanNumericInput(e.target.value));
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
                id={`mk-c-${projectId}`}
                type="number"
                min={0}
                step={0.01}
                value={cost}
                onChange={(e) => {
                  setCost(cleanNumericInput(e.target.value));
                  setCalculated(false);
                }}
                aria-label="Cost price"
                className="w-full h-11 rounded-xl border border-border bg-background px-3 text-lg font-semibold tabular-nums"
              />
            </CardContent>
          </Card>
        </div>
      </div>

      <DedicatedCalculatorActions
        calculateLabel="Calculate markup"
        onCalculate={() => setCalculated(true)}
        onReset={reset}
      />

      {err ? (
        <p className="text-sm text-destructive rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3">{err}</p>
      ) : null}

      {show && outcome.ok ? (
        <DedicatedResultsBlock
          primaryLabel="Markup amount"
          primaryValue={outcome.markupAmount.toFixed(2)}
          secondaryLabel="Markup on cost"
          secondaryValue={`${outcome.markupPercentOnCost.toFixed(2)}%`}
          insights={insights}
        />
      ) : null}
    </div>
  );
}
