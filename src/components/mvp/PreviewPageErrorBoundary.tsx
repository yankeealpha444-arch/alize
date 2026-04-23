import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { getIdeaTextForToolTemplate } from "@/lib/mvp/toolTemplateSubtype";
import { segmentInputToToolSpecs } from "@/lib/pipeline/toolSegmentation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { showAlizePreviewDebugUi } from "@/lib/mvp/previewDebugUi";

type Props = {
  projectId: string;
  children: ReactNode;
};

type State = { error: Error | null };

function previewSnippet(s: string, n: number): string {
  const t = s.trim();
  if (!t.length) return "(empty)";
  return t.length <= n ? t : `${t.slice(0, n)}…`;
}

/**
 * Last-resort boundary for the whole preview column: keeps shell visible and shows diagnostics.
 */
export default class PreviewPageErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn("[Alizé][PreviewPage] preview subtree crashed", error.message, info.componentStack);
  }

  render() {
    if (this.state.error) {
      let idea = "";
      let specCount = 0;
      let multi = false;
      const segments: string[] = [];
      try {
        const raw = getIdeaTextForToolTemplate(this.props.projectId);
        idea = typeof raw === "string" ? raw : String(raw ?? "");
        const specs = segmentInputToToolSpecs(idea);
        specCount = specs.length;
        multi = specCount > 1;
        segments.push(...specs.map((s) => previewSnippet(s.rawPrompt ?? "", 120)));
      } catch {
        /* ignore diagnostics failures */
      }

      const debug = showAlizePreviewDebugUi();
      return (
        <div className="p-4 max-w-2xl mx-auto">
          <Card className="border-destructive/40 bg-destructive/5">
            <CardHeader>
              <CardTitle className="text-base text-destructive">Preview couldn&apos;t load</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-3">
              <p className="text-sm">Something went wrong while building the preview. Your idea is unchanged — try refreshing or returning to the idea step.</p>
              <p className="font-mono text-xs break-all text-foreground/90">{this.state.error.message}</p>
              {debug ? (
                <>
                  <ul className="list-disc list-inside text-xs space-y-1 text-muted-foreground">
                    <li>Multi-tool mode detected: {multi ? "yes" : "no"}</li>
                    <li>Detected segment count: {specCount}</li>
                    <li>Original prompt length: {idea.length}</li>
                  </ul>
                  {segments.length > 0 ? (
                    <div className="text-[10px] border-t border-border pt-3 space-y-1">
                      <p className="font-semibold text-foreground">Segments (first 120 chars each)</p>
                      {segments.map((seg, i) => (
                        <p key={i} className="font-mono break-all text-foreground/80">
                          {i + 1}. {seg}
                        </p>
                      ))}
                    </div>
                  ) : null}
                </>
              ) : null}
            </CardContent>
          </Card>
        </div>
      );
    }
    return this.props.children;
  }
}
