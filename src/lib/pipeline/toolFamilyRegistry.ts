import type { PipelineRunResult } from "@/lib/pipeline/types";

/**
 * High-level domain families for routing, analytics, and extension (new submodes per family).
 * Maps from existing `primary_category` + route — no breaking change to `AppIntent`.
 */
export type ToolDomainFamilyId =
  | "pricing_calculator_family"
  | "comparison_tool_family"
  | "writing_tool_family"
  | "video_tool_family"
  | "analysis_tool_family"
  | "marketing_tool_family"
  | "generic_tool_family";

const PRICING = /pricing|price|margin|discount|markup|revenue|cost plus|break even|confidence score/i;
const COMPARISON = /competitor|comparison|compare|position|versus|vs\.?/i;
const WRITING = /message|dm|improver|rewrite|headline|caption|copy|hook text/i;
const VIDEO = /video|clip|reel|hook analyzer|thumbnail/i;
const MARKETING = /conversion|uplift|ab test|split test|campaign/i;

/**
 * Deterministic family from a full pipeline result (post classifier + router).
 */
export function resolveToolDomainFamily(r: PipelineRunResult): ToolDomainFamilyId {
  const p = r.prompt;
  const cat = r.intent.primary_category;

  if (cat === "pricing_tool" || PRICING.test(p)) return "pricing_calculator_family";
  if (cat === "comparison_tool" || (COMPARISON.test(p) && !PRICING.test(p))) return "comparison_tool_family";
  if (MARKETING.test(p)) return "marketing_tool_family";
  if (cat === "messaging_tool" || WRITING.test(p)) return "writing_tool_family";
  if (VIDEO.test(p)) return "video_tool_family";
  if (/\b(analy|metric|score|report)\b/i.test(p)) return "analysis_tool_family";
  return "generic_tool_family";
}
