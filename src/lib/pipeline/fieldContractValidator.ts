import { PRICING_FIELD_MAPS } from "@/lib/pipeline/fieldMapRegistry";
import { isLogicNullPremiumSubmode } from "@/lib/pipeline/pricingPremiumSubmodes";
import type { OutputContractValidation, PipelineRunResult } from "@/lib/pipeline/types";

/**
 * Validates that pricing premium output matches declared field map (family + submode contract).
 * Non-pricing tools pass if pipeline validation already passed.
 */
export function validateToolFieldContract(r: PipelineRunResult): OutputContractValidation {
  const reasons = [...r.validation.reasons];
  if (r.intent.primary_category === "pricing_tool" && r.pricingSubmode) {
    const map = PRICING_FIELD_MAPS[r.pricingSubmode];
    if (!map && isLogicNullPremiumSubmode(r.pricingSubmode)) {
      reasons.push("field_map_missing_for_submode");
    }
    if (map && isLogicNullPremiumSubmode(r.pricingSubmode) && r.uiKind !== "pricing_premium") {
      reasons.push("expected_pricing_premium_ui");
    }
  }
  const ok = r.validation.ok && reasons.length === r.validation.reasons.length;
  return {
    ok,
    reasons,
    isGeneric: r.validation.isGeneric,
    includesNumericResult: r.validation.includesNumericResult,
    includesComparison: r.validation.includesComparison,
    includesTextRewriting: r.validation.includesTextRewriting,
  };
}

/** Merge: pipeline validation + field map check; used when you need a single gate. */
export function validateToolWithFieldContract(r: PipelineRunResult): {
  ok: boolean;
  pipeline: OutputContractValidation;
  field: OutputContractValidation;
} {
  const field = validateToolFieldContract(r);
  return {
    ok: r.validation.ok && field.ok,
    pipeline: r.validation,
    field,
  };
}
