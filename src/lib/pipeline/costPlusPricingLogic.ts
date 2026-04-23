export function deriveCostPlusSeedFromPrompt(prompt: string): { costPerUnit: number; markupPercent: number } {
  const nums = prompt.match(/\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  if (nums.length >= 2) return { costPerUnit: nums[0], markupPercent: Math.min(500, nums[1]) };
  if (nums.length === 1) return { costPerUnit: nums[0], markupPercent: 40 };
  return { costPerUnit: 12, markupPercent: 35 };
}

export type CostPlusLogicOutcome =
  | {
      ok: true;
      costPerUnit: number;
      markupPercentOnCost: number;
      markupAmount: number;
      sellingPrice: number;
      insights: { cost: string; price: string; action: string };
    }
  | { ok: false; error: string };

/** markup_amount = cost × (markup%/100); selling_price = cost + markup_amount */
export function runCostPlusPricingLogic(costPerUnit: number, markupPercentOnCost: number): CostPlusLogicOutcome {
  const c = Math.max(0, costPerUnit);
  const m = Math.max(0, markupPercentOnCost);
  if (c <= 0) {
    return { ok: false, error: "Cost per unit must be greater than zero." };
  }
  const markupAmount = c * (m / 100);
  const sellingPrice = c + markupAmount;
  return {
    ok: true,
    costPerUnit: c,
    markupPercentOnCost: m,
    markupAmount,
    sellingPrice,
    insights: {
      cost: `Cost base is ${c.toFixed(2)}; markup at ${m.toFixed(1)}% on cost adds ${markupAmount.toFixed(2)}.`,
      price: `Implied selling price is ${sellingPrice.toFixed(2)} before fees and discounts.`,
      action: "Validate this price against willingness-to-pay; adjust markup% if demand is elastic.",
    },
  };
}
