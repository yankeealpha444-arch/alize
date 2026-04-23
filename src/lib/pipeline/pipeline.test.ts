import { describe, expect, it } from "vitest";
import { runPipeline, formatPipelineReport } from "@/lib/pipeline/runPipeline";

const PROMPTS = [
  "Pricing Confidence Calculator",
  "Competitor Price Position Checker",
  "Cold DM Improver",
] as const;

describe("MVP generation pipeline (deterministic)", () => {
  it("classifies and routes test prompts", () => {
    for (const p of PROMPTS) {
      const r = runPipeline(p);
      expect(r.intent.app_type).toBe("tool_app");
      expect(r.validation.ok).toBe(true);
      // eslint-disable-next-line no-console
      console.log("\n---\n" + formatPipelineReport(r) + "\n");
    }

    const pricing = runPipeline("Pricing Confidence Calculator");
    expect(pricing.intent.primary_category).toBe("pricing_tool");
    expect(pricing.pricingSubmode).toBe("pricing_confidence");
    expect(pricing.uiKind).toBe("pricing_premium");
    expect(pricing.logic).not.toBeNull();
    expect(pricing.logic!.pricingConfidenceScore).toBeGreaterThanOrEqual(0);
    expect(pricing.logic!.pricingConfidenceScore).toBeLessThanOrEqual(100);
    expect(pricing.route.composed).toBe(false);
    expect(pricing.composed.blocks.length).toBeGreaterThan(0);

    const competitor = runPipeline("Competitor Price Position Checker");
    expect(competitor.intent.secondary_category).toBe("comparison_tool");
    expect(competitor.pricingSubmode).toBe("competitor_position");
    expect(competitor.uiKind).toBe("pricing_premium");

    const discountImpact = runPipeline("Discount Impact Calculator");
    expect(discountImpact.pricingSubmode).toBe("discount_impact");
    expect(discountImpact.uiKind).toBe("pricing_premium");
    expect(discountImpact.logic).toBeNull();

    const breakEven = runPipeline("Break Even Price Calculator");
    expect(breakEven.pricingSubmode).toBe("break_even");
    expect(breakEven.uiKind).toBe("pricing_premium");
    expect(breakEven.logic).toBeNull();

    const profitMargin = runPipeline("Profit Margin Calculator");
    expect(profitMargin.pricingSubmode).toBe("profit_margin");
    expect(profitMargin.uiKind).toBe("pricing_premium");
    expect(profitMargin.logic).toBeNull();
    expect(profitMargin.validation.ok).toBe(true);

    const dm = runPipeline("Cold DM Improver");
    expect(dm.intent.primary_category).toBe("messaging_tool");
    expect(dm.intent.blocked_categories.includes("text_improver")).toBe(false);
    expect(dm.uiKind).toBe("standard_tool");
    expect(dm.logic).toBeNull();
  });
});
