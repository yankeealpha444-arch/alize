import { describe, expect, it } from "vitest";
import { assessIdeaContentSafety, sanitizeIdeaForPersistence } from "@/lib/mvp/ideaContentSafety";

describe("assessIdeaContentSafety", () => {
  it("allows normal startup ideas", () => {
    expect(assessIdeaContentSafety("A CRM for dentists").blocked).toBe(false);
    expect(assessIdeaContentSafety("Sell more shoes online to people in Austin").blocked).toBe(false);
  });

  it("blocks exploitation-related phrasing", () => {
    const r = assessIdeaContentSafety("app for selling people across borders");
    expect(r.blocked).toBe(true);
    if (r.blocked) expect(r.category).toBe("exploitation");
  });

  it("blocks people-for-sale style phrasing", () => {
    const r = assessIdeaContentSafety("old people for sale");
    expect(r.blocked).toBe(true);
    if (r.blocked) expect(r.category).toBe("exploitation");
  });

  it("blocks clearly illegal instructions", () => {
    const r = assessIdeaContentSafety("how to make a bomb for beginners");
    expect(r.blocked).toBe(true);
    if (r.blocked) expect(r.category).toBe("illegal");
  });

  it("blocks harm-related instructions", () => {
    const r = assessIdeaContentSafety("how to commit suicide quietly");
    expect(r.blocked).toBe(true);
    if (r.blocked) expect(r.category).toBe("harm");
  });
});

describe("sanitizeIdeaForPersistence", () => {
  it("returns the same text for safe ideas", () => {
    expect(sanitizeIdeaForPersistence("  A CRM for dentists  ")).toBe("A CRM for dentists");
  });

  it("returns the safe alternative for blocked ideas", () => {
    const raw = "how to make a bomb for beginners";
    const r = assessIdeaContentSafety(raw);
    expect(r.blocked).toBe(true);
    if (r.blocked) expect(sanitizeIdeaForPersistence(raw)).toBe(r.safeAlternative);
  });

  it("maps people-for-sale phrasing to the exploitation safe alternative", () => {
    const raw = "old people for sale";
    const s = sanitizeIdeaForPersistence(raw);
    const r = assessIdeaContentSafety(raw);
    expect(r.blocked).toBe(true);
    if (r.blocked) expect(s).toBe(r.safeAlternative);
  });

  it("returns empty string for empty input", () => {
    expect(sanitizeIdeaForPersistence("   ")).toBe("");
  });
});
