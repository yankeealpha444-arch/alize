import { useMemo, useState } from "react";
import { parseNumericSeeds, runRoiLogic } from "@/lib/pipeline/specializedSegmentLogic";
import { formatPercent } from "@/lib/calculator/formatNumber";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DEDICATED_CALC_ROOT,
  DedicatedCalculatorActions,
  DedicatedCalculatorHeader,
  DedicatedInputsHeading,
  DedicatedResultsBlock,
} from "@/components/pipeline/dedicatedCalculatorChrome";

type Props = { projectId: string; idea: string };

export default function RoiCalculatorMVP({ projectId, idea }: Props) {
  const seed = useMemo(() => {
    const n = parseNumericSeeds(idea, 2);
    if (n.length >= 2) return { investment: n[0], finalValue: n[1] };
    return { investment: 10_000, finalValue: 12_500 };
  }, [idea]);

  const [investment, setInvestment] = useState(seed.investment);
  const [finalValue, setFinalValue] = useState(seed.finalValue);
  const [calculated, setCalculated] = useState(false);

  const outcome = useMemo(() => runRoiLogic(investment, finalValue), [investment, finalValue]);
  const show = calculated && outcome.ok;

  const reset = () => {
    setInvestment(seed.investment);
    setFinalValue(seed.finalValue);
    setCalculated(false);
  };

  const insights: [string, string] =
    show && outcome.ok
      ? [
          outcome.roiPercent >= 0
            ? "ROI is positive when return exceeds what you put in."
            : "Negative ROI means the final value is below your investment.",
          "Compare ROI using the same time horizon for fair decisions.",
        ]
      : ["", ""];

  return (
    <div className={DEDICATED_CALC_ROOT}>
      <DedicatedCalculatorHeader
        kicker="Investment"
        title="ROI calculator"
        description="Investment amount and return amount — ROI percentage and profit."
      />

      <div className="space-y-4">
        <DedicatedInputsHeading />
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="rounded-2xl border-border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Investment amount</CardTitle>
            </CardHeader>
            <CardContent>
              <input
                id={`roi-i-${projectId}`}
                type="number"
                min={0}
                step={1}
                value={investment}
                onChange={(e) => {
                  setInvestment(Math.max(0, Number(e.target.value) || 0));
                  setCalculated(false);
                }}
                aria-label="Investment amount"
                className="w-full h-11 rounded-xl border border-border bg-background px-3 text-lg font-semibold tabular-nums"
              />
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Return amount</CardTitle>
            </CardHeader>
            <CardContent>
              <input
                id={`roi-f-${projectId}`}
                type="number"
                step={1}
                value={finalValue}
                onChange={(e) => {
                  setFinalValue(Number(e.target.value) || 0);
                  setCalculated(false);
                }}
                aria-label="Return amount"
                className="w-full h-11 rounded-xl border border-border bg-background px-3 text-lg font-semibold tabular-nums"
              />
            </CardContent>
          </Card>
        </div>
      </div>

      <DedicatedCalculatorActions calculateLabel="Calculate ROI" onCalculate={() => setCalculated(true)} onReset={reset} />

      {calculated && !outcome.ok ? (
        <p className="text-sm text-destructive font-medium rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3">
          {outcome.error}
        </p>
      ) : null}

      {show && outcome.ok ? (
        <DedicatedResultsBlock
          primaryLabel="ROI"
          primaryValue={formatPercent(outcome.roiPercent)}
          secondaryLabel="Profit"
          secondaryValue={outcome.profit.toFixed(2)}
          insights={insights}
        />
      ) : null}
    </div>
  );
}
