import type { ComposedBlockId, ComposedTemplate, TemplateFamilyId, TemplateRouteDecision } from "@/lib/pipeline/types";

const PRICING_COMPOSITION: ComposedBlockId[] = [
  "price_input_block",
  "competitor_input_block",
  "score_meter",
  "position_badge",
  "insight_cards",
  "comparison_summary",
  "action_buttons",
];

const PRICING_ONLY: ComposedBlockId[] = [
  "price_input_block",
  "competitor_input_block",
  "score_meter",
  "position_badge",
  "insight_cards",
  "comparison_summary",
  "action_buttons",
];

/**
 * Maps routed families to concrete UI blocks.
 */
export function composeTemplate(route: TemplateRouteDecision): ComposedTemplate {
  const families: TemplateFamilyId[] = route.primaryFamilies;

  if (route.composed && families.includes("pricing_calculator") && families.includes("competitor_comparison")) {
    return { blocks: [...PRICING_COMPOSITION], families };
  }

  if (families.includes("pricing_calculator")) {
    return { blocks: [...PRICING_ONLY], families };
  }

  return { blocks: [], families };
}
