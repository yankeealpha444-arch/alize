import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Props = { children: ReactNode };

type State = { error: Error | null };

/**
 * Prevents a classification / pipeline / preview subtree error from blanking the entire Preview page.
 */
export default class MvpPreviewErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn("[Alizé] MvpPreviewErrorBoundary", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <Card className="max-w-lg mx-auto mt-6 border-destructive/40 bg-destructive/5">
          <CardHeader>
            <CardTitle className="text-base text-destructive">Preview could not render</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>Something went wrong in the MVP preview. Your idea is unchanged — try refreshing or simplifying the prompt.</p>
            <p className="font-mono text-xs break-all text-foreground/80">{this.state.error.message}</p>
          </CardContent>
        </Card>
      );
    }
    return this.props.children;
  }
}
