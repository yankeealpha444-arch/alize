import { describe, expect, it } from "vitest";
import { generateTenHooks } from "@/lib/hookGeneratorEngine";

describe("generateTenHooks", () => {
  it("returns 10 hooks with three angle labels cycled", () => {
    const idea = "AI fitness coach";
    const hooks = generateTenHooks(idea, {
      niche: "AI fitness coach",
      audience: "Creators and growth focused teams",
    });

    expect(hooks).toHaveLength(10);
    const angles = new Set(hooks.map((h) => h.angle));
    expect(angles.size).toBe(3);
    expect(hooks[0].angle).toBe("Shock / pattern break");
    expect(hooks[1].angle).toBe("Specific result");
    expect(hooks[2].angle).toBe("Contrarian truth");
  });

  it("avoids generic filler phrases and banned SaaS words", () => {
    const hooks = generateTenHooks("AI fitness coach", {
      niche: "AI fitness coach",
      audience: "Creators and growth focused teams",
    });
    const texts = hooks.map((h) => h.text.toLowerCase());

    expect(texts.some((t) => t.includes("creators and growth"))).toBe(false);
    expect(texts.some((t) => t.includes("internet is crowded"))).toBe(false);
    expect(texts.some((t) => t.includes("workflow"))).toBe(false);
    expect(texts.some((t) => t.includes("session"))).toBe(false);
    expect(texts.some((t) => t.includes("consistency"))).toBe(false);

    const ideaTerms = ["ai", "fitness", "coach", "lift", "gym", "rep", "form"];
    const strong = texts.filter((t) => ideaTerms.some((term) => t.includes(term)));
    expect(strong.length).toBeGreaterThanOrEqual(4);

    const unique = new Set(texts);
    expect(unique.size).toBeGreaterThanOrEqual(7);
  });

  it("uses surf-specific language for surf ideas", () => {
    const hooks = generateTenHooks("surf coach app", {
      niche: "surf coaching",
      audience: "beginners",
    });
    const texts = hooks.map((h) => h.text.toLowerCase());
    const surfish = ["wave", "paddle", "surf", "lineup", "takeoff", "beach"];
    const hits = texts.filter((t) => surfish.some((w) => t.includes(w))).length;
    expect(hits).toBeGreaterThanOrEqual(4);
  });

  it("normalizes typos and stays grounded in the fixed instagram-creator phrase", () => {
    const hooks = generateTenHooks("instagram image creater", {
      niche: "instagram image creater",
      audience: "small creators",
    });
    const texts = hooks.map((h) => h.text.toLowerCase());

    expect(texts.some((t) => t.includes("creater"))).toBe(false);
    expect(texts.some((t) => t.includes("instagram") || t.includes("image") || t.includes("hook") || t.includes("feed"))).toBe(
      true,
    );
  });
});
