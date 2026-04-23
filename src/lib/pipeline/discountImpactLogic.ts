import type { DiscountImpactResult } from "@/lib/pipeline/types";
import { roundStable } from "@/lib/calculator/formatNumber";
import { CalculatorMessages, isValidNonNegativeFinite, isValidPositiveFinite } from "@/lib/calculator/calculatorValidation";

export function deriveDiscountSeedFromPrompt(prompt: string): {
  originalPrice: number;
  discountPercent: number;
  estimatedMonthlySales: number;
} {
  const nums = prompt.match(/\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  if (nums.length >= 3) {
    return { originalPrice: nums[0], discountPercent: Math.min(90, nums[1]), estimatedMonthlySales: nums[2] };
  }
  if (nums.length >= 1) {
    const p = nums[0];
    return { originalPrice: Math.max(10, p), discountPercent: 15, estimatedMonthlySales: 100 };
  }
  let hash = 0;
  for (let i = 0; i < prompt.length; i++) hash = (hash + prompt.charCodeAt(i) * (i + 1)) % 997;
  return {
    originalPrice: 99 + (hash % 40),
    discountPercent: 10 + (hash % 20),
    estimatedMonthlySales: 80 + (hash % 120),
  };
}

export type DiscountImpactLogicOutcome =
  | { ok: true; result: DiscountImpactResult }
  | { ok: false; error: string };

/**
 * discounted_price = original × (1 − discount%/100)
 * revenue_before = original × units; revenue_after = discounted × units
 * revenue_change% = (after − before) / before × 100  (before > 0)
 */
export function runDiscountImpactLogic(
  originalPrice: number,
  discountPercent: number,
  estimatedMonthlySales: number,
): DiscountImpactLogicOutcome {
  if (!Number.isFinite(originalPrice) || !Number.isFinite(discountPercent) || !Number.isFinite(estimatedMonthlySales)) {
    return { ok: false, error: CalculatorMessages.NUMERIC_REQUIRED };
  }
  if (!isValidPositiveFinite(originalPrice)) {
    return { ok: false, error: CalculatorMessages.ORIGINAL_PRICE_POSITIVE };
  }
  if (!isValidNonNegativeFinite(estimatedMonthlySales)) {
    return { ok: false, error: CalculatorMessages.UNITS_NON_NEGATIVE };
  }
  if (discountPercent < 0 || discountPercent > 100) {
    return { ok: false, error: CalculatorMessages.DISCOUNT_RANGE };
  }
  const dp = Math.min(100, Math.max(0, discountPercent));

  const op = roundStable(originalPrice, 6);
  const units = estimatedMonthlySales;

  const discountedPrice = roundStable(op * (1 - dp / 100), 6);
  const revenueBefore = roundStable(op * units, 6);
  const revenueAfter = roundStable(discountedPrice * units, 6);
  const revenueChangePercent =
    revenueBefore > 0 ? roundStable(((revenueAfter - revenueBefore) / revenueBefore) * 100, 6) : 0;

  const interpretation = `At ${units.toFixed(0)} units/month, a ${dp}% discount moves effective price from ${op} to ${discountedPrice}, changing total monthly revenue by ${revenueChangePercent}% versus list price.`;

  const recommendedNextStep =
    revenueChangePercent < 0
      ? `Model how many extra units you need at ${discountedPrice} to beat ${revenueBefore} total revenue before widening the discount.`
      : `Hold price and test positioning: revenue rises with discount only if volume is truly fixed.`;

  const insights = {
    price: `Your discounted price drops from ${op} to ${discountedPrice} (${dp}% off list).`,
    revenue: `If volume stays at ${units.toFixed(0)} units, monthly revenue moves from ${revenueBefore} to ${revenueAfter} (${revenueChangePercent >= 0 ? "+" : ""}${revenueChangePercent}%).`,
    action:
      "A lower list price per unit only pays off if conversion or volume lifts enough to offset the per-unit revenue drop.",
  };

  return {
    ok: true,
    result: {
      originalPrice: op,
      discountPercent: dp,
      estimatedMonthlySales: units,
      discountedPrice,
      revenueBefore,
      revenueAfter,
      revenueChangePercent,
      interpretation,
      recommendedNextStep,
      insights,
    },
  };
}
