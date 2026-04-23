import { describe, expect, it } from "vitest";
import { classifyMvp, productNameFromIdea } from "@/lib/mvp/mvpClassification";
import { detectToolSubtype, matchesAnalysisTextResponseIntent } from "@/lib/mvp/toolTemplateSubtype";
import { segmentInputToToolSpecs } from "@/lib/pipeline/toolSegmentation";

/** Representative long strategy / evaluation prompt (no calculator structure). */
const STRATEGY_ANALYSIS_PROMPT = `You are an expert product strategist and growth engineer.

Evaluate and respond to this strategy in the context of an early-stage B2B SaaS startup.

Answer in one concise paragraph only. Do not use bullet points.`;

const POSITIONING_PARAGRAPH_PROMPT =
  "Write a concise product positioning paragraph for my startup selling analytics to mid-market teams.";

describe("analysis / text_response classification", () => {
  it("strategy evaluation prompt → text_response, not generic", () => {
    const pn = productNameFromIdea(STRATEGY_ANALYSIS_PROMPT);
    expect(detectToolSubtype(pn, STRATEGY_ANALYSIS_PROMPT)).toBe("text_response");
    expect(classifyMvp(STRATEGY_ANALYSIS_PROMPT, pn).toolSubtypeId).toBe("text_response");
    expect(matchesAnalysisTextResponseIntent(`${pn} ${STRATEGY_ANALYSIS_PROMPT}`)).toBe(true);
  });

  it("positioning paragraph prompt → text_response", () => {
    const pn = productNameFromIdea(POSITIONING_PARAGRAPH_PROMPT);
    expect(detectToolSubtype(pn, POSITIONING_PARAGRAPH_PROMPT)).toBe("text_response");
  });

  it("real calculator prompt → still specialized subtype, not text_response", () => {
    const idea = `1 Loan Repayment Calculator
Inputs x
Output y
2 short insights`;
    const pn = productNameFromIdea(idea);
    expect(detectToolSubtype(pn, idea)).toBe("loan_calculator");
    expect(matchesAnalysisTextResponseIntent(idea)).toBe(false);
  });

  it("Pricing Confidence Calculator product line → pricing_calculator, not text_response", () => {
    const idea = "Build an MVP called Pricing Confidence Calculator";
    const pn = productNameFromIdea(idea);
    expect(detectToolSubtype(pn, idea)).toBe("pricing_calculator");
  });

  it("strategy-only prompt stays single segment (regression guard)", () => {
    const specs = segmentInputToToolSpecs(STRATEGY_ANALYSIS_PROMPT);
    expect(specs).toHaveLength(1);
  });
});
