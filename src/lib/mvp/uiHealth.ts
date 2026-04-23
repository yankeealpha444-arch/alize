/**
 * Deterministic UI health / funnel checks for the Video MVP clip flow.
 * No external APIs — derives flags from component state and clip data only.
 */

export type VideoMvpPhase = "empty_upload" | "waiting" | "no_clips" | "main" | "unknown";

export type UIHealthSeverity = "critical" | "warning" | "info";

export type UIHealthIssue = {
  id: string;
  title: string;
  severity: UIHealthSeverity;
  reason: string;
  suggested_fix: string;
};

/** Snapshot of boolean signals used for reporting and issue derivation. */
export type UIHealthReport = {
  page_loaded: boolean;
  preview_rendered: boolean;
  video_visible: boolean;
  thumbnail_count: number;
  duplicate_thumbnails: boolean;
  primary_cta_visible: boolean;
  primary_cta_disabled: boolean;
  upload_state_visible: boolean;
  error_visible: boolean;
  empty_state_visible: boolean;
  best_clip_card_visible: boolean;
  clip_count: number;
  selected_clip_visible: boolean;
  /** Phase label for debugging / storage */
  phase: VideoMvpPhase;
  /** Job failed or player error */
  has_blocking_error: boolean;
};

export type BuildUIHealthReportInput = {
  phase: VideoMvpPhase;
  /** Original hero shows img or video */
  heroHasMedia: boolean;
  /** Lower Preview panel has a real player (iframe / video element), not only the unavailable message */
  previewPanelShowsPlayer: boolean;
  /** Player / embed error text is shown */
  playerOrJobError: boolean;
  /** Job row status failed */
  jobFailed: boolean;
  thumbnailUrls: ReadonlyArray<string | null | undefined>;
  clipCount: number;
  topRankedCount: number;
  /** First card is highlighted as best in UI */
  bestCardShown: boolean;
  /** Primary CTA context: empty upload "Get my clips" */
  emptyUploadPrimaryDisabled: boolean;
  emptyUploadPrimaryVisible: boolean;
  /** Selected clip row in DB or local focus */
  selectedClipId: string | null;
};

function countDuplicateUrls(urls: string[]): boolean {
  const counts = new Map<string, number>();
  for (const u of urls) {
    const k = u.trim();
    if (!k) continue;
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  for (const n of counts.values()) {
    if (n > 1) return true;
  }
  return false;
}

export function buildUIHealthReport(input: BuildUIHealthReportInput): UIHealthReport {
  const normalized = input.thumbnailUrls
    .map((u) => (typeof u === "string" ? u.trim() : ""))
    .filter(Boolean);

  const duplicate_thumbnails = countDuplicateUrls(normalized);
  const thumbnail_count = normalized.length;

  const empty_state_visible = input.phase === "empty_upload";
  const upload_state_visible = input.phase === "empty_upload" || input.phase === "waiting";
  const error_visible = input.playerOrJobError || input.jobFailed;

  const video_visible = input.heroHasMedia;
  const preview_rendered =
    input.previewPanelShowsPlayer && !input.playerOrJobError && !input.jobFailed;

  const primary_cta_visible = input.emptyUploadPrimaryVisible;
  const primary_cta_disabled = input.emptyUploadPrimaryDisabled;

  const clip_count = input.clipCount;
  const best_clip_card_visible = input.bestCardShown && input.topRankedCount >= 1;
  const selected_clip_visible =
    input.selectedClipId != null && input.selectedClipId.length > 0 && input.topRankedCount > 0;

  const has_blocking_error = input.jobFailed || Boolean(input.playerOrJobError);

  return {
    page_loaded: true,
    preview_rendered,
    video_visible,
    thumbnail_count,
    duplicate_thumbnails,
    primary_cta_visible,
    primary_cta_disabled,
    upload_state_visible,
    error_visible,
    empty_state_visible,
    best_clip_card_visible,
    clip_count,
    selected_clip_visible,
    phase: input.phase,
    has_blocking_error,
  };
}

/** Ranked issues: critical first, then warning, then info. */
export function deriveUIIssues(
  report: UIHealthReport,
  extra?: { waitingNoClipsAfterComplete?: boolean },
): UIHealthIssue[] {
  const out: UIHealthIssue[] = [];

  if (report.error_visible || report.has_blocking_error) {
    out.push({
      id: "blocking_error",
      title: "Error visible on page",
      severity: "critical",
      reason: "A job failure or playback error is shown to the user.",
      suggested_fix: "Retry upload or pick another clip; if it persists, check source URL and API configuration.",
    });
  }

  if (report.phase === "main" && !report.video_visible && report.clip_count > 0) {
    out.push({
      id: "hero_video_missing",
      title: "Original preview media missing",
      severity: "warning",
      reason: "Main clip view is active but the original hero has no YouTube thumbnail or file preview URL.",
      suggested_fix: "Verify the job has youtube_video_id or a valid uploaded source_path.",
    });
  }

  if (report.phase === "main" && !report.preview_rendered && report.clip_count > 0) {
    out.push({
      id: "preview_not_rendered",
      title: "Preview did not render cleanly",
      severity: "warning",
      reason: "The preview panel may be missing a player or an error blocked rendering.",
      suggested_fix: "Confirm embed URL, file URL, or press Play on the clip preview.",
    });
  }

  if (report.duplicate_thumbnails) {
    out.push({
      id: "duplicate_thumbnails",
      title: "Thumbnails appear duplicated",
      severity: "warning",
      reason: "Two or more clip cards use the same thumbnail image URL.",
      suggested_fix: "Check backend thumbnail generation or YouTube fallback usage per clip.",
    });
  }

  if (report.phase === "main" && report.clip_count > 0 && !report.best_clip_card_visible) {
    out.push({
      id: "no_best_highlight",
      title: "No best clip highlighted",
      severity: "warning",
      reason: "Clips exist but the top / Best card is not indicated.",
      suggested_fix: "Ensure ranked clips render and the first card shows the Best treatment.",
    });
  }

  if (report.empty_state_visible && report.primary_cta_visible && report.primary_cta_disabled) {
    out.push({
      id: "primary_cta_blocked",
      title: "Primary action not available",
      severity: "warning",
      reason: "Get my clips is visible but disabled (empty link field).",
      suggested_fix: "Paste a valid link or use Upload video.",
    });
  }

  if (report.empty_state_visible) {
    out.push({
      id: "empty_upload",
      title: "Page rendered empty upload state",
      severity: "info",
      reason: "No job is loaded yet — user must upload or paste a link.",
      suggested_fix: "Upload a file or paste a supported video URL to start.",
    });
  }

  if (extra?.waitingNoClipsAfterComplete || report.phase === "no_clips") {
    out.push({
      id: "upload_success_unclear",
      title: "Processing finished but no clip rows",
      severity: "warning",
      reason: "The job completed without generated clips in the database.",
      suggested_fix: "Check worker pipeline and video_clips rows for this job.",
    });
  }

  const severityRank: Record<UIHealthSeverity, number> = { critical: 0, warning: 1, info: 2 };
  out.sort((a, b) => severityRank[a.severity] - severityRank[b.severity]);
  return out;
}

export function uiHealthOverallStatus(issues: UIHealthIssue[]): "ok" | "degraded" | "blocked" {
  if (issues.some((i) => i.severity === "critical")) return "blocked";
  if (issues.some((i) => i.severity === "warning")) return "degraded";
  return "ok";
}

export function suggestedNextFix(issues: UIHealthIssue[]): string {
  const first = issues[0];
  return first?.suggested_fix ?? "No issues detected — continue the upload → clip → copy flow.";
}
