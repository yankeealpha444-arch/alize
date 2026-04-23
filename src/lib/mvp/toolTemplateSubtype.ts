import type { MvpBuilderConfig, ToolSubtypeUiConfig } from "@/lib/mvp/types";
import { getProjectData } from "@/lib/projectData";
import { sanitizeIdeaForPersistence } from "@/lib/mvp/ideaContentSafety";
import { resolveTextToolUi, TEXT_TOOL_DEFAULT_UI } from "@/lib/mvp/textToolProductUi";

/** Tool layout variant for TOOL_TEMPLATE preview — driven by idea / product name keywords. */
export type ToolSubtypeId =
  | "title_thumbnail_test_tool"
  | "thumbnail_compare_tool"
  | "image_tool"
  | "video_tool"
  /** Deterministic pricing / calculator tool (preview may use pipeline premium UI). */
  | "pricing_tool"
  | "pricing_calculator"
  | "comparison_calculator"
  /** Narrow calculator intents — resolved before broad pricing_tool / pricing_calculator (per-segment safe). */
  | "break_even_calculator"
  | "profit_margin_calculator"
  | "gst_calculator"
  | "conversion_rate_calculator"
  | "loan_calculator"
  | "roi_calculator"
  | "time_value_calculator"
  | "pricing_tier_selector"
  | "text_tool"
  /** Evaluation / writing / strategy prompts — not calculator-shaped (dedicated preview). */
  | "text_response"
  | "generic";

export type { ToolSubtypeUiConfig } from "@/lib/mvp/types";

/** Copy for analysis-style prompts; live preview uses AnalysisToolMVP. */
const TEXT_RESPONSE_UI: ToolSubtypeUiConfig = {
  guidingLine: "Enter your topic and generate a focused response.",
  inputLabel: "What do you want a response about?",
  primaryAction: "Generate response",
  resultTitle: "Response",
  saveSecondary: "Copy",
  trySecondary: "Reset",
  inputPlaceholder: "Paste what you want reviewed or answered…",
  emptyResultHint: "",
  emptyRunMessage: "",
};

const GENERIC: ToolSubtypeUiConfig = {
  guidingLine: "Describe your input, calculate, and review the preview output.",
  inputLabel: "What are you working on?",
  primaryAction: "Calculate preview",
  resultTitle: "Results",
  saveSecondary: "Copy",
  trySecondary: "Reset",
  inputPlaceholder: "Describe what you want to try.",
  emptyResultHint: "",
  emptyRunMessage: "Add a short description, then calculate a preview.",
};

const PRICING_FAMILY: ToolSubtypeUiConfig = {
  guidingLine: "",
  surfaceTitle: "Pricing tool",
  surfaceSubtitle: "Compare price position and confidence vs the market",
  inputLabel: "List price",
  primaryAction: "Calculate pricing",
  resultTitle: "Results",
  saveSecondary: "Copy",
  trySecondary: "Reset",
  inputPlaceholder: "Enter price and competitor context…",
  emptyResultHint: "",
  emptyRunMessage: "Add inputs, then calculate.",
};

const BY_SUBTYPE: Record<Exclude<ToolSubtypeId, "generic" | "text_tool">, ToolSubtypeUiConfig> = {
  pricing_tool: { ...PRICING_FAMILY, surfaceTitle: "Pricing tool" },
  pricing_calculator: { ...PRICING_FAMILY, surfaceTitle: "Pricing calculator" },
  comparison_calculator: { ...PRICING_FAMILY, surfaceTitle: "Comparison calculator" },
  break_even_calculator: {
    ...PRICING_FAMILY,
    surfaceTitle: "Break Even Calculator",
    surfaceSubtitle: "Units and revenue to cover fixed and variable costs",
  },
  profit_margin_calculator: {
    ...PRICING_FAMILY,
    surfaceTitle: "Profit Margin Calculator",
    surfaceSubtitle: "Margin on selling price from unit economics",
  },
  gst_calculator: {
    ...PRICING_FAMILY,
    surfaceTitle: "GST / tax calculator",
    surfaceSubtitle: "Tax-inclusive and exclusive amounts",
  },
  conversion_rate_calculator: {
    ...PRICING_FAMILY,
    surfaceTitle: "Conversion rate calculator",
    surfaceSubtitle: "Visitors, conversions, and funnel rate",
  },
  loan_calculator: {
    ...PRICING_FAMILY,
    surfaceTitle: "Loan repayment calculator",
    surfaceSubtitle: "Principal, rate, and term",
  },
  roi_calculator: {
    ...PRICING_FAMILY,
    surfaceTitle: "ROI calculator",
    surfaceSubtitle: "Return on investment from gains vs cost",
  },
  time_value_calculator: {
    ...PRICING_FAMILY,
    surfaceTitle: "Time saved calculator",
    surfaceSubtitle: "Hours and value of time recovered",
  },
  pricing_tier_selector: {
    ...PRICING_FAMILY,
    surfaceTitle: "Pricing tier selector",
    surfaceSubtitle: "Compare plans and pick a tier",
  },
  title_thumbnail_test_tool: {
    guidingLine: "",
    surfaceTitle: "Title & Thumbnail Tester",
    surfaceSubtitle: "Find your strongest combo before you publish",
    textInputLabel: "Video Title",
    textInputPlaceholder: "Enter your video title…",
    imageUploadLabel: "Thumbnails",
    inputLabel: "Thumbnails",
    uploadHelper: "Add up to 3 thumbnails",
    uploadAcceptedText: "PNG, JPG, WebP • Up to 3 images",
    nextStepsBullets: [
      "Enter a title and thumbnails you’d really use.",
      "Compare combinations and pick what earns the click.",
    ],
    primaryAction: "Calculate combinations",
    resultTitle: "Results",
    saveSecondary: "Copy",
    trySecondary: "Reset",
    inputPlaceholder: "",
    emptyResultHint: "",
    emptyRunMessage: "Enter a video title and add thumbnails, then calculate.",
  },
  thumbnail_compare_tool: {
    guidingLine: "",
    surfaceTitle: "Thumbnail Tester",
    surfaceSubtitle: "Find your best thumbnail before posting",
    uploadHelper: "Drop thumbnails here or click to browse",
    uploadAcceptedText: "PNG, JPG, WebP • Up to 3 images",
    nextStepsBullets: [
      "Upload thumbnails you’d actually post.",
      "Compare side by side and tap Select winner.",
    ],
    inputLabel: "Upload Thumbnails",
    primaryAction: "Calculate comparison",
    resultTitle: "Results",
    saveSecondary: "Copy",
    trySecondary: "Reset",
    inputPlaceholder: "",
    emptyResultHint: "",
    emptyRunMessage: "Add at least one thumbnail, then calculate.",
  },
  image_tool: {
    guidingLine: "Improve your images to get more engagement",
    inputLabel: "Upload your image",
    primaryAction: "Calculate image",
    resultTitle: "Results",
    saveSecondary: "Copy",
    trySecondary: "Reset",
    inputPlaceholder: "Drop your image or describe what to improve",
    emptyResultHint: "",
    emptyRunMessage: "Add an image or a short note, then calculate.",
  },
  video_tool: {
    guidingLine: "Turn long videos into short clips that grab attention",
    inputLabel: "What video are you creating?",
    primaryAction: "Calculate clip",
    resultTitle: "Results",
    saveSecondary: "Copy",
    trySecondary: "Reset",
    inputPlaceholder: "Paste a link or describe your clip idea",
    emptyResultHint: "",
    emptyRunMessage: "Paste a link or describe your clip, then calculate.",
  },
  text_response: {
    ...TEXT_RESPONSE_UI,
    surfaceTitle: "Written response",
    surfaceSubtitle: "Focused analysis and answers",
  },
};

/** Priority 1 — checked first; stop on first match at tier level. */
const TEXT_PHRASES = ["post text", "cold dm", "cold outreach"] as const;
const TEXT_SUBSTRINGS = [
  "caption",
  "tweet",
  "copy",
  "writing",
  "rewrite",
  "headline",
  "description",
  "outreach",
] as const;

/** Priority 2 — only if text did not match. */
const IMAGE_SUBSTRINGS = ["image", "photo", "picture", "thumbnail", "visual", "instagram image"] as const;

/**
 * Strong pricing / calculator signals — must outrank video, text, and generic.
 */
/**
 * Narrow calculator intents — evaluated **before** broad pricing family detection so
 * GST / loan / ROI / etc. are not swallowed by generic `pricing_calculator`.
 */
export function detectSpecializedCalculatorSubtype(normalizedHaystack: string): ToolSubtypeId | null {
  const h = normalizedHaystack;
  if (!h) return null;

  const cal = /\bcalculator\b/i.test(h);

  const hasBreakEven =
    /\bbreak\s*[- ]?even\b/i.test(h) &&
    (cal || /\b(break\s*even\s+(units|revenue)|fixed\s+costs?)\b/i.test(h));
  if (hasBreakEven) return "break_even_calculator";

  if ((/\bprofit\s+margin\b/i.test(h) && cal) || /\bprofit\s+margin\s+calculator\b/i.test(h)) {
    return "profit_margin_calculator";
  }

  if (/\bgst\b|goods\s+and\s+services\s+tax/i.test(h) && (cal || /\b(inclusive|exclusive|amount|rate)\b/i.test(h))) {
    return "gst_calculator";
  }
  if (/\bvat\b/i.test(h) && cal) return "gst_calculator";
  if (/\btax\s+calculator\b/i.test(h) && !/\bprofit\s+margin\b/i.test(h)) return "gst_calculator";

  if (/\bconversion\s+rate\b/i.test(h) || (/\bvisitors?\b/i.test(h) && /\bconversions?\b/i.test(h))) {
    if (cal || /\brate\b/i.test(h)) return "conversion_rate_calculator";
  }

  if (
    /\bloan\b/i.test(h) &&
    /\b(repayment|amorti[sz]e|interest|mortgage|principal|term|monthly\s+payment)\b/i.test(h)
  ) {
    return "loan_calculator";
  }

  if (/\broi\b/i.test(h) || /\breturn\s+on\s+investment\b/i.test(h)) return "roi_calculator";

  if (/\btime\s+saved\b/i.test(h) || /\bhours?\s+saved\b/i.test(h) || /\bproductivity\s+calculator\b/i.test(h)) {
    return "time_value_calculator";
  }

  if (
    /\bpricing\s+tier\b/i.test(h) ||
    /\btier\s+selector\b/i.test(h) ||
    /\bplan\s+selector\b/i.test(h) ||
    /\b(select|choose)\s+(a\s+)?(pricing\s+)?tier\b/i.test(h)
  ) {
    return "pricing_tier_selector";
  }

  return null;
}

/** Calculator-shaped segments without native video context should never use video_tool. */
function calculatorSegmentResistsVideoShell(h: string): boolean {
  if (!/\bcalculator\b/.test(h)) return false;
  const nativeVideo =
    /\b(video|footage|reel|tiktok|youtube|vimeo|hook analyzer|video\s+hook|clip\s+editor|watch\s+time)\b/.test(h) ||
    /\bshort[- ]form\s+video\b/.test(h);
  if (nativeVideo) return false;
  return true;
}

export function hasStrongPricingSignals(haystack: string): boolean {
  const h = haystack.toLowerCase();
  if (
    /\b(price|pricing|priced|competitor|competitors|competition)\b/.test(h) ||
    /\b(confidence score|numeric score|market position|price gap|percentage difference)\b/.test(h) ||
    /\b(budget|mid[\s-]?range|premium)\b/.test(h) ||
    /\b(analyze position|price position|position checker|competitor price)\b/.test(h) ||
    (/\bcalculator\b/.test(h) && /\b(price|pricing|confidence|margin|competitor)\b/.test(h)) ||
    (/\bcomparison\b|\bcompare\b|\bversus\b|\bvs\.?\b/.test(h) && /\b(price|pricing|competitor|position)\b/.test(h))
  ) {
    return true;
  }
  if (/pricing confidence/i.test(haystack)) return true;
  return false;
}

/**
 * Structured calculator / tool spec lines — not free-form strategy or writing prompts.
 */
export function hasStructuredToolOrCalculatorSignals(haystack: string): boolean {
  const h = normalizeText(haystack);
  if (!h) return false;
  if (detectSpecializedCalculatorSubtype(h)) return true;
  if (/\b(inputs?|outputs?)\s*[:：x×]\s*|\boutput\s+y\b|\baction\s*[:：]\s*calculate\b/i.test(h)) return true;
  if (
    /\b(loan|gst|profit margin|break even|conversion rate|unit revenue|markup)\s+(calculator|calc)\b/i.test(h)
  ) {
    return true;
  }
  return false;
}

/**
 * Long-form evaluation, writing, or strategy prompts without real calculator structure.
 * Runs after specialized + pricing routes, before `text_tool` / `generic`.
 */
export function matchesAnalysisTextResponseIntent(haystack: string): boolean {
  const h = normalizeText(haystack);
  if (!h || h.length < 48) return false;
  if (hasStructuredToolOrCalculatorSignals(h)) return false;

  const analysisLex =
    /\b(evaluate|respond|critique|criticise|analy[sz]e|review|compare|summari[sz]e|explain|defend)\b/i;
  const topicLex =
    /\b(strategy|strategist|positioning|growth plan|go\s*to\s*market|business model|startup|assessment|feedback|product)\b/i;
  const writingLex =
    /\b(write|draft|compose|answer\s+in\s+(one|a|the)|concise\s+paragraph|one\s+paragraph|do\s+not\s+use\s+bullet|no\s+bullet)\b/i;
  const roleLex = /\b(you are an expert|expert product|growth engineer|product strategist)\b/i;

  const hasAnalysis = analysisLex.test(h) || writingLex.test(h) || roleLex.test(h);
  const hasTopic = topicLex.test(h) || roleLex.test(h);

  if (h.length >= 200 && hasAnalysis) return true;
  if (h.length >= 120 && hasAnalysis && hasTopic) return true;
  if (analysisLex.test(h) && topicLex.test(h)) return true;
  if (writingLex.test(h) && /\b(positioning|paragraph|strategy|product|concise)\b/i.test(h)) return true;
  return false;
}

/**
 * Maps pricing signals to a specific pricing-family subtype (never video/text/workflow).
 */
export function detectPricingFamilySubtype(haystack: string): "comparison_calculator" | "pricing_calculator" | "pricing_tool" | null {
  const h = haystack.toLowerCase();
  if (!hasStrongPricingSignals(h)) return null;

  const hasCompetition =
    /\b(competitor|competitors|competition|comparison|compare|versus|vs\.?)\b/.test(h) &&
    /\b(price|pricing|position|market|checker)\b/.test(h);
  if (hasCompetition) return "comparison_calculator";

  const hasCalculatorIntent =
    /\bcalculator\b/.test(h) ||
    /\b(confidence score|numeric score)\b/.test(h) ||
    /pricing confidence/i.test(haystack);
  if (hasCalculatorIntent) return "pricing_calculator";

  return "pricing_tool";
}

/**
 * Video tools only when the prompt clearly implies video — never when pricing signals win.
 * Stricter than before: avoids false positives from loose "clip/short" patterns.
 */
export function matchesExplicitVideoIntent(haystack: string): boolean {
  const h = haystack.toLowerCase();
  if (hasStrongPricingSignals(h)) return false;
  /** "2 short insights" matched `\bshorts?\b` → false video positives; calculator prompts resist video unless native-video terms exist. */
  if (calculatorSegmentResistsVideoShell(h)) return false;

  if (
    /\b(video|videos|footage|record(ing)?|camera|cinematography|tiktok)\b/.test(h) ||
    /\b(upload|watch|stream)\s+video\b/.test(h) ||
    /\bedit(ing)?\s+video\b/.test(h) ||
    /\breels?\b/.test(h) ||
    /\b(youtube|tiktok)\s+shorts\b/.test(h) ||
    /\bvideo\s+(hook|clip|clips?|editor|analyzer|analysis|upload)\b/.test(h) ||
    /\b(hook|clip)\s+analyzer\b/.test(h)
  ) {
    return true;
  }

  if (/\bclips?\b/.test(h)) {
    return /\bvideo\b/.test(h) || /\b(movie|film|reel)\b/.test(h);
  }

  return false;
}

/** @deprecated Use matchesExplicitVideoIntent — kept for older call sites. */
function matchesVideoTier(haystack: string): boolean {
  return matchesExplicitVideoIntent(haystack);
}

/**
 * Refines image_tool into thumbnail_compare_tool when compare / A/B intent is present.
 * Plain “thumbnail” alone stays image_tool (single-image improver).
 */
const THUMBNAIL_COMPARE_SUBSTRINGS = [
  "a/b tester",
  "compare thumbnails",
  "thumbnail test",
  "select winner",
  "best thumbnail",
  "thumbnails",
] as const;

function normalizeText(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

function haystackIncludes(haystack: string, needle: string): boolean {
  return haystack.includes(needle.toLowerCase());
}

/** Title-side keywords for hybrid (word-safe where needed). */
function matchesTitleSideKeyword(h: string): boolean {
  if (/\bheadline\b/.test(h)) return true;
  if (h.includes("video title")) return true;
  if (h.includes("youtube title")) return true;
  if (h.includes("caption title")) return true;
  if (/\btitle\b/.test(h)) return true;
  return false;
}

/** Image-side keywords for hybrid. */
function matchesImageSideKeyword(h: string): boolean {
  if (/\bthumbnails?\b/.test(h)) return true;
  if (/\bimages?\b/.test(h)) return true;
  return false;
}

/**
 * Hybrid: title + image intent (e.g. YouTube title & thumbnail testing).
 * Checked before base text/image/video tiers so it never collapses to a single subtype.
 */
export function matchesTitleThumbnailHybrid(haystack: string): boolean {
  const h = normalizeText(haystack);
  if (!h) return false;
  return matchesTitleSideKeyword(h) && matchesImageSideKeyword(h);
}

function matchesTextTier(h: string): boolean {
  for (const p of TEXT_PHRASES) {
    if (haystackIncludes(h, p)) return true;
  }
  for (const w of TEXT_SUBSTRINGS) {
    if (haystackIncludes(h, w)) return true;
  }
  return false;
}

/**
 * Structured copy / utility tools (subject lines, hooks, variants) — must win over `generic` and
 * over free-form `text_response` when the prompt is clearly tool-shaped.
 */
export function matchesStructuredUtilityTextToolIntent(haystack: string): boolean {
  const h = normalizeText(haystack);
  if (!h || h.length < 10) return false;

  const explicit = [
    /\bemail\s+subject\s+lines?\b/,
    /\bsubject\s+lines?\b/,
    /\bsubject\s+line\s+improver\b/,
    /\bheadline\s+generator\b/,
    /\bhook\s+generator\b/,
    /\bcaption\s+improver\b/,
    /\brewrite\s+post\b/,
    /\brewrite\s+posts\b/,
    /\bimprove\s+(the\s+)?title\b/,
    /\bgenerate\s+variations\b/,
    /\bcopy\s+variants\b/,
    /\bimprover\s+tool\b/,
    /\bgenerate\s+(3\s+)?(improved\s+)?versions\b/,
    /\b3\s+improved\s+versions\b/,
  ];
  if (explicit.some((re) => re.test(h))) return true;

  if (/\bsubject\s+line\b/.test(h) && /\b(improv|generat|variant|version|rewrit|tool|enter|draft)\b/i.test(h)) {
    return true;
  }
  if (/\bemail\b/.test(h) && /\bsubject\b/.test(h) && /\b(improv|generat|open|variant|version|line|lines)\b/i.test(h)) {
    return true;
  }
  if (/\bheadline\b/.test(h) && /\b(generat|improv|rewrit|tool|variant)\b/i.test(h)) return true;
  if (/\bhook\b/.test(h) && /\b(generat|improv|tool|variant|rewrit)\b/i.test(h)) return true;

  return false;
}

function matchesImageTier(h: string): boolean {
  return IMAGE_SUBSTRINGS.some((w) => haystackIncludes(h, w));
}

/** Base tiers only (no hybrid / thumbnail-compare refinements). */
export function detectBaseToolSubtype(
  productName: string,
  ideaText: string,
):
  | "text_tool"
  | "image_tool"
  | "video_tool"
  | "pricing_tool"
  | "pricing_calculator"
  | "comparison_calculator"
  | "break_even_calculator"
  | "profit_margin_calculator"
  | "gst_calculator"
  | "conversion_rate_calculator"
  | "loan_calculator"
  | "roi_calculator"
  | "time_value_calculator"
  | "pricing_tier_selector"
  | "text_response"
  | "generic" {
  const h = normalizeText(`${productName} ${ideaText}`);
  if (!h) return "generic";
  const spec = detectSpecializedCalculatorSubtype(h);
  if (spec) return spec;
  if (matchesStructuredUtilityTextToolIntent(h)) return "text_tool";
  if (matchesAnalysisTextResponseIntent(h)) return "text_response";
  const p = detectPricingFamilySubtype(h);
  if (p) return p;
  if (matchesTextTier(h)) return "text_tool";
  if (matchesImageTier(h)) return "image_tool";
  if (matchesExplicitVideoIntent(h)) return "video_tool";
  return "generic";
}

function matchesThumbnailCompareLayout(haystack: string): boolean {
  return THUMBNAIL_COMPARE_SUBSTRINGS.some((w) => haystackIncludes(haystack, w));
}

/**
 * Full tool subtype for UI.
 * Priority: specialized calculators → text_response (analysis) → pricing family → text → image → video → hybrid.
 */
export function detectToolSubtype(productName: string, ideaText: string): ToolSubtypeId {
  const h = normalizeText(`${productName} ${ideaText}`);
  if (!h) return "generic";

  const specialized = detectSpecializedCalculatorSubtype(h);
  if (specialized) return specialized;

  if (matchesStructuredUtilityTextToolIntent(h)) return "text_tool";

  if (matchesAnalysisTextResponseIntent(h)) return "text_response";

  const pricingSubtype = detectPricingFamilySubtype(h);
  if (pricingSubtype) return pricingSubtype;

  if (matchesTextTier(h)) return "text_tool";

  const hybridEligible = matchesTitleThumbnailHybrid(h);

  if (matchesImageTier(h) && !hybridEligible) {
    return matchesThumbnailCompareLayout(h) ? "thumbnail_compare_tool" : "image_tool";
  }

  if (matchesExplicitVideoIntent(h)) return "video_tool";

  if (hybridEligible) return "title_thumbnail_test_tool";

  return "generic";
}

/**
 * Subtypes that use {@link SegmentDedicatedCalculator} in multi-tool segments — dedicated UI + formulas,
 * not `runPipeline` → PricingPremiumMVP / ToolTemplateMVP.
 */
export const DEDICATED_SEGMENT_CALCULATOR_SUBTYPES = [
  "loan_calculator",
  "roi_calculator",
  "time_value_calculator",
  "conversion_rate_calculator",
  "gst_calculator",
  "profit_margin_calculator",
  "break_even_calculator",
  "pricing_tier_selector",
] as const;

export type DedicatedSegmentCalculatorSubtype = (typeof DEDICATED_SEGMENT_CALCULATOR_SUBTYPES)[number];

export function isDedicatedSegmentCalculatorSubtype(
  id: ToolSubtypeId | null | undefined,
): id is DedicatedSegmentCalculatorSubtype {
  return id != null && (DEDICATED_SEGMENT_CALCULATOR_SUBTYPES as readonly string[]).includes(id);
}

export function getToolTemplateUiConfig(subtype: ToolSubtypeId): ToolSubtypeUiConfig {
  if (subtype === "generic") return GENERIC;
  if (subtype === "text_tool") return TEXT_TOOL_DEFAULT_UI;
  if (subtype === "text_response") return BY_SUBTYPE.text_response;
  return BY_SUBTYPE[subtype];
}

/** Idea string for subtype detection: saved project idea, then localStorage fallback. */
export function getIdeaTextForToolTemplate(projectId: string): string {
  const fromProject = getProjectData(projectId).mvpIdea?.trim() ?? "";
  let raw = "";
  if (fromProject) raw = fromProject;
  else {
    try {
      raw = localStorage.getItem("alize_idea")?.trim() ?? "";
    } catch {
      raw = "";
    }
  }
  return sanitizeIdeaForPersistence(raw);
}

export function resolveToolTemplateUi(config: MvpBuilderConfig, projectId: string, ideaTextOverride?: string): ToolSubtypeUiConfig {
  const idea = ideaTextOverride ?? getIdeaTextForToolTemplate(projectId);
  const subtype = detectToolSubtype(config.productName, idea);
  if (subtype === "text_tool") {
    return resolveTextToolUi(config.productName, idea);
  }
  return getToolTemplateUiConfig(subtype);
}

/** Single-image improver UI (before/after): any image keyword match, but not compare or title+thumbnail hybrid. */
export function isImageToolMode(productName: string, ideaText: string): boolean {
  const h = normalizeText(`${productName} ${ideaText}`);
  if (!h) return false;
  if (matchesTitleThumbnailHybrid(h)) return false;
  if (matchesThumbnailCompareLayout(h)) return false;
  return IMAGE_SUBSTRINGS.some((w) => haystackIncludes(h, w));
}
