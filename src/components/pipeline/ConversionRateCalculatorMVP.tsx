import { useMemo, useState } from "react";
import { parseNumericSeeds, runConversionRateLogic } from "@/lib/pipeline/specializedSegmentLogic";
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

export default function ConversionRateCalculatorMVP({ projectId, idea }: Props) {
  const seed = useMemo(() => {
    const n = parseNumericSeeds(idea, 2);
    if (n.length >= 2) return { visitors: n[0], conversions: n[1] };
    return { visitors: 1000, conversions: 42 };
  }, [idea]);

  const [visitors, setVisitors] = useState(seed.visitors);
  const [conversions, setConversions] = useState(seed.conversions);
  const [calculated, setCalculated] = useState(false);

  const outcome = useMemo(() => runConversionRateLogic(visitors, conversions), [visitors, conversions]);
  const show = calculated && outcome.ok;

  const reset = () => {
    setVisitors(seed.visitors);
    setConversions(seed.conversions);
    setCalculated(false);
  };

  const insights: [string, string] =
    show && outcome.ok
      ? [
          "Rate = conversions ÷ visitors — keep definitions stable week to week.",
          conversions > visitors
            ? "Conversions cannot exceed visitors; check tracking if this appears."
            : "Small rate lifts compound when traffic scales.",
        ]
      : ["", ""];

  return (
    <div className={DEDICATED_CALC_ROOT}>
      <DedicatedCalculatorHeader
        kicker="Analytics"
        title="Conversion rate calculator"
        description="Visitors and conversions — conversion rate and conversion count."
      />

      <div className="space-y-4">
        <DedicatedInputsHeading />
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="rounded-2xl border-border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Visitors</CardTitle>
            </CardHeader>
            <CardContent>
              <input
                id={`cr-v-${projectId}`}
                type="number"
                min={0}
                step={1}
                value={visitors}
                onChange={(e) => {
                  setVisitors(Math.max(0, Number(e.target.value) || 0));
                  setCalculated(false);
                }}
                aria-label="Visitors"
                className="w-full h-11 rounded-xl border border-border bg-background px-3 text-lg font-semibold tabular-nums"
              />
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Conversions</CardTitle>
            </CardHeader>
            <CardContent>
              <input
                id={`cr-c-${projectId}`}
                type="number"
                min={0}
                step={1}
                value={conversions}
                onChange={(e) => {
                  setConversions(Math.max(0, Number(e.target.value) || 0));
                  setCalculated(false);
                }}
                aria-label="Conversions"
                className="w-full h-11 rounded-xl border border-border bg-background px-3 text-lg font-semibold tabular-nums"
              />
            </CardContent>
          </Card>
        </div>
      </div>

      <DedicatedCalculatorActions calculateLabel="Calculate rate" onCalculate={() => setCalculated(true)} onReset={reset} />

      {calculated && !outcome.ok ? (
        <p className="text-sm text-destructive font-medium rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3">
          {outcome.error}
        </p>
      ) : null}

      {show && outcome.ok ? (
        <DedicatedResultsBlock
          primaryLabel="Conversion rate"
          primaryValue={formatPercent(outcome.ratePercent)}
          secondaryLabel="Conversions"
          secondaryValue={String(outcome.conversions)}
          insights={insights}
        />
      ) : null}
    </div>
  );
}
