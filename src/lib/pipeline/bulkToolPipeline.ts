import { validateToolFieldContract } from "@/lib/pipeline/fieldContractValidator";
import { runPipeline } from "@/lib/pipeline/runPipeline";
import { segmentInputToToolSpecs, type ToolPromptSpec } from "@/lib/pipeline/toolSegmentation";
import { buildStructuredToolSnapshot, type StructuredToolSnapshot } from "@/lib/pipeline/structuredToolIntent";
import type { OutputContractValidation, PipelineRunResult } from "@/lib/pipeline/types";

export interface BulkToolRun {
  toolId: string;
  rawPrompt: string;
  pipeline: PipelineRunResult | null;
  structured: StructuredToolSnapshot;
  fieldContract: OutputContractValidation;
  /** Combined pass: pipeline + field map contract */
  allValid: boolean;
  error: string | null;
}

function safeRunPipeline(prompt: string): { pipeline: PipelineRunResult | null; error: string | null } {
  try {
    return { pipeline: runPipeline(prompt), error: null };
  } catch (e) {
    return { pipeline: null, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Full independent pipeline per spec — no shared results. */
export function runBulkToolPipelineFromSpecs(specs: ToolPromptSpec[]): BulkToolRun[] {
  return specs.map((spec) => {
    const { pipeline, error } = safeRunPipeline(spec.rawPrompt);
    if (!pipeline) {
      return {
        toolId: spec.toolId,
        rawPrompt: spec.rawPrompt,
        pipeline: null,
        structured: {
          appType: "tool_app",
          category: "generic_tool",
          subtype: "unknown",
          submode: null,
          domainFamily: "generic_tool_family",
          entities: [],
          confidence: 0,
          blockedCategories: [],
        },
        fieldContract: {
          ok: false,
          reasons: ["pipeline_threw"],
          isGeneric: true,
          includesNumericResult: false,
          includesComparison: false,
          includesTextRewriting: false,
        },
        allValid: false,
        error,
      };
    }
    const structured = buildStructuredToolSnapshot(pipeline);
    const fieldContract = validateToolFieldContract(pipeline);
    const allValid = pipeline.validation.ok && fieldContract.ok;
    return {
      toolId: spec.toolId,
      rawPrompt: spec.rawPrompt,
      pipeline,
      structured,
      fieldContract,
      allValid,
      error: null,
    };
  });
}

/** Raw paste → segment → map — convenience for harness and APIs. */
export function runBulkToolPipelineFromRawInput(raw: string): BulkToolRun[] {
  return runBulkToolPipelineFromSpecs(segmentInputToToolSpecs(raw));
}
