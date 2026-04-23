import { useState, useEffect } from "react";
import { z } from "zod";
import { Download, ExternalLink, Link2, Package, Rocket, CheckCircle2, BarChart3, RotateCcw } from "lucide-react";
import type { Clip } from "@/data/demoClips";
import type { ThumbnailOption } from "./ThumbnailPicker";
import {
  ensureVideoMvpProjectId,
  getVideoMvpProject,
  patchVideoMvpProject,
  persistVideoMvpManualPerformance,
  performanceTierFromViews,
  thumbnailPerformanceBadgeLabel,
  thumbnailPerformanceNextAction,
} from "../../../src/lib/videoMvpProject";

interface ReadyToPostProps {
  clip: Clip;
  thumbnail: ThumbnailOption;
  /** e.g. 0:12–0:45 */
  clipTimeLabel: string;
  /** Rank label e.g. "Clean cut" */
  clipRankLabel?: string;
  onChangeThumbnail: () => void;
  onRunAnotherTest: () => void;
}

const youtubeUrlSchema = z
  .string()
  .trim()
  .max(500, { message: "Link is too long" })
  .url({ message: "Please paste a valid URL" })
  .refine(
    (url) => /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//i.test(url),
    { message: "Must be a YouTube link" },
  );

function sanitizeDigits(raw: string): string {
  return raw.replace(/\D/g, "");
}

function parseMetricInt(raw: string): number {
  const d = sanitizeDigits(raw);
  if (d === "") return 0;
  const n = Number.parseInt(d, 10);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export default function ReadyToPost({
  clip,
  thumbnail,
  clipTimeLabel,
  clipRankLabel,
  onChangeThumbnail,
  onRunAnotherTest,
}: ReadyToPostProps) {
  const clipName = `Clip ${clip.clip_index + 1}`;
  const [ytLink, setYtLink] = useState("");
  const [ytError, setYtError] = useState<string | null>(null);
  const [tracking, setTracking] = useState(false);
  const [viewsStr, setViewsStr] = useState("0");
  const [likesStr, setLikesStr] = useState("0");
  const [commentsStr, setCommentsStr] = useState("0");

  useEffect(() => {
    const pid = ensureVideoMvpProjectId();
    const p = getVideoMvpProject(pid);
    if (!p) return;
    if (p.youtube_url) {
      setYtLink(p.youtube_url);
      setTracking(true);
    }
    const m = p.manual_performance_metrics;
    if (m) {
      setViewsStr(String(m.views));
      setLikesStr(String(m.likes));
      setCommentsStr(String(m.comments));
    }
  }, []);

  const viewsNum = parseMetricInt(viewsStr);
  const currentTier = performanceTierFromViews(viewsNum);
  const hasNoYoutube = !ytLink.trim();
  const metricsAllZero = viewsNum === 0 && parseMetricInt(likesStr) === 0 && parseMetricInt(commentsStr) === 0;

  const persistCurrentMetrics = (v: string, l: string, c: string) => {
    const pid = ensureVideoMvpProjectId();
    persistVideoMvpManualPerformance(pid, {
      views: parseMetricInt(v),
      likes: parseMetricInt(l),
      comments: parseMetricInt(c),
    });
  };

  const handleOpenYouTube = () => {
    window.open("https://studio.youtube.com/channel/UC/videos/upload", "_blank", "noopener,noreferrer");
  };

  const handleTrackPerformance = () => {
    const result = youtubeUrlSchema.safeParse(ytLink);
    if (!result.success) {
      setYtError(result.error.issues[0]?.message ?? "Invalid link");
      return;
    }
    setYtError(null);
    const pid = ensureVideoMvpProjectId();
    const url = result.data.trim();
    patchVideoMvpProject(pid, { youtube_url: url, status: "tracking" });
    setTracking(true);
    const p = getVideoMvpProject(pid);
    if (!p?.manual_performance_metrics) {
      setViewsStr("0");
      setLikesStr("0");
      setCommentsStr("0");
      persistVideoMvpManualPerformance(pid, { views: 0, likes: 0, comments: 0 });
    }
  };

  const handleDownloadClip = () => {
    if (!clip.video_url) return;
    const a = document.createElement("a");
    a.href = clip.video_url;
    a.download = `${clipName.replace(/\s+/g, "_")}.mp4`;
    a.target = "_blank";
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handleDownloadThumb = () => {
    const a = document.createElement("a");
    a.href = thumbnail.src;
    a.download = `${thumbnail.name.replace(/\s+/g, "_")}.jpg`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handleDownloadPack = () => {
    handleDownloadClip();
    setTimeout(handleDownloadThumb, 400);
  };

  return (
    <section className="mt-16 rounded-2xl border border-border/60 bg-card p-6 sm:p-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3 min-w-0">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-foreground text-background">
            <Rocket className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <div className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
              Step 4 — Post and track performance
            </div>
            <h2 className="mt-1 font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Post and track performance
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Upload your Short, apply this thumbnail, then paste your live link and add your latest stats.
            </p>
            <p className="mt-2 text-xs text-foreground">
              <span className="font-semibold">Selected clip:</span>{" "}
              {clipRankLabel ? `${clipRankLabel} · ` : null}
              {clipName} ({clipTimeLabel})
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <button
            type="button"
            onClick={onChangeThumbnail}
            className="inline-flex items-center justify-center gap-1.5 rounded-md border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted"
          >
            Change thumbnail
          </button>
          <button
            type="button"
            onClick={onRunAnotherTest}
            className="inline-flex items-center justify-center gap-1.5 rounded-md border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Run another test
          </button>
        </div>
      </div>

      {/* Combo preview */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="overflow-hidden rounded-lg border border-border/40 bg-background min-w-0">
          <div className="relative aspect-video w-full overflow-hidden bg-muted">
            {clip.thumbnail_url && (
              <img
                src={clip.thumbnail_url}
                alt={clipName}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            )}
            <span className="absolute left-2 top-2 rounded-md bg-background/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-foreground backdrop-blur-sm">
              Clip
            </span>
          </div>
          <div className="p-4">
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Selected clip</p>
            <p className="mt-1 text-sm font-semibold text-foreground break-words">{clipName}</p>
            <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2 break-words">{clip.caption}</p>
            <button
              type="button"
              onClick={handleDownloadClip}
              disabled={!clip.video_url}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md border border-border/60 bg-transparent px-3 py-2 text-xs font-medium text-foreground/80 transition-colors hover:border-foreground/60 hover:text-foreground disabled:opacity-50 disabled:hover:border-border/60"
            >
              <Download className="h-3.5 w-3.5" />
              Download clip
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-border/40 bg-background min-w-0">
          <div className="relative aspect-video w-full overflow-hidden bg-muted">
            <img
              src={thumbnail.src}
              alt={thumbnail.name}
              className="h-full w-full object-cover"
              loading="lazy"
            />
            <span className="absolute left-2 top-2 rounded-md bg-background/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-foreground backdrop-blur-sm">
              Thumbnail
            </span>
          </div>
          <div className="p-4">
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Selected thumbnail</p>
            <p className="mt-1 text-sm font-semibold text-foreground break-words">{thumbnail.name}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Predicted lift {thumbnail.uplift}</p>
            <button
              type="button"
              onClick={handleDownloadThumb}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md border border-border/60 bg-transparent px-3 py-2 text-xs font-medium text-foreground/80 transition-colors hover:border-foreground/60 hover:text-foreground"
            >
              <Download className="h-3.5 w-3.5" />
              Download thumbnail
            </button>
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3 rounded-lg border border-foreground/20 bg-foreground p-4 text-background sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <Package className="h-5 w-5 shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-semibold">Full post pack</p>
            <p className="text-xs text-background/70">Clip + thumbnail in one go</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleDownloadPack}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md bg-background px-4 py-2 text-sm font-semibold text-foreground transition-transform hover:scale-[1.02] active:scale-100"
        >
          <Download className="h-4 w-4" />
          Download full pack
        </button>
      </div>

      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
        Upload your clip to YouTube Shorts and apply this thumbnail during upload.
      </p>

      <div className="mt-6 flex flex-col gap-3 rounded-lg border border-border/40 bg-background p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">Post to YouTube</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Open YouTube Studio to upload your clip.</p>
        </div>
        <button
          type="button"
          onClick={handleOpenYouTube}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md border border-foreground/40 bg-transparent px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-foreground hover:text-background"
        >
          <ExternalLink className="h-4 w-4" />
          Open YouTube upload
        </button>
      </div>

      <div className="mt-4 rounded-lg border border-border/40 bg-background p-4">
        <label htmlFor="yt-video-link" className="flex items-center gap-2">
          <Link2 className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">Paste your YouTube video link</span>
        </label>
        <p className="mt-1 text-xs text-muted-foreground">
          {hasNoYoutube && !tracking
            ? "Paste your video link to track performance"
            : "Use the live URL from your published Short."}
        </p>

        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            id="yt-video-link"
            type="url"
            inputMode="url"
            placeholder="https://www.youtube.com/watch?v=…"
            value={ytLink}
            onChange={(e) => {
              setYtLink(e.target.value);
              if (ytError) setYtError(null);
            }}
            maxLength={500}
            aria-invalid={!!ytError}
            aria-describedby={ytError ? "yt-link-error" : undefined}
            className="min-w-0 flex-1 rounded-md border border-border/60 bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/70 focus:border-foreground/60 focus:outline-none focus:ring-1 focus:ring-foreground/30"
          />
          <button
            type="button"
            onClick={handleTrackPerformance}
            disabled={!ytLink.trim()}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md bg-foreground px-4 py-2 text-sm font-semibold text-background transition-transform hover:scale-[1.02] active:scale-100 disabled:opacity-50 disabled:hover:scale-100"
          >
            Track performance
          </button>
        </div>

        {ytError && (
          <p id="yt-link-error" role="alert" className="mt-2 text-xs text-red-600 dark:text-red-400">
            {ytError}
          </p>
        )}

        {tracking && !ytError && (
          <>
            <div className="mt-4 flex items-start gap-2 rounded-md border border-foreground/20 bg-foreground/5 p-3">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-foreground" />
              <p className="text-sm text-foreground">
                <span className="font-semibold">Link saved.</span> Add your current numbers from YouTube Studio
                below.
              </p>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border/40 pt-4">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-semibold text-foreground">Your performance</p>
            </div>
            {metricsAllZero ? (
              <p className="mt-2 text-xs text-muted-foreground">Enter your current performance to evaluate</p>
            ) : null}

            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <div>
                <label htmlFor="metric-views" className="text-xs font-medium text-muted-foreground">
                  Views
                </label>
                <input
                  id="metric-views"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="off"
                  value={viewsStr}
                  onChange={(e) => {
                    const next = sanitizeDigits(e.target.value);
                    setViewsStr(next);
                    persistCurrentMetrics(next, likesStr, commentsStr);
                  }}
                  className="mt-1 w-full min-w-0 rounded-md border border-border/60 bg-card px-3 py-2 text-sm text-foreground focus:border-foreground/60 focus:outline-none focus:ring-1 focus:ring-foreground/30"
                />
              </div>
              <div>
                <label htmlFor="metric-likes" className="text-xs font-medium text-muted-foreground">
                  Likes
                </label>
                <input
                  id="metric-likes"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="off"
                  value={likesStr}
                  onChange={(e) => {
                    const next = sanitizeDigits(e.target.value);
                    setLikesStr(next);
                    persistCurrentMetrics(viewsStr, next, commentsStr);
                  }}
                  className="mt-1 w-full min-w-0 rounded-md border border-border/60 bg-card px-3 py-2 text-sm text-foreground focus:border-foreground/60 focus:outline-none focus:ring-1 focus:ring-foreground/30"
                />
              </div>
              <div>
                <label htmlFor="metric-comments" className="text-xs font-medium text-muted-foreground">
                  Comments
                </label>
                <input
                  id="metric-comments"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="off"
                  value={commentsStr}
                  onChange={(e) => {
                    const next = sanitizeDigits(e.target.value);
                    setCommentsStr(next);
                    persistCurrentMetrics(viewsStr, likesStr, next);
                  }}
                  className="mt-1 w-full min-w-0 rounded-md border border-border/60 bg-card px-3 py-2 text-sm text-foreground focus:border-foreground/60 focus:outline-none focus:ring-1 focus:ring-foreground/30"
                />
              </div>
            </div>

            <div className="mt-5 space-y-3 rounded-lg border border-border/60 bg-muted/30 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-semibold text-foreground">
                  {thumbnailPerformanceBadgeLabel(currentTier)}
                </span>
                <p className="text-sm font-semibold text-foreground">
                  This thumbnail is performing: {currentTier}
                </p>
              </div>
              <p className="text-sm text-foreground leading-relaxed">{thumbnailPerformanceNextAction(currentTier)}</p>
              <p className="text-xs text-muted-foreground">
                Tier uses views only: over 1000 = Strong, over 300 = Medium, otherwise Weak.
              </p>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
