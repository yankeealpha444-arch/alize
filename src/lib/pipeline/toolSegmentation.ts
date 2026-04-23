import { parseMultiPrompt } from "@/lib/pipeline/multiPromptParser";

function coerceRawInput(raw: unknown): string {
  if (raw == null) return "";
  if (typeof raw === "string") return raw;
  try {
    return String(raw);
  } catch {
    return "";
  }
}

/** Normalized tool slot after segmentation (single or bulk). */
export interface ToolPromptSpec {
  toolId: string;
  rawPrompt: string;
}

export interface BatchToolSegmentationValidation {
  ok: boolean;
  detectedCount: number;
  specCount: number;
  reasons: string[];
}

/**
 * Segments raw user input into independent tool prompts, each with a stable id.
 * Runs **before** template classification in the preview router — each spec gets its own `runPipeline` in multi mode.
 * Always returns at least one entry; bulk mode is `length > 1`.
 */
export function segmentInputToToolSpecs(raw: unknown): ToolPromptSpec[] {
  const safe = coerceRawInput(raw);
  const trimmed = safe.replace(/\r\n/g, "\n").trim();
  const segments = parseMultiPrompt(safe);
  if (segments.length === 0) {
    return [{ toolId: "tool_1", rawPrompt: trimmed }];
  }
  const specs = segments.map((rawPrompt, i) => ({
    toolId: `tool_${i + 1}`,
    rawPrompt: typeof rawPrompt === "string" ? rawPrompt.trim() : String(rawPrompt ?? "").trim(),
  }));
  return specs.length > 0 ? specs : [{ toolId: "tool_1", rawPrompt: trimmed }];
}

/**
 * Ensures `segmentInputToToolSpecs` stayed aligned with `parseMultiPrompt` (build / QA guard).
 * If N tools are detected, validation fails when the spec array does not have exactly N matching bodies.
 */
export function validateBatchToolSegmentation(raw: unknown, specs: ToolPromptSpec[]): BatchToolSegmentationValidation {
  const parsed = parseMultiPrompt(raw);
  const reasons: string[] = [];
  if (parsed.length !== specs.length) {
    reasons.push(`count_mismatch:parsed=${parsed.length}_specs=${specs.length}`);
  }
  for (let i = 0; i < Math.min(parsed.length, specs.length); i++) {
    const pi = parsed[i];
    const si = specs[i];
    if (pi == null || si == null) {
      reasons.push(`segment_null_at_${i}`);
      continue;
    }
    if (String(pi).trim() !== String(si.rawPrompt ?? "").trim()) {
      reasons.push(`segment_body_drift_at_${i}`);
    }
  }
  return {
    ok: reasons.length === 0,
    detectedCount: parsed.length,
    specCount: specs.length,
    reasons,
  };
}
