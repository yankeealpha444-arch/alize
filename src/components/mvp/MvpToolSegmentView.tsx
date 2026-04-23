import { useEffect, useMemo } from "react";
import {
  classifyMvp,
  getSafeFallbackMvpClassification,
  mvpBuilderConfigFromClassification,
  productNameFromIdea,
  type MvpClassification,
} from "@/lib/mvp/mvpClassification";
import { runPipeline } from "@/lib/pipeline/runPipeline";
import type { PipelineRunResult } from "@/lib/pipeline/types";
import PricingPremiumMVP from "@/components/pipeline/PricingPremiumMVP";
import ToolTemplateMVP from "@/components/mvp/ToolTemplateMVP";
import FeedTemplateMVP from "@/components/mvp/FeedTemplateMVP";
import WorkflowTemplateMVP from "@/components/mvp/WorkflowTemplateMVP";
import ReelPerformanceLabMVP from "@/components/mvp/ReelPerformanceLabMVP";
import CarouselTesterMVP from "@/components/mvp/CarouselTesterMVP";
import SegmentErrorBoundary from "@/components/mvp/SegmentErrorBoundary";
import { Separator } from "@/components/ui/separator";
import { isLogicNullPremiumSubmode } from "@/lib/pipeline/pricingPremiumSubmodes";
import { safeSegmentDisplayTitle } from "@/lib/pipeline/segmentDisplayTitle";
import { isDedicatedSegmentCalculatorSubtype } from "@/lib/mvp/toolTemplateSubtype";
import SegmentDedicatedCalculator from "@/components/mvp/SegmentDedicatedCalculator";
import AnalysisToolMVP from "@/components/mvp/AnalysisToolMVP";
import BlockedInputPreview from "@/components/mvp/BlockedInputPreview";
import { isNonProductInput } from "@/lib/mvp/nonProductInputGate";
import { showAlizePreviewDebugUi } from "@/lib/mvp/previewDebugUi";

type Props = {
  projectId: string;
  segmentIndex: number;
  segmentPrompt: string;
};

function previewSnippet(s: string, n: number): string {
  const t = s.trim();
  if (!t.length) return "(empty)";
  return t.length <= n ? t : `${t.slice(0, n)}…`;
}

function segmentTitle(prompt: string, index: number): string {
  return safeSegmentDisplayTitle(prompt, index, 96);
}

function isPricingPremiumRoute(pipeline: PipelineRunResult): boolean {
  return pipeline.uiKind === "pricing_premium" && (pipeline.logic !== null || isLogicNullPremiumSubmode(pipeline.pricingSubmode));
}

/**
 * One tool on a multi-tool page: full `classifyMvp` + `runPipeline` per segment — no shared state with other segments.
 */
export default function MvpToolSegmentView({ projectId, segmentIndex, segmentPrompt }: Props) {
  const safePrompt = typeof segmentPrompt === "string" ? segmentPrompt : String(segmentPrompt ?? "");
  const segmentProjectId = `${projectId}-seg-${segmentIndex}`;
  const productName = useMemo(() => productNameFromIdea(safePrompt), [safePrompt]);
  const c: MvpClassification = useMemo(() => {
    try {
      return classifyMvp(safePrompt, productName);
    } catch (e) {
      console.warn("[Alizé][MultiToolPreview] classifyMvp failed for segment", segmentIndex, e);
      return getSafeFallbackMvpClassification();
    }
  }, [safePrompt, productName, segmentIndex]);
  const config = useMemo(() => mvpBuilderConfigFromClassification(safePrompt, c), [safePrompt, c]);

  const { pipeline, pipelineError } = useMemo((): {
    pipeline: PipelineRunResult | null;
    pipelineError: string | null;
  } => {
    try {
      return { pipeline: runPipeline(safePrompt), pipelineError: null };
    } catch (e) {
      return {
        pipeline: null,
        pipelineError: e instanceof Error ? e.message : String(e),
      };
    }
  }, [safePrompt]);

  const title = useMemo(() => segmentTitle(safePrompt, segmentIndex), [safePrompt, segmentIndex]);
  const debugUi = showAlizePreviewDebugUi();
  const devSegmentPreview = debugUi ? previewSnippet(safePrompt, 120) : undefined;

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    if (pipelineError) {
      console.info("[Alizé][MultiToolPreview] segment pipeline error", { segmentIndex, pipelineError });
    } else if (pipeline) {
      console.info("[Alizé][MultiToolPreview] segment ok", {
        segmentIndex,
        pricingSubmode: pipeline.pricingSubmode ?? null,
        hasLogic: pipeline.logic != null,
      });
    }
  }, [segmentIndex, pipeline, pipelineError]);

  const body = (() => {
    if (isNonProductInput(safePrompt.trim())) {
      return (
        <BlockedInputPreview
          projectId={`${segmentProjectId}-blocked`}
          initialValue={safePrompt}
          allowPersistGenerate={false}
        />
      );
    }

    if (c.templateId === "TOOL_TEMPLATE" && isDedicatedSegmentCalculatorSubtype(c.toolSubtypeId)) {
      return (
        <SegmentDedicatedCalculator subtype={c.toolSubtypeId} projectId={segmentProjectId} idea={safePrompt} />
      );
    }

    if (c.toolSubtypeId === "text_response") {
      return <AnalysisToolMVP projectId={segmentProjectId} promptText={safePrompt} />;
    }

    if (pipelineError || !pipeline) {
      return (
        <div
          role="status"
          className="rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm text-foreground"
          data-mvp-segment-pipeline-missing
        >
          We couldn&apos;t build an interactive preview for this tool from your text. Try rephrasing or splitting the
          idea.
          {pipelineError && debugUi ? (
            <span className="font-mono text-xs block mt-2 text-muted-foreground">{pipelineError}</span>
          ) : null}
        </div>
      );
    }

    if (c.templateId === "TOOL_TEMPLATE" && isPricingPremiumRoute(pipeline)) {
      return (
        <PricingPremiumMVP
          key={`${segmentProjectId}-${safePrompt.slice(0, 48)}`}
          projectId={segmentProjectId}
          pipeline={pipeline}
          idea={safePrompt}
        />
      );
    }

    if (c.toolRenderVariant === "carousel_tester") {
      return (
        <CarouselTesterMVP projectId={segmentProjectId} productName={config?.productName ?? "My MVP"} />
      );
    }
    if (c.toolRenderVariant === "reel_lab") {
      return <ReelPerformanceLabMVP projectId={segmentProjectId} productName={config?.productName ?? "My MVP"} />;
    }

    switch (c.templateId) {
      case "FEED_TEMPLATE":
        return <FeedTemplateMVP projectId={segmentProjectId} config={config} />;
      case "WORKFLOW_TEMPLATE":
        return <WorkflowTemplateMVP projectId={segmentProjectId} config={config} />;
      case "TOOL_TEMPLATE":
      default:
        return (
          <ToolTemplateMVP projectId={segmentProjectId} config={config} ideaTextOverride={safePrompt} />
        );
    }
  })();

  return (
    <section
      className="rounded-2xl border border-border bg-card/40 p-6 shadow-sm"
      data-mvp-segment-index={segmentIndex}
    >
      <header className="mb-6 space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          Tool {segmentIndex + 1}
        </p>
        <h2 className="text-xl font-semibold tracking-tight text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">{safePrompt.trim()}</p>
      </header>

      {debugUi ? (
        <>
          <div className="space-y-2 text-xs text-muted-foreground mb-6">
            <p>
              <span className="font-medium text-foreground">Template:</span> {c?.debugTypeLabel ?? "—"} ·{" "}
              {c?.debugSubtypeLabel ?? "—"}
            </p>
            {pipeline ? (
              <p>
                <span className="font-medium text-foreground">Pipeline:</span>{" "}
                {pipeline.intent?.primary_category ?? "—"} ·{" "}
                {pipeline.validation?.ok
                  ? "validation OK"
                  : `validation: ${Array.isArray(pipeline.validation?.reasons) ? pipeline.validation.reasons.join(", ") : "unknown"}`}
              </p>
            ) : null}
          </div>

          <Separator className="mb-6" />
        </>
      ) : (
        <Separator className="mb-6" />
      )}

      {pipelineError ? (
        <div
          role="alert"
          className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          This tool failed to run: {pipelineError}
        </div>
      ) : (
        <SegmentErrorBoundary segmentIndex={segmentIndex} segmentPreview={devSegmentPreview}>
          <div className="min-w-0">{body}</div>
        </SegmentErrorBoundary>
      )}
    </section>
  );
}
