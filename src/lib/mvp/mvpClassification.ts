import type { MvpBuilderConfig, MvpTemplateId } from "@/lib/mvp/types";
import type { ToolSubtypeId } from "@/lib/mvp/toolTemplateSubtype";
import type { WorkflowSubtypeId } from "@/lib/mvp/workflowTemplateSubtype";
import { detectToolSubtype, getIdeaTextForToolTemplate } from "@/lib/mvp/toolTemplateSubtype";
import { detectWorkflowSubtype } from "@/lib/mvp/workflowTemplateSubtype";
import { isCarouselTesterContext } from "@/lib/mvp/carouselTester";
import { isReelPerformanceLabContext } from "@/lib/mvp/reelPerformanceLab";
import { TEMPLATE_HOOK_GENERATOR } from "@/lib/internalTemplates";
import { sanitizeIdeaForPersistence } from "@/lib/mvp/ideaContentSafety";
import { isVideoClipperProductIdea, isVideoContentUrlInput } from "@/lib/mvp/videoClipperDetection";
import { getVideoMvpProject } from "@/lib/videoMvpProject";

const FEED =
  /(\b(browse|scroll|discover|feed|catalog)\b)|(view items|compare items|click items)/i;

/** Legacy hints — evaluated only after feed/workflow gates; never forces workflow. */
const LEGACY_TOOL_HINTS =
  /\b(generate|improve|edit|convert|clip|upload|transform|process)\b/i;

/**
 * RULE A — FORCE TOOL: these keywords always yield TOOL (evaluated on combined text).
 */
const RULE_A_FORCE_TOOL =
  /\b(optimize|improve|improver|rewrite|rewrites|generat|variations?|versions?|tester|compare|compar(e|ison|ing|ator)|select\s+best)\b/i;

/**
 * RULE B — input → action → output / variations (tool-shaped products, not sequential workflows).
 */
const RULE_B_INPUT_OUTPUT_TOOL =
  /\b(optimizer|lab|generator|hooks?|a\/b|ab test|thread optimizer|carousel tester|thumbnail tester|caption improver|output variations|pick\s+(a\s+)?winner|side[- ]by[- ]side)\b/i;

/**
 * RULE C — WORKFLOW only for true sequential / scheduling / onboarding style products.
 * Never match generic “workflow” / “steps” alone — those collide with tools.
 */
const RULE_C_WORKFLOW_STRICT =
  /\b(post scheduler|content scheduler|email scheduler|publish(ing)? scheduler|scheduler|scheduling|calendar planner|content calendar|onboarding(\s+flow)?|multi[- ]step(\s+form)?|submission flow|sequential (form|review|approval)|approval pipeline)\b/i;

export type ToolRenderVariant = "default" | "carousel_tester" | "reel_lab" | "video_clipper";

/** Stable default when classification or segmentation throws — avoids blank preview screens. */
export function getSafeFallbackMvpClassification(): MvpClassification {
  return {
    templateId: "TOOL_TEMPLATE",
    toolSubtypeId: "generic",
    workflowSubtypeId: null,
    toolRenderVariant: "default",
    debugTypeLabel: "TOOL",
    debugSubtypeLabel: "generic",
  };
}

export interface MvpClassification {
  templateId: MvpTemplateId;
  toolSubtypeId: ToolSubtypeId | null;
  workflowSubtypeId: WorkflowSubtypeId | null;
  toolRenderVariant: ToolRenderVariant;
  debugTypeLabel: "TOOL" | "WORKFLOW" | "FEED";
  /** Subtype id(s) for verification, e.g. text_tool, scheduler_workflow */
  debugSubtypeLabel: string;
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

function combinedHaystack(idea: string, productName: string): string {
  return normalize(`${productName} ${idea}`);
}

/**
 * Single source of truth for MVP template selection. Subtype is derived after template is fixed.
 * RULE D: if RULE A or B matches, workflow is never returned.
 */
export function classifyMvp(idea: string, productName: string): MvpClassification {
  const haystack = combinedHaystack(idea, productName);

  const emptyToolSubtype = (): MvpClassification => ({
    templateId: "TOOL_TEMPLATE",
    toolSubtypeId: "generic",
    workflowSubtypeId: null,
    toolRenderVariant: "default",
    debugTypeLabel: "TOOL",
    debugSubtypeLabel: "generic",
  });

  if (!haystack) {
    return emptyToolSubtype();
  }

  // Hard routing rule: known social video URLs always map to video clipper.
  if (isVideoContentUrlInput(idea) || isVideoContentUrlInput(productName)) {
    return {
      templateId: "TOOL_TEMPLATE",
      toolSubtypeId: "video_tool",
      workflowSubtypeId: null,
      toolRenderVariant: "video_clipper",
      debugTypeLabel: "TOOL",
      debugSubtypeLabel: "video_clipper",
    };
  }

  if (RULE_A_FORCE_TOOL.test(haystack) || RULE_B_INPUT_OUTPUT_TOOL.test(haystack)) {
    return buildToolClassification(idea, productName);
  }

  if (FEED.test(haystack)) {
    return {
      templateId: "FEED_TEMPLATE",
      toolSubtypeId: null,
      workflowSubtypeId: null,
      toolRenderVariant: "default",
      debugTypeLabel: "FEED",
      debugSubtypeLabel: "feed",
    };
  }

  if (RULE_C_WORKFLOW_STRICT.test(haystack)) {
    const wf = detectWorkflowSubtype(productName, idea);
    return {
      templateId: "WORKFLOW_TEMPLATE",
      toolSubtypeId: null,
      workflowSubtypeId: wf,
      toolRenderVariant: "default",
      debugTypeLabel: "WORKFLOW",
      debugSubtypeLabel: wf,
    };
  }

  if (LEGACY_TOOL_HINTS.test(haystack)) {
    return buildToolClassification(idea, productName);
  }

  return buildToolClassification(idea, productName);
}

function buildToolClassification(idea: string, productName: string): MvpClassification {
  const toolSubtypeId = detectToolSubtype(productName, idea);
  let toolRenderVariant: ToolRenderVariant = "default";
  if (isCarouselTesterContext(productName, idea)) toolRenderVariant = "carousel_tester";
  else if (isReelPerformanceLabContext(productName, idea)) toolRenderVariant = "reel_lab";

  return {
    templateId: "TOOL_TEMPLATE",
    toolSubtypeId,
    workflowSubtypeId: null,
    toolRenderVariant,
    debugTypeLabel: "TOOL",
    debugSubtypeLabel: toolSubtypeId,
  };
}

export function productNameFromIdea(idea: string): string {
  const words = idea.trim().split(/\s+/).slice(0, 4).join(" ");
  return words || "My MVP";
}

const fromProjectCache = new Map<string, { inputKey: string; result: MvpClassification }>();

const VIDEO_CLIPPER_CLASSIFICATION: MvpClassification = {
  templateId: "TOOL_TEMPLATE",
  toolSubtypeId: "video_tool",
  workflowSubtypeId: null,
  toolRenderVariant: "video_clipper",
  debugTypeLabel: "TOOL",
  debugSubtypeLabel: "video_clipper",
};

/** Hook Generator surface vs AI Video Clipper (long-form → social clips). */
export function getHookGeneratorMvpClassification(idea: string = "", projectId?: string): MvpClassification {
  if (projectId && getVideoMvpProject(projectId)) {
    return VIDEO_CLIPPER_CLASSIFICATION;
  }
  const safe = sanitizeIdeaForPersistence(idea.trim());
  if (isVideoContentUrlInput(safe) || isVideoClipperProductIdea(safe)) {
    return VIDEO_CLIPPER_CLASSIFICATION;
  }
  return {
    templateId: "TOOL_TEMPLATE",
    toolSubtypeId: "text_tool",
    workflowSubtypeId: null,
    toolRenderVariant: "default",
    debugTypeLabel: "TOOL",
    debugSubtypeLabel: "hook_generator",
  };
}

/**
 * Reads current project idea + derives product name (same as Idea page). The only entry point for previews/routes.
 * Cached per project for stable references (e.g. useSyncExternalStore).
 */
export function classifyMvpFromProject(projectId: string): MvpClassification {
  const idea = getIdeaTextForToolTemplate(projectId);
  const productName = productNameFromIdea(idea);
  const inputKey = `${idea}::${productName}::mvp_v2::vmvp_${getVideoMvpProject(projectId) ? "1" : "0"}`;
  const hit = fromProjectCache.get(projectId);
  if (hit && hit.inputKey === inputKey) return hit.result;
  const result = getHookGeneratorMvpClassification(idea, projectId);
  fromProjectCache.set(projectId, { inputKey, result });
  return result;
}

/** @deprecated Use classifyMvp — kept for a stable import path. */
export function decideMvpTemplate(idea: string): MvpTemplateId {
  return classifyMvp(idea, productNameFromIdea(idea)).templateId;
}

/** Persistable config aligned with classification (for analytics / legacy readers). */
export function mvpBuilderConfigFromClassification(idea: string, c: MvpClassification): MvpBuilderConfig {
  const safe = sanitizeIdeaForPersistence(idea.trim());
  const basis = safe.length > 0 ? safe : " ";
  return {
    templateId: c.templateId,
    productName: productNameFromIdea(basis),
    decidedAt: new Date().toISOString(),
  };
}

/** Fixed Hook Generator template metadata stored with the project (preview + analytics). */
export function mvpBuilderConfigHookGenerator(idea: string): MvpBuilderConfig {
  const trimmed = idea.trim();
  const safe = sanitizeIdeaForPersistence(trimmed);
  const basis = safe.length > 0 ? safe : " ";
  return {
    templateId: "TOOL_TEMPLATE",
    productName: productNameFromIdea(basis),
    decidedAt: new Date().toISOString(),
    hookTemplateName: TEMPLATE_HOOK_GENERATOR.template_name,
    vertical: TEMPLATE_HOOK_GENERATOR.vertical,
  };
}

/** Founder preview persistence: hook generator vs video clipper (no hook template metadata). */
export function mvpBuilderConfigForFounderPreview(idea: string): MvpBuilderConfig {
  const trimmed = idea.trim();
  const safe = sanitizeIdeaForPersistence(trimmed);
  if (isVideoClipperProductIdea(safe)) {
    const basis = safe.length > 0 ? safe : " ";
    return {
      templateId: "TOOL_TEMPLATE",
      productName: productNameFromIdea(basis),
      decidedAt: new Date().toISOString(),
    };
  }
  return mvpBuilderConfigHookGenerator(idea);
}
