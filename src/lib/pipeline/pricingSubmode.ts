import type { PricingSubmodeId } from "@/lib/pipeline/types";

function norm(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

/** Full profit-margin calculator (units, total profit, insights) — stricter than generic margin_calculator. */
export function isProfitMarginPrompt(prompt: string): boolean {
  const h = norm(prompt);
  return (
    /\bprofit margin\b/.test(h) ||
    /\bprofit per unit\b/.test(h) ||
    /\btotal profit\b/.test(h) ||
    /\bmargin percentage\b/.test(h) ||
    /\bcalculate profit\b/.test(h) ||
    (/\bselling price per unit\b/.test(h) && /\bcost per unit\b/.test(h)) ||
    (/\bprofit\b/.test(h) && /\bmargin\b/.test(h) && /\bcalculator\b/.test(h))
  );
}

/**
 * Binds pricing_calculator prompts to a specific template + logic bundle.
 * Evaluated on the full current prompt so switching ideas always picks the right UI.
 */
export function resolvePricingSubmode(prompt: string): PricingSubmodeId {
  const h = norm(prompt);

  if (
    /\b(discount|discounted)\b/.test(h) &&
    (/\b(impact|revenue|percent|percentage)\b/.test(h) || /\bcalculator\b/.test(h))
  ) {
    return "discount_impact";
  }
  if (
    /\b(revenue before|revenue after|percentage revenue|discount percent)\b/.test(h) ||
    /\bcalculate impact\b/.test(h) ||
    /\bdiscount impact\b/.test(h)
  ) {
    return "discount_impact";
  }

  if (
    /\b(break[\s-]?even|breakeven)\b/.test(h) ||
    /\bcalculate break[\s-]?even\b/.test(h) ||
    (/\bfixed costs?\b/.test(h) && /\b(cost per unit|units sold|expected (number of )?units)\b/.test(h)) ||
    (/\bcost per unit\b/.test(h) && /\b(expected (number of )?units sold|break[\s-]?even)\b/.test(h)) ||
    (/\bexpected (number of )?units sold\b/.test(h) && /\b(fixed costs?|break[\s-]?even)\b/.test(h))
  ) {
    return "break_even";
  }

  if (
    /\b(competitor|competition|comparison)\b/.test(h) &&
    /\b(position|checker|compare|price position|versus|vs\.?)\b/.test(h)
  ) {
    return "competitor_position";
  }

  if (/\b(pricing confidence|confidence score)\b/.test(h) || (/\bconfidence\b/.test(h) && /\bcalculator\b/.test(h))) {
    return "pricing_confidence";
  }

  if (isProfitMarginPrompt(prompt)) return "profit_margin";

  if (/\bcost[\s-]?plus\b/.test(h) || /\bcost plus pricing\b/.test(h)) return "cost_plus_pricing";

  if (/\bunit revenue\b/.test(h) || (/\brevenue per unit\b/.test(h) && /\bcalculator\b/.test(h))) {
    return "unit_revenue";
  }

  if (/\bmarkup\b/.test(h) && /\bcalculator\b/.test(h)) return "markup";

  if (/\bmargin\b/.test(h) && /\bcalculator\b/.test(h)) return "margin_calculator";
  if (/\b(price change|simulate|simulator)\b/.test(h)) return "price_change_simulator";

  return "competitor_position";
}
