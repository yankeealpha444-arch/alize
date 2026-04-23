import type { BreakEvenResult } from "@/lib/pipeline/types";

export function deriveBreakEvenSeedFromPrompt(prompt: string): {
  fixedCosts: number;
  costPerUnit: number;
  expectedUnitsSold: number;
} {
  const nums = prompt.match(/\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  if (nums.length >= 3) {
    return { fixedCosts: nums[0], costPerUnit: nums[1], expectedUnitsSold: Math.floor(nums[2]) };
  }
  if (nums.length >= 1) {
    const n = nums[0];
    return { fixedCosts: Math.max(100, n * 10), costPerUnit: Math.max(1, n * 0.2), expectedUnitsSold: Math.max(1, Math.floor(n)) };
  }
  let hash = 0;
  for (let i = 0; i < prompt.length; i++) hash = (hash + prompt.charCodeAt(i) * (i + 1)) % 997;
  return {
    fixedCosts: 2000 + (hash % 3000),
    costPerUnit: 8 + (hash % 12),
    expectedUnitsSold: 80 + (hash % 120),
  };
}

export type BreakEvenLogicOutcome =
  | { ok: true; result: BreakEvenResult }
  | { ok: false; error: string };

/**
 * total_cost = fixed_costs + (cost_per_unit × expected_units_sold)
 * break_even_price_per_unit = total_cost / expected_units_sold
 * total_revenue_at_break_even = break_even_price_per_unit × expected_units_sold (= total_cost at break-even)
 */
export function runBreakEvenLogic(
  fixedCosts: number,
  costPerUnit: number,
  expectedUnitsSold: number,
): BreakEvenLogicOutcome {
  const fixed = Math.max(0, fixedCosts);
  const cpu = Math.max(0, costPerUnit);
  const units = expectedUnitsSold;

  if (!Number.isFinite(units) || units <= 0) {
    return {
      ok: false,
      error: "Expected number of units sold must be greater than zero to compute a break-even price per unit.",
    };
  }

  const totalCost = fixed + cpu * units;
  const breakEvenPricePerUnit = totalCost / units;
  const totalRevenueAtBreakEven = breakEvenPricePerUnit * units;

  const insights: BreakEvenResult["insights"] = {
    cost: `Your total cost to recover is ${totalCost.toFixed(2)} across ${units.toFixed(0)} units.`,
    pricing: `You need to charge at least ${breakEvenPricePerUnit.toFixed(2)} per unit to break even.`,
    action:
      "If this price feels too high, reduce unit cost, fixed costs, or increase expected sales volume.",
  };

  return {
    ok: true,
    result: {
      fixedCosts: fixed,
      costPerUnit: cpu,
      expectedUnitsSold: units,
      totalCost,
      breakEvenPricePerUnit,
      totalRevenueAtBreakEven,
      insights,
    },
  };
}
