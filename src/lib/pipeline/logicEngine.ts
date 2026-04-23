import type { LogicEngineOutput, MarketPositionLabel, PricingInputs } from "@/lib/pipeline/types";
import { roundStable } from "@/lib/calculator/formatNumber";

/**
 * Derives deterministic demo inputs from prompt when user has not filled a form yet.
 */
export function derivePricingInputsFromPrompt(prompt: string): PricingInputs {
  const nums = prompt.match(/\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  if (nums.length >= 4) {
    return {
      userPrice: nums[0],
      competitorPrices: nums.slice(1, 4),
      marginPercent: 52,
      segmentMatch: true,
    };
  }
  if (nums.length >= 1) {
    const p = nums[0];
    return {
      userPrice: p,
      competitorPrices: [Math.round(p * 0.88), Math.round(p * 1.02), Math.round(p * 1.18)],
      marginPercent: 48,
      segmentMatch: true,
    };
  }
  let hash = 0;
  for (let i = 0; i < prompt.length; i++) hash = (hash + prompt.charCodeAt(i) * (i + 1)) % 997;
  const base = 40 + (hash % 50);
  return {
    userPrice: base + 20,
    competitorPrices: [base, base + 15, base + 35],
    marginPercent: 55,
    segmentMatch: true,
  };
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

/**
 * Pricing Confidence Score + market position + gaps + 3 insights (deterministic).
 */
export function runPricingLogic(inputs: PricingInputs): LogicEngineOutput {
  const { userPrice, competitorPrices, marginPercent, segmentMatch } = inputs;
  const valid = competitorPrices.filter((n) => Number.isFinite(n) && n > 0);
  const avg = valid.length ? valid.reduce((a, b) => a + b, 0) / valid.length : userPrice;
  const minP = valid.length ? Math.min(...valid) : userPrice * 0.9;
  const maxP = valid.length ? Math.max(...valid) : userPrice * 1.1;

  let score = 50;
  if (userPrice >= minP && userPrice <= maxP) score += 15;
  if (marginPercent > 50) score += 10;
  if (segmentMatch) score += 10;
  if (userPrice > avg * 1.3) score -= 20;
  if (userPrice < avg * 0.7) score -= 20;
  score = clamp(Math.round(score), 0, 100);

  let marketPosition: MarketPositionLabel;
  if (userPrice < avg * 0.8) marketPosition = "budget";
  else if (userPrice <= avg * 1.2) marketPosition = "mid_range";
  else marketPosition = "premium";

  const priceGapAbsolute = roundStable(userPrice - avg, 8);
  const priceGapPercent =
    avg !== 0 && Number.isFinite(avg) ? roundStable(((userPrice - avg) / avg) * 100, 8) : 0;

  const positionInsight = `Your price sits in the ${marketPosition.replace("_", " ")} band versus a ${valid.length}-point competitor sample (avg ${avg.toFixed(0)}).`;
  let riskInsight: string;
  if (userPrice > avg * 1.3) {
    riskInsight = "Risk: priced materially above the competitor average—expect stronger proof or packaging.";
  } else if (userPrice < avg * 0.7) {
    riskInsight = "Risk: priced far below average—check margin and perceived quality.";
  } else {
    riskInsight = "Risk: moderate vs peers; watch win rate and discounting.";
  }
  const actionInsight =
    score >= 75
      ? "Action: keep the price and test offer clarity before changing numbers."
      : "Action: run a 2-week test with one change (price, packaging, or segment).";

  const recommendedAction =
    marketPosition === "premium"
      ? "Validate willingness-to-pay with 5 buyer calls before moving price down."
      : marketPosition === "budget"
        ? "Raise price slightly or add a tier to protect margin without losing position."
        : "Tighten the comparison story: why you vs alternatives at this midpoint.";

  return {
    pricingConfidenceScore: score,
    marketPosition,
    avgCompetitorPrice: roundStable(avg, 8),
    userPrice: roundStable(userPrice, 8),
    priceGapAbsolute,
    priceGapPercent,
    insights: {
      position: positionInsight,
      risk: riskInsight,
      action: actionInsight,
    },
    recommendedAction,
  };
}

/** Placeholder logic for fallback UI when contract validation fails. */
export function runPricingLogicFallback(): LogicEngineOutput {
  return runPricingLogic({
    userPrice: 99,
    competitorPrices: [79, 95, 120],
    marginPercent: 45,
    segmentMatch: false,
  });
}
