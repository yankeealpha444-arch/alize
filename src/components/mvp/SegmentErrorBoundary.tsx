import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { showAlizePreviewDebugUi } from "@/lib/mvp/previewDebugUi";

type Props = {
  children: ReactNode;
  segmentIndex: number;
  /** First 120 chars of segment prompt — DEV-only detail in fallback */
  segmentPreview?: string;
};

type State = { error: Error | null };

/**
 * Isolates one multi-tool segment: a crash in segment N does not unmount sibling segments.
 */
export default class SegmentErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.warn("[Alizé][MultiToolPreview] segment render failed", {
        segmentIndex: this.props.segmentIndex,
        message: error.message,
        componentStack: info.componentStack,
      });
    }
  }

  render() {
    if (this.state.error) {
      return (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-destructive">Tool {this.props.segmentIndex + 1} failed to render</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground space-y-2">
            <p className="font-mono text-foreground/90 break-all">{this.state.error.message}</p>
            {showAlizePreviewDebugUi() && this.props.segmentPreview ? (
              <p className="text-[10px] border-t border-border pt-2 mt-2">
                Segment (first 120 chars): <span className="text-foreground">{this.props.segmentPreview}</span>
              </p>
            ) : null}
          </CardContent>
        </Card>
      );
    }
    return this.props.children;
  }
}
