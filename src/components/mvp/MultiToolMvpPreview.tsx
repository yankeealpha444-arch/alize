import { useEffect } from "react";
import MvpToolSegmentView from "@/components/mvp/MvpToolSegmentView";
import { getDetectedToolCount } from "@/lib/pipeline/multiPromptParser";
import { validateBatchToolSegmentation, type ToolPromptSpec } from "@/lib/pipeline/toolSegmentation";
import { safeSegmentDisplayTitle } from "@/lib/pipeline/segmentDisplayTitle";
import { showAlizePreviewDebugUi } from "@/lib/mvp/previewDebugUi";

type Props = {
  projectId: string;
  specs: ToolPromptSpec[];
  /** Full user idea (same string used to build `specs`) — used to validate segment count vs parse. */
  rawPrompt: string;
};

/** Renders every tool in order on one scrollable page — isolated state per `MvpToolSegmentView`. */
export default function MultiToolMvpPreview({ projectId, specs, rawPrompt }: Props) {
  const safeSpecs = Array.isArray(specs) ? specs : [];
  const safeRaw = typeof rawPrompt === "string" ? rawPrompt : String(rawPrompt ?? "");

  const batchValidation = validateBatchToolSegmentation(safeRaw, safeSpecs);
  const parsedCount = getDetectedToolCount(safeRaw);
  const countMismatch = !batchValidation.ok || parsedCount !== safeSpecs.length;
  const debugUi = showAlizePreviewDebugUi();

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    console.info("[Alizé][MultiToolPreview] mount", {
      segmentCount: safeSpecs.length,
      parsedCount,
      validationOk: batchValidation.ok,
      projectId,
    });
  }, [safeSpecs.length, parsedCount, batchValidation.ok, projectId]);

  return (
    <div
      className="flex flex-col gap-10 w-full max-w-5xl mx-auto pb-16 px-2 min-h-[24vh]"
      data-multi-tool-page
      data-multi-tool-segment-count={safeSpecs.length}
      data-multi-tool-parsed-count={parsedCount}
      data-batch-validation-ok={batchValidation.ok ? "true" : "false"}
    >
      {debugUi ? (
        <>
          <div
            className="rounded-lg border-2 border-slate-600 bg-slate-100 p-4 text-sm dark:bg-slate-900 dark:text-slate-100 dark:border-slate-500"
            style={{ color: "#0f172a" }}
            data-multi-tool-smoke-titles
          >
            <p className="font-bold mb-2">Multi-tool smoke (titles only)</p>
            <ol className="list-decimal list-inside space-y-1 font-mono text-xs">
              {safeSpecs.length === 0 ? (
                <li>(no segments)</li>
              ) : (
                safeSpecs.map((spec, i) => (
                  <li key={spec.toolId ?? `smoke-${i}`}>
                    Tool {i + 1}: {safeSegmentDisplayTitle(spec.rawPrompt, i)}
                  </li>
                ))
              )}
            </ol>
            <div className="mt-3 pt-3 border-t border-slate-400 space-y-1 font-mono text-xs" data-multi-tool-smoke-slots>
              <p className="font-semibold mb-1">Fixed slots (1–4)</p>
              {[0, 1, 2, 3].map((i) => {
                const spec = safeSpecs[i];
                const t = spec ? safeSegmentDisplayTitle(spec.rawPrompt, i) : "(no segment)";
                return (
                  <div key={`slot-${i}`} data-smoke-tool-slot={i + 1}>
                    Tool {i + 1}: {t}
                  </div>
                );
              })}
            </div>
          </div>

          <div
            role="status"
            className="rounded-xl border border-primary/25 bg-primary/5 px-4 py-3 text-sm text-foreground"
            data-multi-tool-mode
          >
            Multi-tool mode · <span className="font-semibold">{safeSpecs.length}</span> tools on this page — each runs
            the full pipeline independently.
          </div>
        </>
      ) : null}

      {countMismatch ? (
        <div
          role="alert"
          className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          data-multi-tool-count-mismatch
        >
          Batch validation failed: expected {parsedCount} tool section(s) to match specs ({safeSpecs.length}).{" "}
          {batchValidation.reasons.join(" · ") || "Check multi-tool splitting."}
        </div>
      ) : null}

      {safeSpecs.length === 0 ? (
        <div role="status" className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          No tool segments to display. Your idea text may be empty — try returning to the idea step and submitting again.
        </div>
      ) : (
        safeSpecs.map((spec, index) => (
          <MvpToolSegmentView
            key={spec.toolId ?? `tool_${index}`}
            projectId={projectId}
            segmentIndex={index}
            segmentPrompt={typeof spec.rawPrompt === "string" ? spec.rawPrompt : String(spec.rawPrompt ?? "")}
          />
        ))
      )}
    </div>
  );
}
