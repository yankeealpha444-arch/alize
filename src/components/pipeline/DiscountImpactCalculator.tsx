import { useMemo, useState } from "react";
import { deriveDiscountSeedFromPrompt, runDiscountImpactLogic } from "@/lib/pipeline/discountImpactLogic";
import { formatNumber, formatPercent } from "@/lib/calculator/formatNumber";
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

/**
 * Discount impact: original price, discount %, monthly volume → revenue before/after and insights.
 * Prompt-bound seeds reset when `idea` changes (parent key).
 */
export default function DiscountImpactCalculator({ projectId, idea }: Props) {
  const seed = useMemo(() => deriveDiscountSeedFromPrompt(idea), [idea]);
  const [originalPrice, setOriginalPrice] = useState(seed.originalPrice);
  const [discountPercent, setDiscountPercent] = useState(seed.discountPercent);
  const [estimatedMonthlySales, setEstimatedMonthlySales] = useState(seed.estimatedMonthlySales);
  const [calculated, setCalculated] = useState(false);

  const outcome = useMemo(
    () => runDiscountImpactLogic(originalPrice, discountPercent, estimatedMonthlySales),
    [originalPrice, discountPercent, estimatedMonthlySales],
  );

  const validationMessage = calculated && !outcome.ok ? outcome.error : null;
  const showResults = calculated && outcome.ok;
  const result = outcome.ok ? outcome.result : null;

  const reset = () => {
    setOriginalPrice(seed.originalPrice);
    setDiscountPercent(seed.discountPercent);
    setEstimatedMonthlySales(seed.estimatedMonthlySales);
    setCalculated(false);
  };

  const insights: [string, string] =
    showResults && result
      ? [result.insights.revenue, result.insights.action]
      : ["", ""];

  return (
    <div className={DEDICATED_CALC_ROOT}>
      <DedicatedCalculatorHeader
        kicker="Discount analysis"
        title="Discount Impact Calculator"
        description="Model how a discount changes effective price and monthly revenue at steady volume."
      />

      <div className="space-y-4">
        <DedicatedInputsHeading />
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="rounded-2xl border-border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Original price</CardTitle>
            </CardHeader>
            <CardContent>
              <input
                id={`di-price-${projectId}`}
                type="number"
                min={0.01}
                step={0.01}
                value={originalPrice}
                onChange={(e) => {
                  setOriginalPrice(Number(e.target.value) || 0);
                  setCalculated(false);
                }}
                aria-label="Original price"
                className="w-full h-11 rounded-xl border border-border bg-background px-3 text-lg font-semibold tabular-nums"
              />
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Discount percent</CardTitle>
            </CardHeader>
            <CardContent>
              <input
                id={`di-discount-${projectId}`}
                type="number"
                min={0}
                max={100}
                step={1}
                value={discountPercent}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  setDiscountPercent(Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 0);
                  setCalculated(false);
                }}
                aria-label="Discount percent"
                className="w-full h-11 rounded-xl border border-border bg-background px-3 text-lg font-semibold tabular-nums"
              />
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Estimated monthly sales</CardTitle>
            </CardHeader>
            <CardContent>
              <input
                id={`di-vol-${projectId}`}
                type="number"
                min={0}
                step={1}
                value={estimatedMonthlySales}
                onChange={(e) => {
                  setEstimatedMonthlySales(Math.max(0, Math.floor(Number(e.target.value)) || 0));
                  setCalculated(false);
                }}
                aria-label="Estimated monthly sales"
                className="w-full h-11 rounded-xl border border-border bg-background px-3 text-lg font-semibold tabular-nums"
              />
            </CardContent>
          </Card>
        </div>
      </div>

      <DedicatedCalculatorActions
        calculateLabel="Calculate impact"
        onCalculate={() => setCalculated(true)}
        onReset={reset}
      />

      {validationMessage ? (
        <p
          role="alert"
          className="text-sm text-destructive font-medium rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3"
        >
          {validationMessage}
        </p>
      ) : null}

      {showResults && result ? (
        <DedicatedResultsBlock
          primaryLabel="Revenue after discount"
          primaryValue={formatNumber(result.revenueAfter)}
          secondaryLabel="Revenue change"
          secondaryValue={
            <>
              {result.revenueChangePercent >= 0 ? "+" : ""}
              {formatPercent(result.revenueChangePercent)}
            </>
          }
          insights={insights}
        />
      ) : null}
    </div>
  );
}
