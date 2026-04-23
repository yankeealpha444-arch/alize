import type { PricingSubmodeId } from "@/lib/pipeline/types";

/**
 * Pricing premium UIs that do not use `runPricingLogic` output (`logic` is null in the pipeline).
 * Used for routing and multi-segment preview — keep in sync with `runPipeline` branches.
 */
export const LOGIC_NULL_PREMIUM_SUBMODES: ReadonlySet<PricingSubmodeId> = new Set([
  "discount_impact",
  "break_even",
  "profit_margin",
  "markup",
  "unit_revenue",
  "cost_plus_pricing",
]);

export function isLogicNullPremiumSubmode(sub: PricingSubmodeId | null): boolean {
  return sub !== null && LOGIC_NULL_PREMIUM_SUBMODES.has(sub);
}
