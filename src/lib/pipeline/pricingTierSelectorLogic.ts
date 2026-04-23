export type PlanId = "basic" | "pro" | "enterprise";

const PLAN_ORDER: PlanId[] = ["basic", "pro", "enterprise"];

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

/**
 * Best value = lowest monthly price (ties: Basic → Pro → Enterprise).
 * Price difference = selected plan price minus best-value plan price.
 */
export function runPricingTierComparison(
  basicPrice: number,
  proPrice: number,
  enterprisePrice: number,
  selectedPlan: PlanId,
):
  | {
      ok: true;
      bestValuePlan: PlanId;
      bestValuePrice: number;
      selectedPrice: number;
      /** Selected minus best (positive = you pay more than the cheapest tier). */
      priceDifferenceVsBest: number;
      insight1: string;
      insight2: string;
    }
  | { ok: false; error: string } {
  const prices: Record<PlanId, number> = {
    basic: Math.max(0, basicPrice),
    pro: Math.max(0, proPrice),
    enterprise: Math.max(0, enterprisePrice),
  };

  const positive = PLAN_ORDER.filter((p) => prices[p] > 0);
  if (positive.length === 0) {
    return { ok: false, error: "Enter at least one plan price greater than zero." };
  }

  let best: PlanId = positive[0];
  let bestPrice = prices[best];
  for (const p of PLAN_ORDER) {
    if (prices[p] <= 0) continue;
    if (prices[p] < bestPrice || (prices[p] === bestPrice && PLAN_ORDER.indexOf(p) < PLAN_ORDER.indexOf(best))) {
      best = p;
      bestPrice = prices[p];
    }
  }

  const selectedPrice = prices[selectedPlan];
  const priceDifferenceVsBest = selectedPrice - bestPrice;

  const insight1 = `${planLabel(best)} at ${bestPrice.toFixed(2)} is the best value on price alone (lowest monthly).`;
  const insight2 =
    selectedPlan === best
      ? `Your selected plan matches the lowest-priced tier — no premium over the minimum.`
      : `${planLabel(selectedPlan)} at ${selectedPrice.toFixed(2)} is ${Math.abs(priceDifferenceVsBest).toFixed(2)} ${priceDifferenceVsBest > 0 ? "above" : "below"} ${planLabel(best)} on monthly cost.`;

  return {
    ok: true,
    bestValuePlan: best,
    bestValuePrice: bestPrice,
    selectedPrice,
    priceDifferenceVsBest,
    insight1,
    insight2,
  };
}
