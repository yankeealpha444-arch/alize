import { classifyIntent } from "@/lib/pipeline/intentClassifier";
import { extractConstraints } from "@/lib/pipeline/constraintExtractor";
import { routeTemplates } from "@/lib/pipeline/templateRouter";
import { composeTemplate } from "@/lib/pipeline/templateComposer";
import { derivePricingInputsFromPrompt, runPricingLogic, runPricingLogicFallback } from "@/lib/pipeline/logicEngine";
import { validateOutputContract, validateProfitMarginSubmodeContract } from "@/lib/pipeline/outputContractValidator";
import { isLogicNullPremiumSubmode } from "@/lib/pipeline/pricingPremiumSubmodes";
import { resolvePricingSubmode } from "@/lib/pipeline/pricingSubmode";
import type { LogicEngineOutput, OutputContractValidation, PipelineRunResult, PricingSubmodeId } from "@/lib/pipeline/types";

function passValidation(): OutputContractValidation {
  return {
    ok: true,
    reasons: [],
    isGeneric: false,
    includesNumericResult: false,
    includesComparison: false,
    includesTextRewriting: false,
  };
}

function isPricingPremiumUi(
  intent: PipelineRunResult["intent"],
  route: PipelineRunResult["route"],
  logic: LogicEngineOutput | null,
  pricingSubmode: PricingSubmodeId | null,
): boolean {
  if (intent.primary_category !== "pricing_tool") return false;
  if (isLogicNullPremiumSubmode(pricingSubmode)) return true;
  if (!logic) return false;
  return route.primaryFamilies.some((f) => f === "pricing_calculator" || f === "competitor_comparison");
}

/**
 * End-to-end deterministic pipeline: Intent → Constraints → Route → Compose → Logic → Validate (+1 retry).
 * `pricingSubmode` binds the premium UI variant to the current prompt (regenerated when prompt changes).
 */
export function runPipeline(prompt: string): PipelineRunResult {
  const intent = classifyIntent(prompt);
  const constraints = extractConstraints(intent, prompt);
  const route = routeTemplates(intent, constraints);
  const composed = composeTemplate(route);

  if (intent.primary_category !== "pricing_tool") {
    return {
      prompt,
      intent,
      constraints,
      route,
      composed,
      logic: null,
      validation: passValidation(),
      validationAfterRetry: null,
      fallbackUsed: false,
      uiKind: "standard_tool",
      pricingSubmode: null,
    };
  }

  const pricingSubmode = resolvePricingSubmode(prompt);

  if (
    pricingSubmode === "discount_impact" ||
    pricingSubmode === "break_even" ||
    pricingSubmode === "markup" ||
    pricingSubmode === "unit_revenue" ||
    pricingSubmode === "cost_plus_pricing"
  ) {
    return {
      prompt,
      intent,
      constraints,
      route,
      composed,
      logic: null,
      validation: passValidation(),
      validationAfterRetry: null,
      fallbackUsed: false,
      uiKind: "pricing_premium",
      pricingSubmode,
    };
  }

  if (pricingSubmode === "profit_margin") {
    const validation = validateProfitMarginSubmodeContract(prompt);
    return {
      prompt,
      intent,
      constraints,
      route,
      composed,
      logic: null,
      validation,
      validationAfterRetry: null,
      fallbackUsed: false,
      uiKind: "pricing_premium",
      pricingSubmode,
    };
  }

  let inputs = derivePricingInputsFromPrompt(prompt);
  let logic: LogicEngineOutput | null = runPricingLogic(inputs);

  let validation = validateOutputContract(logic, constraints, route, { allowGeneric: false });
  let validationAfterRetry: OutputContractValidation | null = null;
  let fallbackUsed = false;

  if (!validation.ok) {
    inputs = {
      ...inputs,
      competitorPrices:
        inputs.competitorPrices.length >= 2
          ? inputs.competitorPrices
          : [Math.max(1, inputs.userPrice * 0.9), inputs.userPrice * 1.05, inputs.userPrice * 1.2],
    };
    logic = runPricingLogic(inputs);
    validationAfterRetry = validateOutputContract(logic, constraints, route, { allowGeneric: false });
    validation = validationAfterRetry;
  }

  if (!validation.ok) {
    logic = runPricingLogicFallback();
    fallbackUsed = true;
    validation = validateOutputContract(logic, constraints, route, { allowGeneric: true });
  }

  const uiKind = isPricingPremiumUi(intent, route, logic, pricingSubmode) ? "pricing_premium" : "standard_tool";

  return {
    prompt,
    intent,
    constraints,
    route,
    composed,
    logic,
    validation,
    validationAfterRetry,
    fallbackUsed,
    uiKind,
    pricingSubmode,
  };
}

export function formatPipelineReport(r: PipelineRunResult): string {
  const lines = [
    `prompt: ${r.prompt}`,
    `intent: ${r.intent.primary_category} / ${r.intent.secondary_category} | output: ${r.intent.output_type} | conf: ${r.intent.confidence}`,
    r.pricingSubmode ? `pricing_submode: ${r.pricingSubmode}` : "",
    `blocked: [${r.intent.blocked_categories.join(", ")}]`,
    `constraints: numeric=${r.constraints.must_output_numeric_score} comparison=${r.constraints.must_include_comparison} no_text_improver=${r.constraints.must_not_be_text_improver}`,
    `route: ${r.route.mode} [${r.route.primaryFamilies.join("+")}] — ${r.route.reason}`,
    `composed blocks: ${r.composed.blocks.join(" → ")}`,
    `validation: ${r.validation.ok ? "PASS" : "FAIL"} ${r.validation.reasons.join(",")}`,
    r.validationAfterRetry ? `retry validation: ${r.validationAfterRetry.ok ? "PASS" : "FAIL"}` : "",
    `fallback: ${r.fallbackUsed}`,
    `ui: ${r.uiKind}`,
    r.logic
      ? `score: ${r.logic.pricingConfidenceScore} | position: ${r.logic.marketPosition} | gap%: ${r.logic.priceGapPercent.toFixed(1)}`
      : "logic: (none)",
  ];
  return lines.filter(Boolean).join("\n");
}
