// AI SAFE FILE
// UI LOCKED
// DO NOT MODIFY LAYOUT, STYLE, STRUCTURE, ROUTES, COPY, OR TEMPLATE
// ONLY FIX THE SPECIFIC REQUESTED LOGIC
// UI changes require: "UI change approved"

import React, { useLayoutEffect, useRef, useState } from "react";
import { useProjectId } from "@/hooks/useProject";
import { getIdeaTextForToolTemplate } from "@/lib/mvp/toolTemplateSubtype";
import { segmentInputToToolSpecs } from "@/lib/pipeline/toolSegmentation";
import { showAlizePreviewDebugUi } from "@/lib/mvp/previewDebugUi";
import MvpPreviewRouter from "@/components/mvp/MvpPreviewRouter";
import PreviewPageErrorBoundary from "@/components/mvp/PreviewPageErrorBoundary";
import { trackEvent } from "@/lib/trackingEvents";

type Diagnostics =
  | {
      ok: true;
      ideaLen: number;
      segmentCount: number;
      mode: "single" | "multi";
      devSnippet: string;
    }
  | {
      ok: false;
      err: string;
      ideaLen: number;
      segmentCount: number;
      mode: "single" | "multi";
      devSnippet: string;
    };

function readPreviewDiagnostics(projectId: string): Diagnostics {
  try {
    const raw = getIdeaTextForToolTemplate(projectId);
    const idea = typeof raw === "string" ? raw : String(raw ?? "");
    const specs = segmentInputToToolSpecs(idea);
    const t = idea.trim();
    const devSnippet =
      showAlizePreviewDebugUi() && import.meta.env.DEV
        ? t.length <= 120
          ? t
          : `${t.slice(0, 120)}…`
        : "";
    return {
      ok: true,
      ideaLen: idea.length,
      segmentCount: specs.length,
      mode: specs.length > 1 ? "multi" : "single",
      devSnippet,
    };
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      err,
      ideaLen: 0,
      segmentCount: 0,
      mode: "single",
      devSnippet: "",
    };
  }
}

function PreviewRouterPresenceProbe({
  projectId,
  diag,
  children,
}: {
  projectId: string;
  diag: Diagnostics;
  children: React.ReactNode;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [missingRouterUi, setMissingRouterUi] = useState(false);
  const debug = showAlizePreviewDebugUi();

  useLayoutEffect(() => {
    setMissingRouterUi(false);
    const check = () => {
      const root = wrapRef.current?.querySelector("[data-mvp-preview-router-root]");
      const h = root?.getBoundingClientRect().height ?? 0;
      setMissingRouterUi(!root || h < 2);
    };
    const t1 = window.setTimeout(check, 0);
    const t2 = window.setTimeout(check, 200);
    const t3 = window.setTimeout(check, 600);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [projectId, diag.segmentCount, diag.ideaLen]);

  return (
    <>
      <div ref={wrapRef} className="min-h-[20vh] w-full" data-preview-router-probe>
        {children}
      </div>
      {missingRouterUi ? (
        <div
          className="mt-4 rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-foreground"
          role="alert"
          data-preview-loaded-but-empty-fallback
        >
          <p className="font-semibold">Something didn&apos;t load</p>
          <p className="mt-2 text-muted-foreground text-sm">Try refreshing or returning to your idea.</p>
          {debug ? (
            <p className="mt-3 font-mono text-xs break-all opacity-90 border-t border-border pt-3">
              segment count: {diag.segmentCount} · mode: {diag.mode}
              {diag.ok ? (
                <>
                  <br />
                  snippet: {diag.devSnippet || "(empty)"}
                </>
              ) : (
                <>
                  <br />
                  diagnostics error: {diag.err}
                </>
              )}
            </p>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

/** Full-bleed product experience (no “preview” chrome). */
const PreviewChanges = () => {
  const projectId = useProjectId();
  const diag = readPreviewDiagnostics(projectId);
  const debug = showAlizePreviewDebugUi();
  useLayoutEffect(() => {
    void trackEvent("page_view", projectId, "preview_changes");
  }, [projectId]);

  return (
    <div className="flex flex-col min-h-0 flex-1 w-full bg-background text-foreground">
      {debug ? (
        <div
          className="shrink-0 px-4 py-3 border-b border-amber-600/50 bg-amber-50 dark:bg-amber-950/20 text-amber-950 dark:text-amber-100"
          data-preview-page-shell
        >
          <div className="text-xs font-mono space-y-1">
            <div className="font-bold text-sm">Debug</div>
            <div>ideaLen: {diag.ideaLen}</div>
            <div>segments: {diag.segmentCount}</div>
          </div>
        </div>
      ) : null}

      <div className="flex-1 flex flex-col min-h-[50vh] min-w-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-5 sm:px-6 sm:py-6">
          <PreviewRouterPresenceProbe projectId={projectId} diag={diag}>
            <PreviewPageErrorBoundary projectId={projectId}>
              <MvpPreviewRouter projectId={projectId} />
            </PreviewPageErrorBoundary>
          </PreviewRouterPresenceProbe>
        </div>
      </div>
    </div>
  );
};

export default PreviewChanges;
