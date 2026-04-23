import { describe, expect, it } from "vitest";
import { buildSubjectLinePreviewVariants, mockTextRewriteVersions } from "@/lib/mvp/textToolProductUi";

describe("buildSubjectLinePreviewVariants", () => {
  it("produces 3 clearly different subject lines for a simple meeting prompt", () => {
    const input = "meeting tomorrow at 10am";
    const cards = buildSubjectLinePreviewVariants(input);
    expect(cards).toHaveLength(3);
    const texts = cards.map((c) => c.text.trim());
    expect(new Set(texts.map((t) => t.toLowerCase())).size).toBe(3);
    expect(texts[0].toLowerCase()).not.toBe(input.toLowerCase());
    expect(texts[1].toLowerCase()).not.toBe(input.toLowerCase());
    expect(texts[2].toLowerCase()).not.toBe(input.toLowerCase());
    expect(texts.some((t) => t.toLowerCase().includes("reminder"))).toBe(true);
    expect(texts.some((t) => /\?/.test(t))).toBe(true);
    expect(texts.some((t) => /don't miss|miss/i.test(t))).toBe(true);
  });

  it("subject_line_tool intent uses the same generator via mockTextRewriteVersions", () => {
    const cards = mockTextRewriteVersions("subject_line_tool", "meeting tomorrow at 10am");
    expect(cards).toHaveLength(3);
    expect(new Set(cards.map((c) => c.text)).size).toBe(3);
  });
});
