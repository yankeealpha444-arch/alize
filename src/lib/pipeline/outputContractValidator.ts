import type { ExtractedConstraints, LogicEngineOutput, OutputContractValidation, TemplateRouteDecision } from "@/lib/pipeline/types";
import { isProfitMarginPrompt } from "@/lib/pipeline/pricingSubmode";

/**
 * Keyword contract for `profit_margin` submode: ensures the prompt matches profit-margin intent
 * — used by the pipeline alongside routing. Which inputs render follows `shouldShowProfitMarginUnitsInput`.
 */
export function validateProfitMarginSubmodeContract(prompt: string): OutputContractValidation {
  const ok = isProfitMarginPrompt(prompt);
  return {
    ok,
    reasons: ok ? [] : ["profit_margin_prompt_contract_incomplete"],
    isGeneric: false,
    includesNumericResult: ok,
    includesComparison: false,
    includesTextRewriting: false,
  };
}

export function validateOutputContract(
  logic: LogicEngineOutput | null,
  constraints: ExtractedConstraints,
  route: TemplateRouteDecision,
  options: { allowGeneric: boolean },
): OutputContractValidation {
  const reasons: string[] = [];
  let includesNumericResult = false;
  let includesComparison = false;
  let includesTextRewriting = false;
  let isGeneric = true;

  if (logic) {
    includesNumericResult = typeof logic.pricingConfidenceScore === "number";
    includesComparison =
      Number.isFinite(logic.avgCompetitorPrice) &&
      logic.avgCompetitorPrice > 0 &&
      Array.isArray([logic.userPrice]);
    isGeneric = false;
    includesTextRewriting = false;
  }

  if (constraints.must_output_numeric_score && !includesNumericResult) {
    reasons.push("missing_numeric_score");
  }
  if (constraints.must_include_comparison && logic && !includesComparison) {
    reasons.push("missing_comparison");
  }
  if (constraints.must_not_be_text_improver && route.primaryFamilies.includes("text_improver")) {
    reasons.push("text_improver_blocked");
    includesTextRewriting = true;
  }

  if (options.allowGeneric) isGeneric = false;

  const ok = reasons.length === 0 && includesNumericResult && (constraints.must_include_comparison ? includesComparison : true);

  return {
    ok,
    reasons,
    isGeneric,
    includesNumericResult,
    includesComparison,
    includesTextRewriting,
  };
}
