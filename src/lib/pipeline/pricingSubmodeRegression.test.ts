import { describe, expect, it } from "vitest";
import { resolvePricingSubmode } from "@/lib/pipeline/pricingSubmode";
import { runPipeline } from "@/lib/pipeline/runPipeline";
import { runDiscountImpactLogic } from "@/lib/pipeline/discountImpactLogic";
import { runBreakEvenLogic } from "@/lib/pipeline/breakEvenLogic";
import { runProfitMarginLogic, shouldShowProfitMarginUnitsInput } from "@/lib/pipeline/profitMarginLogic";
import { validateProfitMarginSubmodeContract } from "@/lib/pipeline/outputContractValidator";

describe("pricing submode routing (prompt → submode)", () => {
  it("Discount Impact Calculator → discount_impact", () => {
    const prompt = "Discount Impact Calculator";
    expect(resolvePricingSubmode(prompt)).toBe("discount_impact");
    const r = runPipeline(prompt);
    expect(r.intent.primary_category).toBe("pricing_tool");
    expect(r.pricingSubmode).toBe("discount_impact");
    expect(r.uiKind).toBe("pricing_premium");
    expect(r.logic).toBeNull();
  });

  it("Competitor Price Position Checker → competitor_position", () => {
    const prompt = "Competitor Price Position Checker";
    expect(resolvePricingSubmode(prompt)).toBe("competitor_position");
    const r = runPipeline(prompt);
    expect(r.pricingSubmode).toBe("competitor_position");
    expect(r.uiKind).toBe("pricing_premium");
    expect(r.logic).not.toBeNull();
  });

  it("Pricing Confidence Calculator → pricing_confidence", () => {
    const prompt = "Pricing Confidence Calculator";
    expect(resolvePricingSubmode(prompt)).toBe("pricing_confidence");
    const r = runPipeline(prompt);
    expect(r.pricingSubmode).toBe("pricing_confidence");
    expect(r.uiKind).toBe("pricing_premium");
    expect(r.logic).not.toBeNull();
  });

  it("Break Even Price Calculator → break_even", () => {
    const prompt = "Break Even Price Calculator";
    expect(resolvePricingSubmode(prompt)).toBe("break_even");
    const r = runPipeline(prompt);
    expect(r.intent.primary_category).toBe("pricing_tool");
    expect(r.pricingSubmode).toBe("break_even");
    expect(r.uiKind).toBe("pricing_premium");
    expect(r.logic).toBeNull();
  });

  it("Profit Margin Calculator → profit_margin", () => {
    const prompt = "Profit Margin Calculator";
    expect(resolvePricingSubmode(prompt)).toBe("profit_margin");
    const r = runPipeline(prompt);
    expect(r.intent.primary_category).toBe("pricing_tool");
    expect(r.pricingSubmode).toBe("profit_margin");
    expect(r.uiKind).toBe("pricing_premium");
    expect(r.logic).toBeNull();
    expect(validateProfitMarginSubmodeContract(prompt).ok).toBe(true);
  });
});

describe("break even logic (formulas)", () => {
  it("computes total cost, break-even price per unit, and revenue at break-even", () => {
    const fixed = 1000;
    const cpu = 4;
    const units = 200;
    const o = runBreakEvenLogic(fixed, cpu, units);
    expect(o.ok).toBe(true);
    if (!o.ok) return;
    expect(o.result.totalCost).toBe(1000 + 4 * 200);
    expect(o.result.breakEvenPricePerUnit).toBeCloseTo(o.result.totalCost / units, 8);
    expect(o.result.totalRevenueAtBreakEven).toBeCloseTo(o.result.totalCost, 8);
  });

  it("returns validation when expected units sold is zero", () => {
    const o = runBreakEvenLogic(100, 5, 0);
    expect(o.ok).toBe(false);
    if (o.ok) return;
    expect(o.error.length).toBeGreaterThan(0);
  });
});

describe("profit margin input contract", () => {
  it("hides units unless the prompt asks for volume/units/total profit", () => {
    expect(shouldShowProfitMarginUnitsInput("Profit Margin Calculator")).toBe(false);
    expect(shouldShowProfitMarginUnitsInput("Profit margin with estimated units sold")).toBe(true);
    expect(shouldShowProfitMarginUnitsInput("Calculate total profit at selling price per unit")).toBe(true);
  });
});

describe("profit margin logic (formulas)", () => {
  it("computes profit per unit, total profit, and margin % on selling price", () => {
    const o = runProfitMarginLogic(100, 25, 80);
    expect(o.ok).toBe(true);
    if (!o.ok) return;
    expect(o.result.profitPerUnit).toBe(75);
    expect(o.result.totalProfit).toBe(6000);
    expect(o.result.profitMarginPercent).toBeCloseTo(75, 5);
  });

  it("rejects zero selling price", () => {
    const o = runProfitMarginLogic(0, 10, 5);
    expect(o.ok).toBe(false);
  });
});

describe("discount impact logic (formulas)", () => {
  it("computes discounted price, revenue before/after, and percent change", () => {
    const original = 100;
    const discount = 20;
    const units = 50;
    const out = runDiscountImpactLogic(original, discount, units);
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.result.discountedPrice).toBe(80);
    expect(out.result.revenueBefore).toBe(5000);
    expect(out.result.revenueAfter).toBe(4000);
    expect(out.result.revenueChangePercent).toBeCloseTo(-20, 5);
  });

  it("rejects non-positive original price", () => {
    const out = runDiscountImpactLogic(0, 10, 10);
    expect(out.ok).toBe(false);
  });
});
