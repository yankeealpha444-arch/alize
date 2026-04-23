import { describe, expect, it } from "vitest";
import { safeSegmentDisplayTitle, segmentDisplayTitle } from "@/lib/pipeline/segmentDisplayTitle";

describe("segmentDisplayTitle", () => {
  it("prefers text before Inputs on one line", () => {
    const raw =
      "Revenue Calculator Inputs Price per unit Number of units sold Action Button Calculate Revenue Output Total revenue 2 short insights";
    expect(segmentDisplayTitle(raw)).toBe("Revenue Calculator");
  });

  it("uses first line when Inputs is on the next line", () => {
    const raw = `Profit Margin Calculator
Inputs
Selling price per unit`;
    expect(segmentDisplayTitle(raw)).toBe("Profit Margin Calculator");
  });

  it("strips leading index", () => {
    expect(segmentDisplayTitle("3 Break Even Price Calculator\nInputs\nx")).toBe("Break Even Price Calculator");
  });
});

describe("safeSegmentDisplayTitle", () => {
  it("falls back to Tool N when empty", () => {
    expect(safeSegmentDisplayTitle("", 2)).toBe("Tool 3");
  });
});
