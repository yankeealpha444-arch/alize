import { useMemo, useState } from "react";
import { parseNumericSeeds, runGstLogic } from "@/lib/pipeline/specializedSegmentLogic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DEDICATED_CALC_ROOT,
  DedicatedCalculatorActions,
  DedicatedCalculatorHeader,
  DedicatedInputsHeading,
  DedicatedResultsBlock,
} from "@/components/pipeline/dedicatedCalculatorChrome";

type Props = { projectId: string; idea: string };

export default function GSTCalculatorMVP({ projectId, idea }: Props) {
  const seed = useMemo(() => {
    const n = parseNumericSeeds(idea, 2);
    if (n.length >= 2) return { base: n[0], rate: n[1] };
    return { base: 100, rate: 10 };
  }, [idea]);

  const [priceBeforeGst, setPriceBeforeGst] = useState(seed.base);
  const [gstRatePercent, setGstRatePercent] = useState(Math.min(Math.max(0, seed.rate), 100));
  const [calculated, setCalculated] = useState(false);

  const outcome = useMemo(
    () => runGstLogic(priceBeforeGst, gstRatePercent),
    [priceBeforeGst, gstRatePercent],
  );
  const show = calculated && outcome.ok;

  const reset = () => {
    setPriceBeforeGst(seed.base);
    setGstRatePercent(Math.min(Math.max(0, seed.rate), 100));
    setCalculated(false);
  };

  const insights: [string, string] = show
    ? [
        `GST at ${gstRatePercent.toFixed(1)}% adds ${outcome.gstAmount.toFixed(2)} to the ex-tax amount.`,
        `Tax-inclusive price is what customers pay when GST is added on top.`,
      ]
    : ["", ""];

  return (
    <div className={DEDICATED_CALC_ROOT}>
      <DedicatedCalculatorHeader
        kicker="Tax"
        title="GST calculator"
        description="Price before GST and GST rate — GST amount and price including GST."
      />

      <div className="space-y-4">
        <DedicatedInputsHeading />
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="rounded-2xl border-border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Price before GST</CardTitle>
            </CardHeader>
            <CardContent>
              <input
                id={`gst-b-${projectId}`}
                type="number"
                min={0}
                step={0.01}
                value={priceBeforeGst}
                onChange={(e) => {
                  setPriceBeforeGst(Math.max(0, Number(e.target.value) || 0));
                  setCalculated(false);
                }}
                aria-label="Price before GST"
                className="w-full h-11 rounded-xl border border-border bg-background px-3 text-lg font-semibold tabular-nums"
              />
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">GST rate (%)</CardTitle>
            </CardHeader>
            <CardContent>
              <input
                id={`gst-r-${projectId}`}
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={gstRatePercent}
                onChange={(e) => {
                  setGstRatePercent(Math.min(100, Math.max(0, Number(e.target.value) || 0)));
                  setCalculated(false);
                }}
                aria-label="GST rate percent"
                className="w-full h-11 rounded-xl border border-border bg-background px-3 text-lg font-semibold tabular-nums"
              />
            </CardContent>
          </Card>
        </div>
      </div>

      <DedicatedCalculatorActions calculateLabel="Calculate GST" onCalculate={() => setCalculated(true)} onReset={reset} />

      {show && outcome.ok ? (
        <DedicatedResultsBlock
          primaryLabel="GST amount"
          primaryValue={outcome.gstAmount.toFixed(2)}
          secondaryLabel="Price including GST"
          secondaryValue={outcome.priceIncludingGst.toFixed(2)}
          insights={insights}
        />
      ) : null}
    </div>
  );
}
