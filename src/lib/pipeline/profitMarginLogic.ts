import type { ProfitMarginResult } from "@/lib/pipeline/types";
import { formatNumber, formatPercent, roundStable } from "@/lib/calculator/formatNumber";
import { CalculatorMessages } from "@/lib/calculator/calculatorValidation";

function norm(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Third field (units/volume) is shown only when the prompt explicitly asks for it.
 * Otherwise the contract is strictly selling price + cost per unit (no hidden unit state for volume).
 */
export function shouldShowProfitMarginUnitsInput(prompt: string): boolean {
  const h = norm(prompt);
  return (
    /\b(units?\s+sold|estimated\s+(number\s+of\s+)?units|number\s+of\s+units)\b/.test(h) ||
    /\b(sales\s+volume|monthly\s+(units|sales))\b/.test(h) ||
    /\b(how\s+many\s+units|quantity\s+of\s+units)\b/.test(h) ||
    /\btotal\s+profit\b/.test(h)
  );
}

export function deriveProfitMarginSeedFromPrompt(prompt: string): {
  sellingPricePerUnit: number;
  costPerUnit: number;
  estimatedUnitsSold: number;
} {
  const nums = prompt.match(/\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  if (nums.length >= 3) {
    return {
      sellingPricePerUnit: nums[0],
      costPerUnit: nums[1],
      estimatedUnitsSold: Math.max(0, Math.floor(nums[2])),
    };
  }
  if (nums.length >= 1) {
    const p = nums[0];
    return {
      sellingPricePerUnit: Math.max(1, p),
      costPerUnit: Math.max(0, p * 0.6),
      estimatedUnitsSold: Math.max(1, Math.floor(p)),
    };
  }
  let hash = 0;
  for (let i = 0; i < prompt.length; i++) hash = (hash + prompt.charCodeAt(i) * (i + 1)) % 997;
  return {
    sellingPricePerUnit: 49 + (hash % 30),
    costPerUnit: 15 + (hash % 20),
    estimatedUnitsSold: 50 + (hash % 150),
  };
}

export type ProfitMarginLogicOutcome =
  | { ok: true; result: ProfitMarginResult }
  | { ok: false; error: string };

/**
 * profit_per_unit = selling_price_per_unit − cost_per_unit
 * total_profit = profit_per_unit × estimated_units_sold
 * profit_margin_percent = (profit_per_unit / selling_price_per_unit) × 100
 */
export function runProfitMarginLogic(
  sellingPricePerUnit: number,
  costPerUnit: number,
  estimatedUnitsSold: number,
  options?: { includeUnits: boolean },
): ProfitMarginLogicOutcome {
  const includeUnits = options?.includeUnits ?? true;
  const sp = roundStable(sellingPricePerUnit, 4);
  if (!Number.isFinite(sp) || sp <= 0) {
    return {
      ok: false,
      error: CalculatorMessages.SELLING_PRICE_POSITIVE,
    };
  }

  if (!Number.isFinite(costPerUnit) || costPerUnit < 0) {
    return { ok: false, error: CalculatorMessages.COST_NON_NEGATIVE };
  }

  const cpu = roundStable(costPerUnit, 4);
  const unitsRaw = includeUnits ? estimatedUnitsSold : 1;
  const units = roundStable(unitsRaw, 4);
  if (includeUnits && (!Number.isFinite(units) || units < 0)) {
    return { ok: false, error: "Estimated number of units sold must be zero or positive." };
  }

  const profitPerUnit = roundStable(sp - cpu, 4);
  const totalProfit = roundStable(profitPerUnit * units, 4);
  const profitMarginPercent = roundStable((profitPerUnit / sp) * 100, 4);
  const grossMarginPercentOnPrice = profitMarginPercent;

  const interpretation = `Each ${formatNumber(sp)} sale keeps ${formatNumber(profitPerUnit)} after ${formatNumber(cpu)} cost — a ${formatPercent(profitMarginPercent)} margin on revenue.`;

  const recommendedNextStep =
    profitMarginPercent < 20
      ? `Pressure-test ${formatNumber(cpu)} cost or lift price: sub-20% revenue margins leave little room for ads and returns.`
      : `Protect this margin: any discount must be earned back by volume or higher basket size.`;

  const insights: ProfitMarginResult["insights"] = includeUnits
    ? {
        profit: `You make ${formatNumber(profitPerUnit)} profit on each unit sold (${formatPercent(profitMarginPercent)} of selling price).`,
        scale: `At ${formatNumber(units)} units sold, total profit would be ${formatNumber(totalProfit)}.`,
        action:
          "If margin is too low, increase price, reduce unit cost, or improve conversion before discounting.",
      }
    : {
        profit: `You make ${formatNumber(profitPerUnit)} profit on each unit sold (${formatPercent(profitMarginPercent)} of selling price).`,
        scale: `COGS is ${formatPercent(roundStable((cpu / sp) * 100, 4))} of list price; contribution before other variable costs is ${formatPercent(profitMarginPercent)}.`,
        action:
          "If margin is too low, increase price, reduce unit cost, or improve conversion before discounting.",
      };

  return {
    ok: true,
    result: {
      sellingPricePerUnit: sp,
      costPerUnit: cpu,
      estimatedUnitsSold: units,
      profitPerUnit,
      totalProfit,
      profitMarginPercent,
      grossMarginPercentOnPrice,
      interpretation,
      recommendedNextStep,
      insights,
    },
  };
}
