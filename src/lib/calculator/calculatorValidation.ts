/** Domain-aware copy for validation failures — no calculation, no misleading output. */

export const CalculatorMessages = {
  NUMERIC_REQUIRED: "Please enter valid numeric values.",
  ORIGINAL_PRICE_POSITIVE: "Original price must be greater than zero.",
  SELLING_PRICE_POSITIVE: "Selling price must be greater than zero to calculate margin.",
  REVENUE_DENOMINATOR: "Revenue must be greater than zero to calculate this percentage.",
  UNITS_NON_NEGATIVE: "Units sold must be zero or higher.",
  DISCOUNT_RANGE: "Discount percent must be between 0 and 100.",
  COST_NON_NEGATIVE: "Cost per unit cannot be negative.",
  FIXED_COSTS_NON_NEGATIVE: "Fixed costs cannot be negative.",
  MARKUP_ON_COST_POSITIVE: "Cost per unit must be greater than zero for markup on cost.",
  MUST_BE_FINITE: "Please enter valid numeric values.",
  PRICES_MUST_BE_POSITIVE: "Current and new price must be greater than zero.",
} as const;

export function isValidNonNegativeFinite(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n) && n >= 0;
}

export function isValidPositiveFinite(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n) && n > 0;
}
