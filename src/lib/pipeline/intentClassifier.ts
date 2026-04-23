import type { AppIntent, InteractionType, OutputType, PrimaryCategory, SecondaryCategory } from "@/lib/pipeline/types";

function norm(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Deterministic intent classification from prompt text.
 */
export function classifyIntent(prompt: string): AppIntent {
  const h = norm(prompt);
  const entities: string[] = [];

  const hasPricing =
    /\b(pricing|price|margin|markup|confidence score|price confidence)\b/.test(h) ||
    /pricing confidence/i.test(prompt) ||
    (/\bcalculator\b/.test(h) && /\b(pricing|price|competitor|confidence|margin|markup|revenue|unit)\b/.test(h)) ||
    /\b(discount impact|discount calculator|impact calculator)\b/i.test(h) ||
    (/\b(discount|discounted)\b/.test(h) && /\b(impact|revenue|calculator)\b/.test(h)) ||
    /\b(break[\s-]?even|breakeven)\b/.test(h) ||
    /\bcost[\s-]?plus\b/.test(h) ||
    /\bunit revenue\b/.test(h) ||
    /\brevenue per unit\b/.test(h);
  const hasCompetitor =
    /\b(competitor|competition|comparison|compare|position checker|vs\.?|versus)\b/.test(h);
  const hasScoreCalc =
    /\b(score|calculator|checker|evaluate|evaluation|meter)\b/.test(h);
  const hasDmMessaging =
    /\b(cold dm|cold outreach|\bdm\b|direct message|message improver|linkedin message|outreach message)\b/.test(
      h,
    );
  const blocksMessagingExplicit =
    /\b(no messaging|not (a )?messaging|avoid (dm|message)|block text improver)\b/i.test(prompt);

  let primary: PrimaryCategory = "generic_tool";
  if (hasPricing) {
    primary = "pricing_tool";
    entities.push("product", "price", "market_position");
  }
  let secondary: SecondaryCategory = "none";
  if (hasCompetitor || /competitor price|price position/i.test(prompt)) {
    secondary = "comparison_tool";
    entities.push("competitor", "comparison");
  }
  if (hasDmMessaging && !hasPricing) {
    primary = "messaging_tool";
    secondary = /\bimprov|rewrite|variation/i.test(h) ? "text_improver" : "none";
    entities.push("message", "reply_rate");
  }

  let output_type: OutputType = "unknown";
  if (primary === "pricing_tool" && (hasScoreCalc || /\bconfidence\b/.test(h))) {
    output_type = "numeric_score";
  } else if (primary === "pricing_tool" && hasCompetitor) {
    output_type = "structured_comparison";
  } else if (primary === "messaging_tool") {
    output_type = "text_variations";
  }

  let interaction_type: InteractionType = "form";
  if (primary === "pricing_tool" && (hasScoreCalc || output_type === "numeric_score")) {
    interaction_type = "calculator";
  }

  const blocked_categories: string[] = [];
  if (primary === "pricing_tool") {
    blocked_categories.push("messaging_tool", "text_improver", "workflow");
  }
  if (blocksMessagingExplicit) {
    if (!blocked_categories.includes("messaging_tool")) blocked_categories.push("messaging_tool");
    if (!blocked_categories.includes("text_improver")) blocked_categories.push("text_improver");
  }

  let confidence = 0.55;
  if (primary !== "generic_tool") confidence += 0.2;
  if (secondary !== "none") confidence += 0.1;
  if (output_type !== "unknown") confidence += 0.1;
  confidence = Math.min(0.95, Math.round(confidence * 100) / 100);

  return {
    app_type: "tool_app",
    primary_category: primary,
    secondary_category: secondary,
    output_type,
    interaction_type,
    entities: [...new Set(entities)],
    blocked_categories,
    confidence,
  };
}
