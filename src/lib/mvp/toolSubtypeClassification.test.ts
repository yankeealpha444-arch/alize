import { describe, expect, it } from "vitest";
import { classifyMvp, productNameFromIdea } from "@/lib/mvp/mvpClassification";
import {
  detectToolSubtype,
  isDedicatedSegmentCalculatorSubtype,
  matchesStructuredUtilityTextToolIntent,
} from "@/lib/mvp/toolTemplateSubtype";
import { detectTextToolProductIntent } from "@/lib/mvp/textToolProductUi";

function subtypeForPrompt(fullIdea: string) {
  const pn = productNameFromIdea(fullIdea);
  return {
    detect: detectToolSubtype(pn, fullIdea),
    mvp: classifyMvp(fullIdea, pn).toolSubtypeId,
  };
}

describe("tool subtype classification (pricing vs video)", () => {
  it("Competitor Price Position Checker → pricing family, never video_tool", () => {
    const idea = "Build an MVP called Competitor Price Position Checker";
    const { detect, mvp } = subtypeForPrompt(idea);
    expect(detect).toBe("comparison_calculator");
    expect(mvp).toBe("comparison_calculator");
    expect(detect).not.toBe("video_tool");
  });

  it("Pricing Confidence Calculator → pricing_calculator", () => {
    const idea = "Build an MVP called Pricing Confidence Calculator";
    const { detect, mvp } = subtypeForPrompt(idea);
    expect(detect).toBe("pricing_calculator");
    expect(mvp).toBe("pricing_calculator");
    expect(detect).not.toBe("video_tool");
  });

  it("Cold DM Message Improver → text_tool", () => {
    const idea = "Build an MVP called Cold DM Message Improver";
    const { detect, mvp } = subtypeForPrompt(idea);
    expect(detect).toBe("text_tool");
    expect(mvp).toBe("text_tool");
  });

  it("email subject line improver → text_tool, not generic (structured utility)", () => {
    const idea =
      "Build an email subject line improver tool where I enter a subject line and it generates 3 improved versions";
    expect(matchesStructuredUtilityTextToolIntent(idea)).toBe(true);
    const pn = productNameFromIdea(idea);
    expect(detectToolSubtype(pn, idea)).toBe("text_tool");
    expect(classifyMvp(idea, pn).toolSubtypeId).toBe("text_tool");
    expect(detectTextToolProductIntent(pn, idea)).toBe("subject_line_tool");
  });

  it("value prop about email subject lines → text_tool + subject intent", () => {
    const idea = "I help people improve their email subject lines so more people open their emails";
    const pn = productNameFromIdea(idea);
    expect(detectToolSubtype(pn, idea)).toBe("text_tool");
    expect(detectTextToolProductIntent(pn, idea)).toBe("subject_line_tool");
  });

  it("Video Hook Analyzer → video_tool", () => {
    const idea = "Build an MVP called Video Hook Analyzer";
    const { detect, mvp } = subtypeForPrompt(idea);
    expect(detect).toBe("video_tool");
    expect(mvp).toBe("video_tool");
  });

  it("calculator + short insights lines never → video_tool (regression)", () => {
    const idea = `1 Loan Repayment Calculator
Inputs x
Output y
2 short insights`;
    const pn = productNameFromIdea(idea);
    expect(detectToolSubtype(pn, idea)).not.toBe("video_tool");
  });

  it("loan_calculator uses dedicated preview (SegmentDedicatedCalculator), not pricing list-price UI", () => {
    expect(isDedicatedSegmentCalculatorSubtype("loan_calculator")).toBe(true);
  });

  it("8-tool style segments map to specialized subtypes (not video_tool / generic pricing)", () => {
    const cases: [string, ReturnType<typeof detectToolSubtype>][] = [
      ["Loan Repayment Calculator Inputs loan amount Action Calculate", "loan_calculator"],
      ["ROI Calculator Inputs gain cost Action Calculate", "roi_calculator"],
      ["Time Saved Calculator Inputs hours rate Action Calculate", "time_value_calculator"],
      ["Pricing Tier Selector Inputs plans Action Select tier", "pricing_tier_selector"],
      ["Conversion Rate Calculator Inputs visitors conversions Action Calculate", "conversion_rate_calculator"],
      ["GST Calculator Inputs amount rate Action Calculate", "gst_calculator"],
      ["Profit Margin Calculator Inputs revenue cost Action Calculate", "profit_margin_calculator"],
      ["Break Even Calculator Inputs fixed cost units Action Calculate", "break_even_calculator"],
    ];
    for (const [idea, expected] of cases) {
      const pn = productNameFromIdea(idea);
      expect(detectToolSubtype(pn, idea), idea).toBe(expected);
      expect(detectToolSubtype(pn, idea)).not.toBe("video_tool");
    }
  });
});
