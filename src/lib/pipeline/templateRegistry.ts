import type { OutputType, PrimaryCategory, TemplateFamilyDefinition, TemplateFamilyId } from "@/lib/pipeline/types";

export const TEMPLATE_REGISTRY: Record<TemplateFamilyId, TemplateFamilyDefinition> = {
  pricing_calculator: {
    id: "pricing_calculator",
    label: "Pricing calculator",
    supportedCategories: ["pricing_tool", "generic_tool"],
    outputs: ["numeric_score", "structured_comparison", "unknown"],
    blockedConditions: ["text_improver_when_pricing_blocks_messaging"],
    requiredFields: ["userPrice", "competitorPrices"],
  },
  competitor_comparison: {
    id: "competitor_comparison",
    label: "Competitor comparison",
    supportedCategories: ["pricing_tool", "comparison_tool", "generic_tool"],
    outputs: ["structured_comparison", "numeric_score", "unknown"],
    blockedConditions: [],
    requiredFields: ["competitorPrices", "userPrice"],
  },
  text_improver: {
    id: "text_improver",
    label: "Text improver",
    supportedCategories: ["messaging_tool", "generic_tool"],
    outputs: ["text_variations", "unknown"],
    blockedConditions: ["blocked_by_pricing_intent"],
    requiredFields: ["draftText"],
  },
  landing_page: {
    id: "landing_page",
    label: "Landing",
    supportedCategories: ["generic_tool"],
    outputs: ["unknown"],
    blockedConditions: [],
    requiredFields: [],
  },
};

export function familySupportsCategory(family: TemplateFamilyId, category: PrimaryCategory): boolean {
  return TEMPLATE_REGISTRY[family].supportedCategories.includes(category);
}

export function familyOutputsInclude(family: TemplateFamilyId, out: OutputType): boolean {
  const o = TEMPLATE_REGISTRY[family].outputs;
  return o.includes(out) || o.includes("unknown");
}
