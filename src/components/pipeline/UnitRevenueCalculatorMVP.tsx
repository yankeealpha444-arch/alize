import { useMemo, useState } from "react";
import { deriveUnitRevenueSeedFromPrompt, runUnitRevenueLogic } from "@/lib/pipeline/unitRevenueLogic";
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

function cleanPrice(raw: string): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return 0;
  return roundStable(Math.max(0, n), 4);
}

function cleanUnits(raw: string): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.floor(n));
}

export default function UnitRevenueCalculatorMVP({ projectId, idea }: Props) {
  const seed = useMemo(() => deriveUnitRevenueSeedFromPrompt(idea), [idea]);
  const [price, setPrice] = useState(() => roundStable(seed.pricePerUnit, 4));
  const [units, setUnits] = useState(seed.units);
  const [calculated, setCalculated] = useState(false);

  const outcome = useMemo(() => runUnitRevenueLogic(price, units), [price, units]);
  const show = calculated && outcome.ok;

  const reset = () => {
    setPrice(roundStable(seed.pricePerUnit, 4));
    setUnits(seed.units);
    setCalculated(false);
  };

  const insights: [string, string] =
    show && outcome.ok ? [outcome.insights.scale, outcome.insights.action] : ["", ""];

  return (
    <div className={DEDICATED_CALC_ROOT}>
      <DedicatedCalculatorHeader
        kicker="Revenue"
        title="Unit Revenue Calculator"
        description="Price per unit and units sold — total revenue and revenue per unit."
      />

      <div className="space-y-4">
        <DedicatedInputsHeading />
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="rounded-2xl border-border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Price per unit</CardTitle>
            </CardHeader>
            <CardContent>
              <input
                id={`ur-p-${projectId}`}
                type="number"
                min={0}
                step={0.01}
                value={price}
                onChange={(e) => {
                  setPrice(cleanPrice(e.target.value));
                  setCalculated(false);
                }}
                aria-label="Price per unit"
                className="w-full h-11 rounded-xl border border-border bg-background px-3 text-lg font-semibold tabular-nums"
              />
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Units sold</CardTitle>
            </CardHeader>
            <CardContent>
              <input
                id={`ur-u-${projectId}`}
                type="number"
                min={0}
                step={1}
                value={units}
                onChange={(e) => {
                  setUnits(cleanUnits(e.target.value));
                  setCalculated(false);
                }}
                aria-label="Units sold"
                className="w-full h-11 rounded-xl border border-border bg-background px-3 text-lg font-semibold tabular-nums"
              />
            </CardContent>
          </Card>
        </div>
      </div>

      <DedicatedCalculatorActions
        calculateLabel="Calculate revenue"
        onCalculate={() => setCalculated(true)}
        onReset={reset}
      />

      {show && outcome.ok ? (
        <DedicatedResultsBlock
          primaryLabel="Total revenue"
          primaryValue={outcome.totalRevenue.toFixed(2)}
          secondaryLabel="Revenue per unit"
          secondaryValue={outcome.revenuePerUnit.toFixed(2)}
          insights={insights}
        />
      ) : null}
    </div>
  );
}
