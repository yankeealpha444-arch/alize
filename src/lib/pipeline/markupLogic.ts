export function deriveMarkupSeedFromPrompt(prompt: string): { selling: number; cost: number } {
  const nums = prompt.match(/\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  if (nums.length >= 2) return { selling: nums[0], cost: nums[1] };
  if (nums.length === 1) return { selling: Math.max(10, nums[0]), cost: nums[0] * 0.55 };
  return { selling: 99, cost: 45 };
}

export type MarkupLogicOutcome =
  | {
      ok: true;
      sellingPricePerUnit: number;
      costPerUnit: number;
      markupAmount: number;
      markupPercentOnCost: number;
      insights: { margin: string; price: string; action: string };
    }
  | { ok: false; error: string };

/** markup_amount = selling − cost; markup% on cost = (markup_amount / cost) × 100 */
export function runMarkupLogic(sellingPricePerUnit: number, costPerUnit: number): MarkupLogicOutcome {
  const sp = Math.max(0, sellingPricePerUnit);
  const c = Math.max(0, costPerUnit);
  if (c <= 0) {
    return { ok: false, error: "Cost per unit must be greater than zero for markup on cost." };
  }
  const markupAmount = sp - c;
  const markupPercentOnCost = (markupAmount / c) * 100;
  return {
    ok: true,
    sellingPricePerUnit: sp,
    costPerUnit: c,
    markupAmount,
    markupPercentOnCost,
    insights: {
      margin: `Markup amount is ${markupAmount.toFixed(2)} per unit (${markupPercentOnCost.toFixed(1)}% on cost).`,
      price: `Selling at ${sp.toFixed(2)} vs cost ${c.toFixed(2)} leaves ${markupAmount.toFixed(2)} before other overhead.`,
      action: "If markup on cost is thin, raise price or reduce landed cost before scaling volume.",
    },
  };
}
