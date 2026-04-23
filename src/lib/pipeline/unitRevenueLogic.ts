export function deriveUnitRevenueSeedFromPrompt(prompt: string): { pricePerUnit: number; units: number } {
  const nums = prompt.match(/\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  if (nums.length >= 2) return { pricePerUnit: nums[0], units: Math.floor(nums[1]) };
  if (nums.length === 1) return { pricePerUnit: nums[0], units: 100 };
  return { pricePerUnit: 25, units: 200 };
}

export type UnitRevenueLogicOutcome =
  | {
      ok: true;
      pricePerUnit: number;
      numberOfUnitsSold: number;
      totalRevenue: number;
      revenuePerUnit: number;
      insights: { scale: string; unit: string; action: string };
    }
  | { ok: false; error: string };

/** total_revenue = price_per_unit × units; revenue_per_unit = price_per_unit */
export function runUnitRevenueLogic(pricePerUnit: number, numberOfUnitsSold: number): UnitRevenueLogicOutcome {
  const p = Math.max(0, pricePerUnit);
  const u = Math.max(0, numberOfUnitsSold);
  const totalRevenue = p * u;
  const revenuePerUnit = p;
  return {
    ok: true,
    pricePerUnit: p,
    numberOfUnitsSold: u,
    totalRevenue,
    revenuePerUnit,
    insights: {
      scale: `At ${u.toFixed(0)} units, total revenue is ${totalRevenue.toFixed(2)}.`,
      unit: `Revenue per unit stays ${revenuePerUnit.toFixed(2)} at a flat price.`,
      action: "Stress-test volume and price: small price lifts compound across every unit sold.",
    },
  };
}
