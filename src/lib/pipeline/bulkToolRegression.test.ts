import { describe, expect, it } from "vitest";
import { resolvePricingSubmode } from "@/lib/pipeline/pricingSubmode";
import { runBulkToolPipelineFromRawInput, runBulkToolPipelineFromSpecs } from "@/lib/pipeline/bulkToolPipeline";
import { segmentInputToToolSpecs } from "@/lib/pipeline/toolSegmentation";
import { resolveToolDomainFamily } from "@/lib/pipeline/toolFamilyRegistry";
import { runPipeline } from "@/lib/pipeline/runPipeline";

const REGRESSION_PROMPTS: { title: string; prompt: string; expectFamily: string; expectPricingSubmode?: string }[] = [
  { title: "Pricing Confidence", prompt: "Pricing Confidence Calculator", expectFamily: "pricing_calculator_family", expectPricingSubmode: "pricing_confidence" },
  { title: "Competitor", prompt: "Competitor Price Position Checker", expectFamily: "pricing_calculator_family", expectPricingSubmode: "competitor_position" },
  { title: "Discount", prompt: "Discount Impact Calculator", expectFamily: "pricing_calculator_family", expectPricingSubmode: "discount_impact" },
  { title: "Break even", prompt: "Break Even Price Calculator", expectFamily: "pricing_calculator_family", expectPricingSubmode: "break_even" },
  { title: "Profit margin", prompt: "Profit Margin Calculator", expectFamily: "pricing_calculator_family", expectPricingSubmode: "profit_margin" },
  { title: "Markup", prompt: "Markup Calculator", expectFamily: "pricing_calculator_family", expectPricingSubmode: "markup" },
  { title: "Unit revenue", prompt: "Unit Revenue Calculator", expectFamily: "pricing_calculator_family", expectPricingSubmode: "unit_revenue" },
  { title: "Cost plus", prompt: "Cost Plus Pricing Calculator", expectFamily: "pricing_calculator_family", expectPricingSubmode: "cost_plus_pricing" },
  { title: "Cold DM", prompt: "Cold DM Message Improver", expectFamily: "writing_tool_family" },
  { title: "Headline split", prompt: "Headline Split Test Calculator", expectFamily: "marketing_tool_family" },
  { title: "Video hook", prompt: "Video Hook Analyzer", expectFamily: "video_tool_family" },
];

describe("bulk tool regression harness", () => {
  it("classifies each standalone prompt (family + pricing submode)", () => {
    for (const row of REGRESSION_PROMPTS) {
      const p = runPipeline(row.prompt);
      const family = resolveToolDomainFamily(p);
      expect(family, row.title).toBe(row.expectFamily);
      if (row.expectPricingSubmode) {
        expect(p.pricingSubmode, row.title).toBe(row.expectPricingSubmode);
        expect(resolvePricingSubmode(row.prompt), row.title).toBe(row.expectPricingSubmode);
      }
      expect(p.validation.ok, row.title).toBe(true);
    }
  });

  it("bulk run returns one result per spec with structured snapshot", () => {
    const numbered = REGRESSION_PROMPTS.map((r, i) => `${i + 1}. ${r.prompt}`).join("\n");
    const runs = runBulkToolPipelineFromSpecs(segmentInputToToolSpecs(numbered));
    expect(runs.length).toBe(REGRESSION_PROMPTS.length);
    runs.forEach((run, i) => {
      expect(run.toolId).toBe(`tool_${i + 1}`);
      expect(run.pipeline).not.toBeNull();
      expect(run.structured.domainFamily).toBe(REGRESSION_PROMPTS[i].expectFamily);
      if (REGRESSION_PROMPTS[i].expectPricingSubmode) {
        expect(run.structured.submode).toBe(REGRESSION_PROMPTS[i].expectPricingSubmode);
      }
    });
  });

  it("11-numbered bulk paste yields 11 independent tools", () => {
    const lines = Array.from({ length: 11 }, (_, i) => `${i + 1}. ${REGRESSION_PROMPTS[i]?.prompt ?? `Tool ${i + 1}`}`);
    const raw = lines.join("\n");
    const runs = runBulkToolPipelineFromRawInput(raw);
    expect(runs).toHaveLength(11);
    expect(runs.every((r) => r.pipeline && r.toolId.startsWith("tool_"))).toBe(true);
  });
});
