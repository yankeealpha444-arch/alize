import { describe, expect, it } from "vitest";
import { hasMultipleToolPrompts, parseMultiPrompt } from "@/lib/pipeline/multiPromptParser";
import { runPipeline } from "@/lib/pipeline/runPipeline";

describe("parseMultiPrompt", () => {
  it("returns a single segment for a normal one-tool idea", () => {
    const one = "Discount Impact Calculator";
    expect(parseMultiPrompt(one)).toEqual([one]);
    expect(hasMultipleToolPrompts(one)).toBe(false);
  });

  it("splits numbered lists into independent prompts", () => {
    const text = `1. Pricing Confidence Calculator
2. Competitor Price Position Checker
3. Discount Impact Calculator`;
    const s = parseMultiPrompt(text);
    expect(s).toHaveLength(3);
    expect(s[0]).toContain("Pricing Confidence");
    expect(s[1]).toContain("Competitor Price");
    expect(s[2]).toContain("Discount Impact");
  });

  it("splits numbered lists with a space after the index (no period) — Lovable-style", () => {
    const text = `1 Profit Margin Calculator
2 Discount Impact Calculator
3 Break Even Price Calculator
4 Markup Calculator`;
    const s = parseMultiPrompt(text);
    expect(s).toHaveLength(4);
    expect(s[0].trim()).toMatch(/^Profit Margin Calculator$/);
    expect(s[1].trim()).toMatch(/^Discount Impact Calculator$/);
    expect(s[2].trim()).toMatch(/^Break Even Price Calculator$/);
    expect(s[3].trim()).toMatch(/^Markup Calculator$/);
    expect(hasMultipleToolPrompts(text)).toBe(true);
  });

  it("splits TOOL START / TOOL END blocks (runs before other splitters)", () => {
    const text = `TOOL START
Profit Margin Calculator
Inputs: price, cost
TOOL END
TOOL START
Discount Impact Calculator
TOOL END`;
    const s = parseMultiPrompt(text);
    expect(s).toHaveLength(2);
    expect(s[0]).toContain("Profit Margin");
    expect(s[0]).toContain("Inputs:");
    expect(s[1]).toContain("Discount Impact");
    expect(hasMultipleToolPrompts(text)).toBe(true);
  });

  it("prefers explicit TOOL blocks over a numbered list in the same file", () => {
    const text = `1. This numbered line is ignored when delimiter blocks exist
TOOL START
Alpha Tool
TOOL END`;
    expect(parseMultiPrompt(text)).toEqual(["Alpha Tool"]);
  });

  it("does not treat a year-prefixed line as a numbered tool row", () => {
    const text = `2024 Budget Planner
1. Real Tool`;
    const s = parseMultiPrompt(text);
    expect(s).toHaveLength(1);
    expect(s[0]).toContain("2024 Budget");
  });

  it("splits 11 numbered tools (bulk test shape)", () => {
    const lines: string[] = [];
    const labels = [
      "Pricing Confidence Calculator",
      "Competitor Price Position Checker",
      "Discount Impact Calculator",
      "Break Even Price Calculator",
      "Profit Margin Calculator",
      "Cold DM Improver",
      "Thumbnail Compare Tool",
      "Price Change Simulator",
      "Margin Calculator Lite",
      "Feed Browser",
      "Workflow Scheduler",
    ];
    for (let i = 0; i < 11; i++) {
      lines.push(`${i + 1}. ${labels[i] ?? `Tool ${i + 1}`}`);
    }
    const text = lines.join("\n");
    const s = parseMultiPrompt(text);
    expect(s).toHaveLength(11);
    expect(hasMultipleToolPrompts(text)).toBe(true);
    s.forEach((seg, idx) => {
      expect(seg.length).toBeGreaterThan(3);
      expect(runPipeline(seg).intent.app_type).toBe("tool_app");
    });
    expect(s[10]).toContain("Workflow Scheduler");
  });

  it("splits multiple Build an MVP called blocks", () => {
    const text = `Build an MVP called Alpha Calculator
Build an MVP called Beta Checker`;
    const s = parseMultiPrompt(text);
    expect(s).toHaveLength(2);
    expect(s[0]).toContain("Alpha");
    expect(s[1]).toContain("Beta");
  });

  it("splits repeated Goal: sections", () => {
    const text = `Goal: first tool
Inputs: x
---
Goal: second tool
Inputs: y`;
    const s = parseMultiPrompt(text);
    expect(s.length).toBeGreaterThanOrEqual(2);
  });

  /** Exact UI shape: intro wrapper + four `N TitleCase...` tools; body lines include `3 short insights` (must not split segments). */
  const FOUR_TOOL_CALCULATOR_PAGE_PROMPT = `Build a single scrollable page that contains 4 calculator tools.

Do NOT create multiple pages
Do NOT use tabs
All tools must appear on one page
Each tool must be separate

1 Profit Margin Calculator
Inputs
Selling price per unit
Cost per unit
Action
Button Calculate Profit
Output
Profit per unit
Profit margin percentage
3 short insights

2 Discount Impact Calculator
Inputs
Original price
Discount percent
Action
Button Calculate Impact
Output
Discounted price
Price difference
3 short insights

3 Break Even Price Calculator
Inputs
Fixed costs
Cost per unit
Expected units sold
Action
Button Calculate Break Even
Output
Break even price per unit
Total cost
3 short insights

4 Markup Calculator
Inputs
Cost per unit
Selling price per unit
Action
Button Calculate Markup
Output
Markup amount
Markup percentage
3 short insights`;

  it("regression: 4-tool calculator page prompt (intro + numbered tools, real UI text)", () => {
    const s = parseMultiPrompt(FOUR_TOOL_CALCULATOR_PAGE_PROMPT);
    expect(s).toHaveLength(4);
    expect(hasMultipleToolPrompts(FOUR_TOOL_CALCULATOR_PAGE_PROMPT)).toBe(true);
    const titles = s.map((seg) => seg.trim().split("\n")[0]!.replace(/^\d+\.?\s*/, "").trim());
    expect(titles).toEqual([
      "Profit Margin Calculator",
      "Discount Impact Calculator",
      "Break Even Price Calculator",
      "Markup Calculator",
    ]);
  });

  it("splits 4 tools when headings are pasted on one line (inline expansion)", () => {
    const oneLine = `Intro text here. 1 Profit Margin Calculator Inputs x 2 Discount Impact Calculator Inputs y 3 Break Even Price Calculator Inputs z 4 Markup Calculator Inputs w`;
    const s = parseMultiPrompt(oneLine);
    expect(s).toHaveLength(4);
    expect(s[0]).toContain("Profit Margin Calculator");
    expect(s[3]).toContain("Markup Calculator");
  });

  it("does not treat `3 short insights` as a new tool row", () => {
    const text = `1 Alpha Calculator
Output
3 short insights
2 Beta Calculator`;
    const s = parseMultiPrompt(text);
    expect(s).toHaveLength(2);
    expect(s[0]).toContain("Alpha");
    expect(s[0]).toContain("3 short insights");
    expect(s[1]).toContain("Beta");
  });
});
