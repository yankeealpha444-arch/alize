import { patchMvpFlowState } from "@/lib/mvpFlowState";

export type VideoMvpSelectedClip = {
  label: string;
  score: number;
  multiplier: string;
  range: string;
  description: string;
};

/** Persisted clip row for reload + dashboard (matches hub `Clip` shape). */
export type VideoMvpClipSnapshot = {
  id: string;
  job_id: string;
  clip_index: number;
  start_time: number;
  end_time: number;
  score: number;
  caption: string;
  thumbnail_url: string;
  video_url: string | null;
  status: "ready" | "timestamps";
  youtube_video_id?: string | null;
};

export type VideoMvpSelectedThumbnail = {
  id: string;
  name: string;
  preview_url: string;
  score: number;
};

/** Manual stats entered in Ready to post (no API yet). */
export type VideoMvpManualMetrics = {
  views: number;
  likes: number;
  comments: number;
};

export type ThumbnailPerformanceTier = "Strong" | "Medium" | "Weak";

/** localStorage-backed video MVP project (AI CEO loop). No backend. */
export type VideoMvpProject = {
  id: string;
  type: "video_mvp";
  created_at: string;
  status: "draft" | "tracking";
  selected_clip: VideoMvpSelectedClip | null;
  /** Full clip row for UI + flowStore hydrate (canonical alongside `selected_clip` summary). */
  selected_clip_snapshot: VideoMvpClipSnapshot | null;
  selected_thumbnail: VideoMvpSelectedThumbnail | null;
  youtube_url: string | null;
  feedback: "yes" | "no" | null;
  /** Placeholder metrics (no real analytics yet). */
  metrics_placeholder: {
    views: string;
    ctr: string;
  };
  /** User-entered performance after posting (Ready to post). */
  manual_performance_metrics: VideoMvpManualMetrics | null;
  /** Derived from `manual_performance_metrics.views` for validation loop. */
  thumbnail_performance_tier: ThumbnailPerformanceTier | null;
};

const key = (id: string) => `alize_video_mvp_project_${id}`;

function formatRangeSeconds(start: number, end: number): string {
  const fmt = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds) % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };
  return `${fmt(start)}–${fmt(end)}`;
}

function multiplierForScore(score: number): string {
  if (score >= 90) return "2.4x";
  if (score >= 85) return "1.9x";
  if (score >= 75) return "1.4x";
  return "1.1x";
}

export function selectedSummaryFromClipSnapshot(
  snapshot: VideoMvpClipSnapshot,
  label: string,
): VideoMvpSelectedClip {
  return {
    label,
    score: snapshot.score,
    multiplier: multiplierForScore(snapshot.score),
    range: formatRangeSeconds(snapshot.start_time, snapshot.end_time),
    description: snapshot.caption,
  };
}

/** Accepts any object with the same fields as `VideoMvpClipSnapshot` (e.g. hub `Clip`). */
export function toClipSnapshot(clip: VideoMvpClipSnapshot): VideoMvpClipSnapshot {
  return { ...clip };
}

/** Validation tier from view count (manual entry loop). */
export function performanceTierFromViews(views: number): ThumbnailPerformanceTier {
  const v = Number.isFinite(views) && views >= 0 ? views : 0;
  if (v > 1000) return "Strong";
  if (v > 300) return "Medium";
  return "Weak";
}

/** Tier shown in dashboard when manual metrics exist (persisted tier or derived from views). */
export function resolvedThumbnailPerformanceTier(
  vp: Pick<VideoMvpProject, "manual_performance_metrics" | "thumbnail_performance_tier">,
): ThumbnailPerformanceTier | null {
  if (!vp.manual_performance_metrics) return null;
  return vp.thumbnail_performance_tier ?? performanceTierFromViews(vp.manual_performance_metrics.views);
}

export function thumbnailPerformanceBadgeLabel(tier: ThumbnailPerformanceTier): string {
  switch (tier) {
    case "Strong":
      return "Winning";
    case "Medium":
      return "Needs test";
    default:
      return "Improve first";
  }
}

export function thumbnailPerformanceNextAction(tier: ThumbnailPerformanceTier): string {
  switch (tier) {
    case "Strong":
      return "Keep this thumbnail. Test another clip next.";
    case "Medium":
      return "Keep the clip. Try a stronger thumbnail style.";
    default:
      return "Change the thumbnail before changing the clip.";
  }
}

export function persistVideoMvpClipSelection(
  projectId: string,
  clip: VideoMvpClipSnapshot,
  label: string,
): VideoMvpProject | null {
  const snapshot = toClipSnapshot(clip);
  return patchVideoMvpProject(projectId, {
    selected_clip_snapshot: snapshot,
    selected_clip: selectedSummaryFromClipSnapshot(snapshot, label),
  });
}

export function persistVideoMvpThumbnailSelection(
  projectId: string,
  thumb: VideoMvpSelectedThumbnail,
): VideoMvpProject | null {
  return patchVideoMvpProject(projectId, { selected_thumbnail: thumb });
}

export function persistVideoMvpManualPerformance(
  projectId: string,
  metrics: VideoMvpManualMetrics,
): VideoMvpProject | null {
  const tier = performanceTierFromViews(metrics.views);
  return patchVideoMvpProject(projectId, {
    manual_performance_metrics: metrics,
    thumbnail_performance_tier: tier,
  });
}

/** Clears clip, thumbnail, tracking URL, manual metrics, and tier — full Shorts test loop reset (local only). */
export function clearVideoMvpClipAndThumbnail(projectId: string): VideoMvpProject | null {
  try {
    localStorage.removeItem(`alize_clips_source_url_${projectId}`);
  } catch {
    /* ignore */
  }
  return patchVideoMvpProject(projectId, {
    selected_clip: null,
    selected_clip_snapshot: null,
    selected_thumbnail: null,
    youtube_url: null,
    manual_performance_metrics: null,
    thumbnail_performance_tier: null,
    feedback: null,
    status: "draft",
  });
}

function migrateThumbnail(raw: unknown): VideoMvpSelectedThumbnail | null {
  if (!raw || typeof raw !== "object") return null;
  const t = raw as Record<string, unknown>;
  const name = typeof t.name === "string" ? t.name : "";
  const preview_url =
    typeof t.preview_url === "string"
      ? t.preview_url
      : typeof t.previewUrl === "string"
        ? t.previewUrl
        : "";
  if (!name && !preview_url) return null;
  const id =
    typeof t.id === "string" && t.id.length > 0
      ? t.id
      : `legacy-${preview_url.slice(-12) || "thumb"}`;
  const score = typeof t.score === "number" && Number.isFinite(t.score) ? t.score : 80;
  return { id, name: name || "Thumbnail", preview_url, score };
}

export function getVideoMvpProject(id: string): VideoMvpProject | null {
  try {
    const raw = localStorage.getItem(key(id));
    if (!raw) return null;
    const p = JSON.parse(raw) as VideoMvpProject & {
      selected_clip_snapshot?: VideoMvpClipSnapshot | null;
    };
    if (p?.type !== "video_mvp" || p?.id !== id) return null;
    if (!p.metrics_placeholder) {
      p.metrics_placeholder = { views: "12,420", ctr: "3.2%" };
    }
    if (p.selected_clip_snapshot === undefined) p.selected_clip_snapshot = null;
    if (p.manual_performance_metrics === undefined) p.manual_performance_metrics = null;
    if (p.thumbnail_performance_tier === undefined) p.thumbnail_performance_tier = null;
    if (p.manual_performance_metrics && p.thumbnail_performance_tier === null) {
      p.thumbnail_performance_tier = performanceTierFromViews(p.manual_performance_metrics.views);
    }
    const migratedThumb = migrateThumbnail(p.selected_thumbnail);
    p.selected_thumbnail = migratedThumb;
    return p;
  } catch {
    return null;
  }
}

export function saveVideoMvpProject(p: VideoMvpProject): void {
  localStorage.setItem(key(p.id), JSON.stringify(p));
  syncMvpFlowFromVideoProject(p);
  window.dispatchEvent(new Event("alize-video-mvp-project-updated"));
}

/** New project on “Get my clips”; replaces current `alize_projectId`. */
export function createVideoMvpProject(): VideoMvpProject {
  const id = crypto.randomUUID();
  const p: VideoMvpProject = {
    id,
    type: "video_mvp",
    created_at: new Date().toISOString(),
    status: "draft",
    selected_clip: null,
    selected_clip_snapshot: null,
    selected_thumbnail: null,
    youtube_url: null,
    feedback: null,
    metrics_placeholder: { views: "12,420", ctr: "3.2%" },
    manual_performance_metrics: null,
    thumbnail_performance_tier: null,
  };
  localStorage.setItem("alize_projectId", id);
  saveVideoMvpProject(p);
  return p;
}

/** Use before clip/thumbnail steps if user skipped upload. */
export function ensureVideoMvpProjectId(): string {
  let pid = localStorage.getItem("alize_projectId");
  if (!pid || !getVideoMvpProject(pid)) {
    createVideoMvpProject();
    pid = localStorage.getItem("alize_projectId")!;
  }
  return pid;
}

export function patchVideoMvpProject(id: string, patch: Partial<VideoMvpProject>): VideoMvpProject | null {
  const cur = getVideoMvpProject(id);
  if (!cur) return null;
  const next: VideoMvpProject = { ...cur, ...patch, id: cur.id };
  saveVideoMvpProject(next);
  return next;
}

export function syncMvpFlowFromVideoProject(p: VideoMvpProject): void {
  patchMvpFlowState({
    mvpFlowProjectId: p.id,
    selectedClip: p.selected_clip,
    selectedThumbnailUrl: p.selected_thumbnail?.preview_url ?? null,
  });
}

/** Rules-based “AI CEO” line for founder + public (no model). */
export function ceoInsight(vp: VideoMvpProject | null): string {
  if (!vp) {
    return "Post your video, then paste the live link and start tracking.";
  }
  if (!vp.youtube_url && vp.status === "draft") {
    return "Post your video, then paste the live YouTube link here and start tracking.";
  }
  if (vp.feedback === "no") {
    return "Try a different clip or thumbnail.";
  }
  if (vp.feedback === "yes") {
    return "Scale this content or test another variation.";
  }
  if (vp.status === "tracking" && !vp.feedback) {
    return "We will compare which clip and thumbnail perform best once data is available.";
  }
  return "Keep tracking and add feedback when you have a read on performance.";
}
