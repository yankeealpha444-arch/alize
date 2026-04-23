import { describe, expect, it } from "vitest";
import { getDetectedToolCount, parseMultiPrompt } from "@/lib/pipeline/multiPromptParser";
import { segmentInputToToolSpecs, validateBatchToolSegmentation } from "@/lib/pipeline/toolSegmentation";

describe("batch tool segmentation (detect → specs → validation)", () => {
  it("keeps specs aligned with parse for 4 numbered tools", () => {
    const text = `1 Profit Margin Calculator
2 Discount Impact Calculator
3 Break Even Price Calculator
4 Markup Calculator`;
    const specs = segmentInputToToolSpecs(text);
    expect(specs).toHaveLength(4);
    expect(getDetectedToolCount(text)).toBe(4);
    const v = validateBatchToolSegmentation(text, specs);
    expect(v.ok).toBe(true);
    expect(v.detectedCount).toBe(4);
    expect(v.specCount).toBe(4);
  });

  it("fails validation when spec list is corrupted vs parse", () => {
    const text = "A\nB";
    const bad = [{ toolId: "tool_1", rawPrompt: "wrong" }];
    const v = validateBatchToolSegmentation(text, bad);
    expect(v.ok).toBe(false);
    expect(v.reasons.length).toBeGreaterThan(0);
  });

  it("parses four TOOL START/TOOL END sections", () => {
    const text = `TOOL START
Profit Margin Calculator
TOOL END
TOOL START
Discount Impact Calculator
TOOL END
TOOL START
Break Even Price Calculator
TOOL END
TOOL START
Markup Calculator
TOOL END`;
    expect(parseMultiPrompt(text)).toHaveLength(4);
    const specs = segmentInputToToolSpecs(text);
    expect(validateBatchToolSegmentation(text, specs).ok).toBe(true);
  });
});
