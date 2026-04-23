import { describe, expect, it } from "vitest";
import { runPricingTierComparison } from "@/lib/pipeline/pricingTierSelectorLogic";

describe("runPricingTierComparison", () => {
  it("picks lowest price as best value; diff vs selected", () => {
    const r = runPricingTierComparison(29, 79, 199, "enterprise");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.bestValuePlan).toBe("basic");
    expect(r.priceDifferenceVsBest).toBeCloseTo(199 - 29, 5);
  });

  it("tie on price prefers Basic", () => {
    const r = runPricingTierComparison(50, 50, 50, "pro");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.bestValuePlan).toBe("basic");
    expect(r.priceDifferenceVsBest).toBe(0);
  });

  it("rejects all zero prices", () => {
    const r = runPricingTierComparison(0, 0, 0, "basic");
    expect(r.ok).toBe(false);
  });
});
