/**
 * Opt-in preview diagnostics (router strip, classification labels, smoke panels, DEV snippets).
 * Set `VITE_ALIZE_PREVIEW_DEBUG=true` in `.env` to enable. Default: off in all builds.
 */
export function showAlizePreviewDebugUi(): boolean {
  return import.meta.env.VITE_ALIZE_PREVIEW_DEBUG === "true";
}
