import { useEffect, useMemo, useState } from "react";
import { ExternalLink, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getVideoMvpProject,
  resolvedThumbnailPerformanceTier,
  thumbnailPerformanceBadgeLabel,
  thumbnailPerformanceNextAction,
  type ThumbnailPerformanceTier,
} from "@/lib/videoMvpProject";

type Props = {
  /** `alize_projectId` / video MVP project id (same as `VideoMvpSessionPanel`). */
  projectId: string;
};

function tierBadgeClass(tier: ThumbnailPerformanceTier): string {
  switch (tier) {
    case "Strong":
      return "border-emerald-500/40 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100";
    case "Medium":
      return "border-amber-500/40 bg-amber-500/10 text-amber-950 dark:text-amber-100";
    default:
      return "border-border bg-muted text-foreground";
  }
}

export default function ThumbnailTestResultCard({ projectId }: Props) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const fn = () => setTick((t) => t + 1);
    window.addEventListener("alize-video-mvp-project-updated", fn);
    return () => window.removeEventListener("alize-video-mvp-project-updated", fn);
  }, []);

  const vp = useMemo(() => getVideoMvpProject(projectId), [projectId, tick]);
  if (!vp) return null;

  const hasResult = vp.manual_performance_metrics != null;
  const tier = hasResult ? resolvedThumbnailPerformanceTier(vp) : null;
  const m = vp.manual_performance_metrics;

  return (
    <section className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Thumbnail test result
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Based on your saved manual stats from the Video MVP flow.
          </p>
        </div>
        {tier ? (
          <span
            className={cn(
              "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold",
              tierBadgeClass(tier),
            )}
          >
            {thumbnailPerformanceBadgeLabel(tier)}
          </span>
        ) : null}
      </div>

      {!hasResult || !tier ? (
        <p className="text-sm text-muted-foreground leading-relaxed">
          No thumbnail test result yet. Post your video and track performance first.
        </p>
      ) : (
        <>
          <div className="rounded-lg border border-border/50 bg-background px-3 py-2 text-sm">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Selected clip
            </p>
            <p className="mt-0.5 font-medium text-foreground">
              {vp.selected_clip?.label ?? "—"}
              {vp.selected_clip?.range ? (
                <span className="text-muted-foreground"> · {vp.selected_clip.range}</span>
              ) : null}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border/60 bg-background p-3">
            <div className="flex h-12 w-16 shrink-0 items-center justify-center overflow-hidden rounded border border-border/40 bg-muted">
              {vp.selected_thumbnail?.preview_url ? (
                <img
                  src={vp.selected_thumbnail.preview_url}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <ImageIcon className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Selected thumbnail
              </p>
              <p className="truncate text-sm font-semibold text-foreground">
                {vp.selected_thumbnail?.name ?? "—"}
              </p>
            </div>
          </div>

          {vp.youtube_url ? (
            <p className="text-xs text-muted-foreground break-all">
              <span className="font-medium text-foreground">YouTube: </span>
              <a
                href={vp.youtube_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline"
              >
                {vp.youtube_url}
                <ExternalLink className="h-3 w-3 shrink-0" />
              </a>
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">No YouTube URL saved yet.</p>
          )}

          {m ? (
            <div className="grid grid-cols-3 gap-3 text-center sm:text-left">
              <div className="rounded-lg border border-border/50 bg-background px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Views</p>
                <p className="mt-0.5 text-lg font-bold tabular-nums text-foreground">{m.views}</p>
              </div>
              <div className="rounded-lg border border-border/50 bg-background px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Likes</p>
                <p className="mt-0.5 text-lg font-bold tabular-nums text-foreground">{m.likes}</p>
              </div>
              <div className="rounded-lg border border-border/50 bg-background px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Comments</p>
                <p className="mt-0.5 text-lg font-bold tabular-nums text-foreground">{m.comments}</p>
              </div>
            </div>
          ) : null}

          <div className="space-y-1 rounded-lg border border-foreground/15 bg-muted/30 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Performance tier
            </p>
            <p className="text-sm font-semibold text-foreground">
              This thumbnail is performing: {tier}
            </p>
            <p className="text-sm text-foreground/90 leading-relaxed">{thumbnailPerformanceNextAction(tier)}</p>
          </div>
        </>
      )}
    </section>
  );
}
