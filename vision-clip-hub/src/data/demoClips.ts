import clipThumb1 from "@/assets/clip-thumb-1.jpg";
import clipThumb2 from "@/assets/clip-thumb-2.jpg";
import clipThumb3 from "@/assets/clip-thumb-3.jpg";
import clipThumb4 from "@/assets/clip-thumb-4.jpg";

export interface Clip {
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
  /** Present for YouTube-sourced segments — in-page preview uses embed (see ClipColumn). */
  youtube_video_id?: string | null;
}

const SAMPLE_VIDEO =
  "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";

/** Public sample MP4 when no rendered clip file exists yet (preview + poster). */
export const CLIP_PREVIEW_FALLBACK_VIDEO = SAMPLE_VIDEO;

const DEMO_JOB_ID = "demo-job-001";

export const demoSourceName = "summer_concert_final_v2.mp4";

export const demoClips: Clip[] = [
  {
    id: "demo-clip-1",
    job_id: DEMO_JOB_ID,
    clip_index: 0,
    start_time: 32,
    end_time: 71,
    score: 94,
    caption: "Hook lands fast and chorus is familiar",
    thumbnail_url: clipThumb1,
    video_url: SAMPLE_VIDEO,
    status: "ready",
  },
  {
    id: "demo-clip-2",
    job_id: DEMO_JOB_ID,
    clip_index: 1,
    start_time: 45,
    end_time: 91,
    score: 87,
    caption: "Strong motion and recognisable moment",
    thumbnail_url: clipThumb2,
    video_url: SAMPLE_VIDEO,
    status: "ready",
  },
  {
    id: "demo-clip-3",
    job_id: DEMO_JOB_ID,
    clip_index: 2,
    start_time: 58,
    end_time: 71,
    score: 79,
    caption: "Short punchy section for quick testing",
    thumbnail_url: clipThumb3,
    video_url: SAMPLE_VIDEO,
    status: "ready",
  },
  {
    id: "demo-clip-4",
    job_id: DEMO_JOB_ID,
    clip_index: 3,
    start_time: 12,
    end_time: 48,
    score: 72,
    caption: "Energy builds with crowd reaction",
    thumbnail_url: clipThumb4,
    video_url: SAMPLE_VIDEO,
    status: "ready",
  },
];

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds) % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** Wall-clock span of the clip segment (end − start), in seconds. */
export function clipDurationSeconds(startTime: number, endTime: number): number {
  return Math.max(0, endTime - startTime);
}

/** Short label: under 60s → `15s`, otherwise `1:05`. */
export function formatClipLengthLabel(durationSec: number): string {
  if (!Number.isFinite(durationSec) || durationSec <= 0) return "—";
  if (durationSec < 60) return `${Math.max(1, Math.round(durationSec))}s`;
  const m = Math.floor(durationSec / 60);
  const s = Math.round(durationSec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
