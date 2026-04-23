import { formatTime, type Clip } from "@/data/demoClips";
import { posterUrlForYoutubeOrEmpty } from "../../../src/lib/mvp/thumbnailPosterSource";

const CLIP_ROLES = ["Hook clip", "Mid payoff", "Closing takeaway"] as const;

/**
 * Three preview windows from total duration D (seconds):
 * - Clip 1: 0 → min(15s, D)
 * - Clip 2: 30%–45% of D
 * - Clip 3: 60%–75% of D
 */
export function computeYoutubeClipWindows(durationSec: number): { start: number; end: number }[] {
  const D = Math.max(1, durationSec);

  const clampSeg = (s: number, e: number) => {
    const start = Math.max(0, Math.min(s, D));
    let end = Math.max(e, start + 0.5);
    end = Math.min(D, end);
    if (end <= start) end = Math.min(D, start + 0.5);
    return { start, end };
  };

  const w1 = clampSeg(0, Math.min(15, D));
  const w2 = clampSeg(D * 0.3, D * 0.45);
  const w3 = clampSeg(D * 0.6, D * 0.75);

  return [w1, w2, w3];
}

function captionForSegment(index: 0 | 1 | 2, start: number, end: number, D: number): string {
  const range = `${formatTime(start)}–${formatTime(end)}`;
  const role = CLIP_ROLES[index];
  if (index === 0) {
    return D <= 15
      ? `${role} · ${range} (full start of video)`
      : `${role} · ${range} (first up to 15s)`;
  }
  if (index === 1) {
    return `${role} · ${range} (30%–45% of video length)`;
  }
  return `${role} · ${range} (60%–75% of video length)`;
}

const SCORES = [94, 87, 79];

/** Build 3 Clip rows from a YouTube video id + duration (deterministic windows, not AI). */
export function buildYoutubeClipsFromDuration(videoId: string, durationSec: number): Clip[] {
  const D = Math.max(1, durationSec);
  const windows = computeYoutubeClipWindows(D);
  const thumb = posterUrlForYoutubeOrEmpty(videoId);

  return windows.map((w, i) => ({
    id: `yt-seg-${videoId}-${i}`,
    job_id: `yt-local-${videoId}`,
    clip_index: i,
    start_time: w.start,
    end_time: w.end,
    score: SCORES[i] ?? 80 - i * 5,
    caption: captionForSegment(i as 0 | 1 | 2, w.start, w.end, D),
    thumbnail_url: thumb,
    video_url: null,
    status: "ready" as const,
    youtube_video_id: videoId,
  }));
}
