import type { PricingSubmodeId } from "@/lib/pipeline/types";

/** Declarative contract for pricing calculator UIs — drives validation and docs. */
export interface PricingFieldMap {
  submode: PricingSubmodeId;
  inputs: string[];
  primaryButton: string;
  outputs: string[];
  insightCount: number;
  quickActions?: string[];
}

export const PRICING_FIELD_MAPS: Partial<Record<PricingSubmodeId, PricingFieldMap>> = {
  discount_impact: {
    submode: "discount_impact",
    inputs: ["Original price", "Discount percent", "Estimated monthly sales"],
    primaryButton: "Calculate Impact",
    outputs: ["Discounted price", "Revenue before discount", "Revenue after discount", "Percentage revenue change"],
    insightCount: 3,
  },
  break_even: {
    submode: "break_even",
    inputs: ["Fixed costs", "Cost per unit", "Expected number of units sold"],
    primaryButton: "Calculate Break Even",
    outputs: ["Break even price per unit", "Total cost", "Total revenue at break even"],
    insightCount: 3,
  },
  profit_margin: {
    submode: "profit_margin",
    inputs: ["Selling price per unit", "Cost per unit"], // + "Estimated number of units sold" only if the prompt asks for volume/units/total profit
    primaryButton: "Calculate Profit",
    outputs: ["Profit per unit", "Profit margin percentage"],
    insightCount: 3,
  },
  markup: {
    submode: "markup",
    inputs: ["Selling price per unit", "Cost per unit"],
    primaryButton: "Calculate Markup",
    outputs: ["Markup amount", "Markup percentage (on cost)"],
    insightCount: 3,
  },
  unit_revenue: {
    submode: "unit_revenue",
    inputs: ["Price per unit", "Number of units sold"],
    primaryButton: "Calculate Revenue",
    outputs: ["Total revenue", "Revenue per unit"],
    insightCount: 3,
  },
  cost_plus_pricing: {
    submode: "cost_plus_pricing",
    inputs: ["Cost per unit", "Markup percent on cost"],
    primaryButton: "Calculate Selling Price",
    outputs: ["Markup amount", "Selling price"],
    insightCount: 3,
  },
  pricing_confidence: {
    submode: "pricing_confidence",
    inputs: ["Your price", "Market benchmark"],
    primaryButton: "Retest",
    outputs: ["Pricing confidence score", "Vs benchmark gap"],
    insightCount: 3,
  },
  competitor_position: {
    submode: "competitor_position",
    inputs: ["Your price", "Competitor sample"],
    primaryButton: "Retest",
    outputs: ["Pricing confidence score", "Market position", "Price comparison"],
    insightCount: 3,
  },
};
