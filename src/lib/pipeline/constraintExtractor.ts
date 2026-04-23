import type { AppIntent, ExtractedConstraints } from "@/lib/pipeline/types";

export function extractConstraints(intent: AppIntent, prompt: string): ExtractedConstraints {
  const h = prompt.toLowerCase();
  const pricing = intent.primary_category === "pricing_tool";
  const comparison =
    intent.secondary_category === "comparison_tool" ||
    /\b(competitor|comparison|position|versus|vs)\b/.test(h);

  return {
    must_be_tool_app: intent.app_type === "tool_app",
    must_not_be_text_improver: pricing || /\bno (text )?rewrit/i.test(prompt),
    must_not_be_workflow: true,
    must_output_numeric_score:
      pricing && (intent.output_type === "numeric_score" || intent.interaction_type === "calculator"),
    must_include_comparison: comparison && pricing,
  };
}
