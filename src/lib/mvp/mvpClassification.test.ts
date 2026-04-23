import { describe, expect, it } from "vitest";
import { classifyMvp, productNameFromIdea } from "@/lib/mvp/mvpClassification";

function classify(idea: string) {
  const pn = productNameFromIdea(idea);
  return classifyMvp(idea, pn);
}

describe("classifyMvp", () => {
  it("Twitter Thread Optimizer → TOOL", () => {
    const c = classify("Twitter Thread Optimizer");
    expect(c.templateId).toBe("TOOL_TEMPLATE");
    expect(c.debugTypeLabel).toBe("TOOL");
  });

  it("Instagram Carousel Tester → TOOL", () => {
    const c = classify("Instagram Carousel Tester");
    expect(c.templateId).toBe("TOOL_TEMPLATE");
    expect(c.debugTypeLabel).toBe("TOOL");
  });

  it("AI Thumbnail Tester → TOOL", () => {
    const c = classify("AI Thumbnail Tester");
    expect(c.templateId).toBe("TOOL_TEMPLATE");
    expect(c.debugTypeLabel).toBe("TOOL");
  });

  it("Instagram Post Scheduler → WORKFLOW", () => {
    const c = classify("Instagram Post Scheduler");
    expect(c.templateId).toBe("WORKFLOW_TEMPLATE");
    expect(c.debugTypeLabel).toBe("WORKFLOW");
    expect(c.workflowSubtypeId).toBe("scheduler_workflow");
  });
});
