import { useEffect, useMemo, useState } from "react";
import { Progress } from "@/components/ui/progress";
import type { MvpBuilderConfig } from "@/lib/mvp/types";
import { resolveWorkflowTemplateUi } from "@/lib/mvp/workflowTemplateSubtype";
import { trackMvpEvent, countMvpEventsByType } from "@/lib/mvp/mvpEventTracking";

type Props = { projectId: string; config: MvpBuilderConfig };

const STEP_COUNT = 3;

/** WORKFLOW_TEMPLATE — guided steps with product-specific labels from idea / product name. */
export default function WorkflowTemplateMVP({ projectId, config }: Props) {
  const ui = useMemo(
    () => resolveWorkflowTemplateUi(config, projectId),
    [config.productName, config.templateId, config.decidedAt, projectId],
  );

  const [stepIdx, setStepIdx] = useState(0);
  const [answer1, setAnswer1] = useState("");
  const [answer1Optional, setAnswer1Optional] = useState("");
  const [answer2, setAnswer2] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    trackMvpEvent("page_view", projectId, { template: "WORKFLOW_TEMPLATE", workflow: ui.subtype });
  }, [projectId, ui.subtype]);

  const [, setBump] = useState(0);
  useEffect(() => {
    const fn = () => setBump((n) => n + 1);
    window.addEventListener("alize-mvp-tracking-updated", fn);
    return () => window.removeEventListener("alize-mvp-tracking-updated", fn);
  }, []);

  const counts = countMvpEventsByType(projectId);
  const pct = done ? 100 : Math.round(((stepIdx + 1) / STEP_COUNT) * 100);

  const advance = () => {
    const stepId = stepIdx + 1;
    trackMvpEvent("workflow_step_completed", projectId, { step: stepId });
    if (stepIdx >= STEP_COUNT - 1) {
      setDone(true);
      trackMvpEvent("result_generated", projectId, { workflow: true });
      return;
    }
    setStepIdx((s) => s + 1);
  };

  const step1 = ui.step1;
  const step2 = ui.step2;
  const step3 = ui.step3;

  const showOptional1 = Boolean(step1.optionalLabel);

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto w-full">
      <header className="border-b border-border pb-3 space-y-1">
        <h1 className="text-xl font-semibold text-foreground">{ui.title}</h1>
        <p className="text-sm text-muted-foreground leading-snug">{ui.subtitle}</p>
      </header>

      <div className="space-y-2">
        <div className="flex justify-between text-[10px] text-muted-foreground uppercase tracking-wide">
          <span>
            {stepIdx + 1} / {STEP_COUNT}
          </span>
          <span>{pct}%</span>
        </div>
        <Progress value={pct} className="h-2" />
      </div>

      {!done ? (
        <section className="space-y-4">
          {stepIdx === 0 && (
            <>
              <p className="text-sm font-semibold text-foreground">{step1.title}</p>
              <div className="space-y-2">
                <label className="text-xs font-medium text-foreground" htmlFor={`wf-1-${projectId}`}>
                  {step1.mainLabel}
                </label>
                <textarea
                  id={`wf-1-${projectId}`}
                  value={answer1}
                  onChange={(e) => setAnswer1(e.target.value)}
                  placeholder={step1.mainPlaceholder}
                  rows={4}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  onBlur={() => {
                    if (answer1.trim()) trackMvpEvent("input_submitted", projectId, { step: 1 });
                  }}
                />
              </div>
              {showOptional1 && step1.optionalLabel && (
                <div className="space-y-2">
                  <label className="text-xs font-medium text-foreground" htmlFor={`wf-1o-${projectId}`}>
                    {step1.optionalLabel}
                  </label>
                  <textarea
                    id={`wf-1o-${projectId}`}
                    value={answer1Optional}
                    onChange={(e) => setAnswer1Optional(e.target.value)}
                    placeholder={step1.optionalPlaceholder ?? ""}
                    rows={3}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    onBlur={() => {
                      if (answer1Optional.trim()) trackMvpEvent("input_submitted", projectId, { step: 1, field: "optional" });
                    }}
                  />
                </div>
              )}
            </>
          )}

          {stepIdx === 1 && (
            <>
              <p className="text-sm font-semibold text-foreground">{step2.title}</p>
              <div className="space-y-2">
                <label className="text-xs font-medium text-foreground" htmlFor={`wf-2-${projectId}`}>
                  {step2.mainLabel}
                </label>
                <textarea
                  id={`wf-2-${projectId}`}
                  value={answer2}
                  onChange={(e) => setAnswer2(e.target.value)}
                  placeholder={step2.mainPlaceholder}
                  rows={4}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  onBlur={() => {
                    if (answer2.trim()) trackMvpEvent("input_submitted", projectId, { step: 2 });
                  }}
                />
              </div>
            </>
          )}

          {stepIdx === 2 && (
            <>
              <p className="text-sm font-semibold text-foreground">{step3.title}</p>
              <div className="text-sm text-muted-foreground leading-relaxed space-y-3 rounded-lg border border-border bg-muted/30 p-4">
                <p>
                  <span className="text-foreground font-medium">{ui.reviewSummaryLabel1}:</span>{" "}
                  {answer1.trim() || "—"}
                </p>
                {showOptional1 && ui.reviewSummaryLabelOptional && (
                  <p>
                    <span className="text-foreground font-medium">{ui.reviewSummaryLabelOptional}:</span>{" "}
                    {answer1Optional.trim() || "—"}
                  </p>
                )}
                <p>
                  <span className="text-foreground font-medium">{ui.reviewSummaryLabel2}:</span>{" "}
                  {answer2.trim() || "—"}
                </p>
              </div>
            </>
          )}

          <button
            type="button"
            onClick={() => {
              trackMvpEvent("button_clicked", projectId, { action: "continue", step: stepIdx + 1 });
              advance();
            }}
            className="rounded-lg bg-foreground px-4 py-2.5 text-sm font-semibold text-background hover:opacity-90"
          >
            {stepIdx === 2 ? ui.finalPrimaryLabel : ui.continueLabel}
          </button>
        </section>
      ) : (
        <section className="rounded-xl border border-border bg-card p-5 space-y-3">
          <p className="text-base font-semibold text-foreground">{ui.emptyStateTitle}</p>
          <p className="text-sm text-muted-foreground leading-relaxed">{ui.emptyStateText}</p>
          <p className="text-xs text-foreground pt-2">{ui.doneHeadline}</p>
          <button
            type="button"
            className="mt-2 text-xs underline text-muted-foreground hover:text-foreground"
            onClick={() => {
              setDone(false);
              setStepIdx(0);
              setAnswer1("");
              setAnswer1Optional("");
              setAnswer2("");
              trackMvpEvent("button_clicked", projectId, { action: "restart" });
            }}
          >
            Start again
          </button>
        </section>
      )}

      <footer className="flex flex-wrap gap-4 text-[10px] text-muted-foreground border-t border-border pt-3">
        <span>Views: {counts.page_view}</span>
        <span>Stages: {counts.workflow_step_completed}</span>
        <span>Results: {counts.result_generated}</span>
      </footer>
    </div>
  );
}
