import type { AppIntent, ExtractedConstraints, TemplateFamilyId, TemplateRouteDecision } from "@/lib/pipeline/types";

/**
 * Routes to template families. Respects blocked categories — never routes text_improver when pricing blocks it.
 */
export function routeTemplates(intent: AppIntent, constraints: ExtractedConstraints): TemplateRouteDecision {
  const pricing = intent.primary_category === "pricing_tool";
  const comparison = intent.secondary_category === "comparison_tool" || constraints.must_include_comparison;
  const blocksTextImprover = constraints.must_not_be_text_improver || intent.blocked_categories.includes("text_improver");

  if (pricing && constraints.must_output_numeric_score) {
    if (comparison) {
      return {
        primaryFamilies: ["pricing_calculator", "competitor_comparison"],
        mode: "composed",
        composed: true,
        reason: "pricing_tool + numeric_score + comparison",
      };
    }
    return {
      primaryFamilies: ["pricing_calculator"],
      mode: "single",
      composed: false,
      reason: "pricing_tool + numeric_score",
    };
  }

  if (pricing && comparison && intent.output_type === "structured_comparison") {
    return {
      primaryFamilies: ["pricing_calculator", "competitor_comparison"],
      mode: "composed",
      composed: true,
      reason: "pricing + structured comparison",
    };
  }

  if (intent.primary_category === "messaging_tool" && !blocksTextImprover) {
    return {
      primaryFamilies: ["text_improver"],
      mode: "single",
      composed: false,
      reason: "messaging_tool",
    };
  }

  if (pricing) {
    return {
      primaryFamilies: ["pricing_calculator", "competitor_comparison"],
      mode: "composed",
      composed: true,
      reason: "pricing domain detected — avoid generic",
    };
  }

  return {
    primaryFamilies: ["landing_page"],
    mode: "single",
    composed: false,
    reason: "fallback landing",
  };
}
