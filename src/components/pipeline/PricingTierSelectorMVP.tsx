import { useMemo, useState } from "react";
import { parseNumericSeeds } from "@/lib/pipeline/specializedSegmentLogic";
import { runPricingTierComparison, type PlanId } from "@/lib/pipeline/pricingTierSelectorLogic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DEDICATED_CALC_ROOT,
  DedicatedCalculatorActions,
  DedicatedCalculatorHeader,
  DedicatedInputsHeading,
  DedicatedResultsBlock,
} from "@/components/pipeline/dedicatedCalculatorChrome";

type Props = { projectId: string; idea: string };

function planLabel(id: PlanId): string {
  switch (id) {
    case "basic":
      return "Basic";
    case "pro":
      return "Pro";
    case "enterprise":
      return "Enterprise";
    default:
      return id;
  }
}

export default function PricingTierSelectorMVP({ projectId, idea }: Props) {
  const seed = useMemo(() => {
    const n = parseNumericSeeds(idea, 3);
    if (n.length >= 3) return { basic: n[0], pro: n[1], enterprise: n[2] };
    return { basic: 29, pro: 79, enterprise: 199 };
  }, [idea]);

  const [basicPrice, setBasicPrice] = useState(seed.basic);
  const [proPrice, setProPrice] = useState(seed.pro);
  const [enterprisePrice, setEnterprisePrice] = useState(seed.enterprise);
  const [selectedPlan, setSelectedPlan] = useState<PlanId>("pro");
  const [calculated, setCalculated] = useState(false);

  const outcome = useMemo(
    () => runPricingTierComparison(basicPrice, proPrice, enterprisePrice, selectedPlan),
    [basicPrice, proPrice, enterprisePrice, selectedPlan],
  );

  const show = calculated && outcome.ok;

  const reset = () => {
    setBasicPrice(seed.basic);
    setProPrice(seed.pro);
    setEnterprisePrice(seed.enterprise);
    setSelectedPlan("pro");
    setCalculated(false);
  };

  return (
    <div className={DEDICATED_CALC_ROOT}>
      <DedicatedCalculatorHeader
        kicker="Plans"
        title="Pricing tier selector"
        description="Basic, Pro, and Enterprise prices plus selected plan — best value and price gap."
      />

      <div className="space-y-4">
        <DedicatedInputsHeading />
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="rounded-2xl border-border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Basic price</CardTitle>
            </CardHeader>
            <CardContent>
              <input
                id={`pts-basic-${projectId}`}
                type="number"
                min={0}
                step={0.01}
                value={basicPrice}
                onChange={(e) => {
                  setBasicPrice(Math.max(0, Number(e.target.value) || 0));
                  setCalculated(false);
                }}
                aria-label="Basic price"
                className="w-full h-11 rounded-xl border border-border bg-background px-3 text-lg font-semibold tabular-nums"
              />
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pro price</CardTitle>
            </CardHeader>
            <CardContent>
              <input
                id={`pts-pro-${projectId}`}
                type="number"
                min={0}
                step={0.01}
                value={proPrice}
                onChange={(e) => {
                  setProPrice(Math.max(0, Number(e.target.value) || 0));
                  setCalculated(false);
                }}
                aria-label="Pro price"
                className="w-full h-11 rounded-xl border border-border bg-background px-3 text-lg font-semibold tabular-nums"
              />
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Enterprise price</CardTitle>
            </CardHeader>
            <CardContent>
              <input
                id={`pts-ent-${projectId}`}
                type="number"
                min={0}
                step={0.01}
                value={enterprisePrice}
                onChange={(e) => {
                  setEnterprisePrice(Math.max(0, Number(e.target.value) || 0));
                  setCalculated(false);
                }}
                aria-label="Enterprise price"
                className="w-full h-11 rounded-xl border border-border bg-background px-3 text-lg font-semibold tabular-nums"
              />
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-2xl border-border shadow-sm max-w-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Selected plan</CardTitle>
          </CardHeader>
          <CardContent>
            <select
              id={`pts-sel-${projectId}`}
              value={selectedPlan}
              onChange={(e) => {
                setSelectedPlan(e.target.value as PlanId);
                setCalculated(false);
              }}
              aria-label="Selected plan"
              className="w-full h-11 rounded-xl border border-border bg-background px-3 text-sm font-medium"
            >
              <option value="basic">Basic</option>
              <option value="pro">Pro</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </CardContent>
        </Card>
      </div>

      <DedicatedCalculatorActions
        calculateLabel="Calculate comparison"
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
          primaryLabel="Best value plan"
          primaryValue={
            <div>
              <div className="text-2xl font-bold tracking-tight">{planLabel(outcome.bestValuePlan)}</div>
              <p className="text-sm text-muted-foreground mt-1 tabular-nums">{outcome.bestValuePrice.toFixed(2)} / mo</p>
            </div>
          }
          secondaryLabel="Price difference"
          secondaryValue={
            outcome.priceDifferenceVsBest === 0
              ? "0.00"
              : `${outcome.priceDifferenceVsBest > 0 ? "+" : ""}${outcome.priceDifferenceVsBest.toFixed(2)}`
          }
          insights={[outcome.insight1, outcome.insight2]}
        />
      ) : null}
    </div>
  );
}
