/** Fixed template ids — layouts are hardcoded in React, not generated. */
export type MvpTemplateId = "TOOL_TEMPLATE" | "FEED_TEMPLATE" | "WORKFLOW_TEMPLATE";

export interface MvpBuilderConfig {
  templateId: MvpTemplateId;
  productName: string;
  decidedAt: string;
  /** Fixed product template: Hook Generator + vertical (see `mvpBuilderConfigHookGenerator`). */
  hookTemplateName?: string;
  vertical?: string;
}

/** Shared tool preview copy + labels (ToolTemplateMVP). */
export type ToolSubtypeUiConfig = {
  guidingLine: string;
  textInputLabel?: string;
  textInputPlaceholder?: string;
  imageUploadLabel?: string;
  surfaceTitle?: string;
  surfaceSubtitle?: string;
  uploadHelper?: string;
  uploadAcceptedText?: string;
  nextStepsBullets?: string[];
  headerDetail?: string;
  inputLabel: string;
  primaryAction: string;
  resultTitle: string;
  saveSecondary: string;
  trySecondary: string;
  inputPlaceholder: string;
  emptyResultHint: string;
  emptyRunMessage: string;
};
