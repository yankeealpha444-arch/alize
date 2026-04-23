import { describe, expect, it } from "vitest";
import { buildYouTubeShortsGrowthHookProductFrame, detectArchetypeFromIdea } from "@/lib/mvp/productFraming";

describe("detectArchetypeFromIdea", () => {
  it("maps keyword families", () => {
    expect(detectArchetypeFromIdea("analytics dashboard for growth")).toBe("dashboard");
    expect(detectArchetypeFromIdea("marketplace for used bikes with search")).toBe("marketplace");
    expect(detectArchetypeFromIdea("loan payment calculator")).toBe("tool");
    expect(detectArchetypeFromIdea("write hooks and captions for reels")).toBe("generator");
    expect(detectArchetypeFromIdea("step by step coach for beginners")).toBe("assistant");
  });
});

describe("buildYouTubeShortsGrowthHookProductFrame", () => {
  it("uses generator archetype and growth framing", () => {
    const f = buildYouTubeShortsGrowthHookProductFrame("anything", "small creators");
    expect(f.archetype).toBe("generator");
    expect(f.target_user).toBe("small creators");
    expect(f.product_name.length).toBeGreaterThan(0);
  });
});
