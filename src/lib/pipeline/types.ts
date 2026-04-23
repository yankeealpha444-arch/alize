/** Structured intent from the Intent Classifier (deterministic). */

export type AppType = "tool_app" | "workflow_app" | "feed_app";

export type PrimaryCategory =
  | "pricing_tool"
  | "messaging_tool"
  | "comparison_tool"
  | "generic_tool";

export type SecondaryCategory = "comparison_tool" | "text_improver" | "none";

export type OutputType = "numeric_score" | "text_variations" | "structured_comparison" | "unknown";

export type InteractionType = "calculator" | "form" | "chat" | "viewer";

export interface AppIntent {
  app_type: AppType;
  primary_category: PrimaryCategory;
  secondary_category: SecondaryCategory;
  output_type: OutputType;
  interaction_type: InteractionType;
  entities: string[];
  blocked_categories: string[];
  confidence: number;
}

export interface ExtractedConstraints {
  must_be_tool_app: boolean;
  must_not_be_text_improver: boolean;
  must_not_be_workflow: boolean;
  must_output_numeric_score: boolean;
  must_include_comparison: boolean;
}

export type TemplateFamilyId =
  | "pricing_calculator"
  | "competitor_comparison"
  | "text_improver"
  | "landing_page";

export interface TemplateFamilyDefinition {
  id: TemplateFamilyId;
  label: string;
  supportedCategories: PrimaryCategory[];
  outputs: OutputType[];
  blockedConditions: string[];
  requiredFields: string[];
}

export type ComposedBlockId =
  | "price_input_block"
  | "competitor_input_block"
  | "score_meter"
  | "position_badge"
  | "insight_cards"
  | "comparison_summary"
  | "action_buttons";

export interface TemplateRouteDecision {
  primaryFamilies: TemplateFamilyId[];
  mode: "single" | "composed";
  composed: boolean;
  reason: string;
}

export interface ComposedTemplate {
  blocks: ComposedBlockId[];
  families: TemplateFamilyId[];
}

export interface PricingInputs {
  userPrice: number;
  competitorPrices: number[];
  marginPercent: number;
  segmentMatch: boolean;
}

export type MarketPositionLabel = "budget" | "mid_range" | "premium";

export interface LogicEngineOutput {
  pricingConfidenceScore: number;
  marketPosition: MarketPositionLabel;
  avgCompetitorPrice: number;
  userPrice: number;
  priceGapAbsolute: number;
  priceGapPercent: number;
  insights: {
    position: string;
    risk: string;
    action: string;
  };
  recommendedAction: string;
}

export interface OutputContractValidation {
  ok: boolean;
  reasons: string[];
  isGeneric: boolean;
  includesNumericResult: boolean;
  includesComparison: boolean;
  includesTextRewriting: boolean;
}

export type PipelineUIKind = "pricing_premium" | "standard_tool";

/** Which pricing premium template + logic bundle to render (prompt-bound). */
export type PricingSubmodeId =
  | "pricing_confidence"
  | "competitor_position"
  | "discount_impact"
  | "break_even"
  | "profit_margin"
  | "markup"
  | "unit_revenue"
  | "cost_plus_pricing"
  | "margin_calculator"
  | "price_change_simulator";

export interface BreakEvenResult {
  fixedCosts: number;
  costPerUnit: number;
  expectedUnitsSold: number;
  totalCost: number;
  breakEvenPricePerUnit: number;
  totalRevenueAtBreakEven: number;
  insights: {
    cost: string;
    pricing: string;
    action: string;
  };
}

export interface ProfitMarginResult {
  sellingPricePerUnit: number;
  costPerUnit: number;
  estimatedUnitsSold: number;
  profitPerUnit: number;
  totalProfit: number;
  profitMarginPercent: number;
  /** Optional supporting line (gross margin on price). */
  grossMarginPercentOnPrice: number;
  interpretation: string;
  recommendedNextStep: string;
  insights: {
    profit: string;
    scale: string;
    action: string;
  };
}

export interface DiscountImpactResult {
  originalPrice: number;
  discountPercent: number;
  estimatedMonthlySales: number;
  discountedPrice: number;
  revenueBefore: number;
  revenueAfter: number;
  revenueChangePercent: number;
  /** Plain-language summary of the scenario. */
  interpretation: string;
  /** One concrete next step. */
  recommendedNextStep: string;
  insights: {
    price: string;
    revenue: string;
    action: string;
  };
}

export interface PipelineRunResult {
  prompt: string;
  intent: AppIntent;
  constraints: ExtractedConstraints;
  route: TemplateRouteDecision;
  composed: ComposedTemplate;
  logic: LogicEngineOutput | null;
  validation: OutputContractValidation;
  validationAfterRetry: OutputContractValidation | null;
  fallbackUsed: boolean;
  uiKind: PipelineUIKind;
  /** Set when intent is pricing_tool; drives premium UI variant. */
  pricingSubmode: PricingSubmodeId | null;
}
