import type { Clip } from "@/data/demoClips";
import { formatTime } from "@/data/demoClips";
import { framesTooSimilar } from "@/lib/frameSimilarity";
import {
  buildThreeStyledThumbnailDataUrls,
  reasonForStyledOption,
} from "@/lib/thumbnailStyleTransforms";
import type { ThumbnailOption } from "@/lib/thumbnailOptionTypes";
import {
  captureFramesAtSourceTimes,
  captureSingleFrame,
  extendedCandidateRatios,
  pickSpreadFrameTimes,
} from "@/lib/thumbnailFrameCapture";

export type ThumbnailBuildMode =
  | "video_frames"
  | "distinct_urls"
  | "single_poster_triplicate"
  | "static_demo";

export type ThumbnailBuildMeta = {
  mode: ThumbnailBuildMode;
  detail: string;
};

export type ThumbnailBuildStats = {
  mode: ThumbnailBuildMode;
  /** Non-null JPEG data URLs from the first spread-time batch (0–3). */
  primaryFrameHits: number;
  /** Total seek+capture attempts in the video path (including gap-fill). */
  captureAttempts: number;
  visuallyDistinctFrames: number;
  /** True when we had ≥2 distinct canvas frames so URL/single-poster was skipped. */
  skippedEarlyFallback: boolean;
};

let lastBuildStats: ThumbnailBuildStats | null = null;

/** Session counts (resets on full page reload) — for debugging which path ran most often. */
const modeHistogram: Partial<Record<ThumbnailBuildMode, number>> = {};

function bumpModeHistogram(mode: ThumbnailBuildMode) {
  modeHistogram[mode] = (modeHistogram[mode] ?? 0) + 1;
}

export function getLastThumbnailBuildStats(): ThumbnailBuildStats | null {
  return lastBuildStats;
}

export function getThumbnailModeHistogram(): Record<ThumbnailBuildMode, number> {
  return {
    video_frames: modeHistogram.video_frames ?? 0,
    distinct_urls: modeHistogram.distinct_urls ?? 0,
    single_poster_triplicate: modeHistogram.single_poster_triplicate ?? 0,
    static_demo: modeHistogram.static_demo ?? 0,
  };
}

/**
 * Dev timeout path: real YouTube stills or clip poster → three styled social thumbnails (no bundled fakes).
 */
export async function buildDevDeterministicThumbnailOptions(
  clip: Clip | null,
  youtubeVideoId: string | null,
): Promise<{ options: ThumbnailOption[]; meta: ThumbnailBuildMeta }> {
  const idBase = clip?.id ?? "unknown";
  const start = clip?.start_time ?? 0;
  const end = clip?.end_time ?? 0;
  const win = `${formatTime(start)}–${formatTime(end)}`;
  const yt = youtubeVideoId?.trim();

  if (yt) {
    const styled = await buildThreeStyledThumbnailDataUrls([
      { url: `https://img.youtube.com/vi/${yt}/1.jpg` },
      { url: `https://img.youtube.com/vi/${yt}/2.jpg` },
      { url: `https://img.youtube.com/vi/${yt}/3.jpg` },
    ]);
    const options: ThumbnailOption[] = styled.map((s, i) => ({
      id: `dev-yt-styled-${idBase}-${i}`,
      name: s.style,
      src: s.url,
      score: 91 - i * 2,
      uplift: i === 0 ? "2.2x" : i === 1 ? "1.9x" : "1.6x",
      reason: `${reasonForStyledOption(s.style, undefined, formatTime, s.usedRawFallback)} Dev fallback: YouTube stills 1–3 for ${yt}. ${win}.`,
    }));
    return {
      options,
      meta: {
        mode: "static_demo",
        detail: `Dev fallback: styled img.youtube.com/v/${yt}/1–3.jpg. ${win}.`,
      },
    };
  }

  const poster = (clip?.thumbnail_url ?? "").trim();
  if (poster) {
    const styled = await buildThreeStyledThumbnailDataUrls([{ url: poster }]);
    const options: ThumbnailOption[] = styled.map((s, i) => ({
      id: `dev-poster-styled-${idBase}-${i}`,
      name: s.style,
      src: s.url,
      score: scoreTier(i, 88),
      uplift: i === 0 ? "2.1x" : i === 1 ? "1.8x" : "1.5x",
      reason: `${reasonForStyledOption(s.style, undefined, formatTime, s.usedRawFallback)} Dev shortcut: clip poster only (${win}).`,
    }));
    return {
      options,
      meta: {
        mode: "static_demo",
        detail: `Dev fallback: styled variants from clip thumbnail_url only (no YouTube id). ${win}.`,
      },
    };
  }

  return {
    options: [],
    meta: {
      mode: "static_demo",
      detail: `Dev fallback: no YouTube id and no clip thumbnail_url — cannot build thumbnails for ${idBase} (${win}).`,
    },
  };
}

/**
 * Timeout / error path: real YouTube or clip poster URLs only → styled variants (no bundled demo art).
 */
export async function buildDeterministicFallbackOptions(
  clip: Clip | null,
  youtubeVideoId: string | null,
): Promise<{ options: ThumbnailOption[]; meta: ThumbnailBuildMeta }> {
  const yt = youtubeVideoId?.trim();

  if (yt) {
    const idBase = clip?.id ?? yt;
    const urls: string[] = [];
    const seen = new Set<string>();
    const push = (u: string) => {
      const x = u.trim();
      if (x && !seen.has(x)) {
        seen.add(x);
        urls.push(x);
      }
    };
    const thumb = (clip?.thumbnail_url ?? "").trim();
    push(thumb || `https://img.youtube.com/vi/${yt}/hqdefault.jpg`);
    push(`https://img.youtube.com/vi/${yt}/mqdefault.jpg`);
    push(`https://img.youtube.com/vi/${yt}/sddefault.jpg`);
    for (let n = 1; urls.length < 3 && n <= 8; n += 1) {
      push(`https://img.youtube.com/vi/${yt}/${n}.jpg`);
    }
    const slice = urls.slice(0, 3);
    const start = clip?.start_time ?? 0;
    const end = clip?.end_time ?? 0;
    const win = `${formatTime(start)}–${formatTime(end)}`;
    const styled = await buildThreeStyledThumbnailDataUrls(slice.map((u) => ({ url: u })));
    const options: ThumbnailOption[] = styled.map((s, i) => ({
      id: `df-yt-styled-${idBase}-${i}`,
      name: s.style,
      src: s.url,
      score: scoreTier(i, 88),
      uplift: i === 0 ? "2.0x" : i === 1 ? "1.7x" : "1.4x",
      reason: `${reasonForStyledOption(s.style, undefined, formatTime, s.usedRawFallback)} Timeout fallback: YouTube-linked stills (${win}).`,
    }));
    return {
      options,
      meta: {
        mode: "distinct_urls",
        detail: `deterministic_fallback: styled YouTube / poster URLs for ${yt}.`,
      },
    };
  }

  if (clip) {
    const idBase = clip.id;
    const start = clip.start_time ?? 0;
    const end = clip.end_time ?? 0;
    const win = `${formatTime(start)}–${formatTime(end)}`;
    const poster = (clip.thumbnail_url ?? "").trim();
    if (poster) {
      const styled = await buildThreeStyledThumbnailDataUrls([{ url: poster }]);
      const options: ThumbnailOption[] = styled.map((s, i) => ({
        id: `df-poster-styled-${idBase}-${i}`,
        name: s.style,
        src: s.url,
        score: 88 - i * 3,
        uplift: i === 0 ? "2.0x" : i === 1 ? "1.7x" : "1.5x",
        reason: `${reasonForStyledOption(s.style, undefined, formatTime, s.usedRawFallback)} Timeout fallback: clip poster only (${win}).`,
      }));
      return {
        options,
        meta: {
          mode: "static_demo",
          detail: `deterministic_fallback: styled variants from clip thumbnail_url. ${win}.`,
        },
      };
    }
  }

  return {
    options: [],
    meta: {
      mode: "static_demo",
      detail:
        "deterministic_fallback: no clip or no usable poster URL — thumbnails not generated.",
    },
  };
}

function scoreTier(i: number, base: number): number {
  return Math.max(70, base - i * 3);
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function probeImageLoads(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
    window.setTimeout(() => resolve(false), 8_000);
  });
}

async function collectYoutubeDistinctStills(videoId: string, max: number): Promise<string[]> {
  const candidates = [
    `https://i.ytimg.com/vi/${videoId}/hq1.jpg`,
    `https://i.ytimg.com/vi/${videoId}/hq2.jpg`,
    `https://i.ytimg.com/vi/${videoId}/hq3.jpg`,
    `https://img.youtube.com/vi/${videoId}/1.jpg`,
    `https://img.youtube.com/vi/${videoId}/2.jpg`,
    `https://img.youtube.com/vi/${videoId}/3.jpg`,
    `https://i.ytimg.com/vi/${videoId}/mq1.jpg`,
    `https://i.ytimg.com/vi/${videoId}/mq2.jpg`,
    `https://i.ytimg.com/vi/${videoId}/mq3.jpg`,
  ];
  const ok: string[] = [];
  const seen = new Set<string>();
  for (const url of candidates) {
    if (ok.length >= max) break;
    // eslint-disable-next-line no-await-in-loop
    const loads = await probeImageLoads(url);
    if (loads && !seen.has(url)) {
      seen.add(url);
      ok.push(url);
    }
  }
  return ok;
}

type FramePair = { t: number; url: string };

async function isDistinctFromAll(url: string, existing: FramePair[]): Promise<boolean> {
  for (const p of existing) {
    // eslint-disable-next-line no-await-in-loop
    if (await framesTooSimilar(url, p.url)) return false;
  }
  return true;
}

type VideoFrameTryOk = {
  ok: true;
  options: ThumbnailOption[];
  distinct: number;
  attempts: number;
  primaryFrameHits: number;
};

type VideoFrameTryFail = {
  ok: false;
  attempts: number;
  primaryFrameHits: number;
};

/**
 * Build up to 3 visually distinct frames from video. Requires ≥2 distinct before
 * success (otherwise ok:false → caller may try URL fallback, not single-poster yet).
 */
async function tryVideoFrameOptions(
  videoUrl: string,
  start: number,
  end: number,
  clipId: string,
): Promise<VideoFrameTryOk | VideoFrameTryFail> {
  const dur = end - start;
  const primaryTimes = pickSpreadFrameTimes(start, end);
  let attempts = primaryTimes.length;

  const rawCaps = await captureFramesAtSourceTimes(videoUrl, primaryTimes);
  let primaryFrameHits = 0;
  let pairs: FramePair[] = [];
  for (let i = 0; i < primaryTimes.length; i++) {
    const u = rawCaps[i];
    if (u && u.length > 200) {
      primaryFrameHits += 1;
      pairs.push({ t: primaryTimes[i], url: u });
    }
  }

  const dedupe = async (list: FramePair[]): Promise<FramePair[]> => {
    const out: FramePair[] = [];
    for (const p of list) {
      if (out.length === 0) {
        out.push(p);
        continue;
      }
      // eslint-disable-next-line no-await-in-loop
      if (await isDistinctFromAll(p.url, out)) out.push(p);
    }
    return out;
  };

  pairs = await dedupe(pairs);

  const minTimeSep = Math.max(0.35, dur * 0.06);
  const extraTimes: number[] = [];
  for (const r of extendedCandidateRatios()) {
    const t = start + r * dur;
    if (t <= start || t >= end) continue;
    if (pairs.some((p) => Math.abs(p.t - t) < minTimeSep)) continue;
    extraTimes.push(clamp(t, start + 0.02, end - 0.02));
  }

  while (pairs.length < 3 && extraTimes.length > 0) {
    const t = extraTimes.shift()!;
    attempts += 1;
    // eslint-disable-next-line no-await-in-loop
    const url = await captureSingleFrame(videoUrl, t);
    if (!url || url.length < 200) continue;
    // eslint-disable-next-line no-await-in-loop
    if (await isDistinctFromAll(url, pairs)) pairs.push({ t, url });
  }

  if (pairs.length < 2) {
    for (const t of [...extraTimes, end - 0.12, start + dur * 0.33, start + dur * 0.66]) {
      if (pairs.length >= 2) break;
      const tt = clamp(t, start + 0.05, end - 0.05);
      if (pairs.some((p) => Math.abs(p.t - tt) < minTimeSep * 0.8)) continue;
      attempts += 1;
      // eslint-disable-next-line no-await-in-loop
      const url = await captureSingleFrame(videoUrl, tt);
      if (!url) continue;
      // eslint-disable-next-line no-await-in-loop
      if (await isDistinctFromAll(url, pairs)) pairs.push({ t: tt, url });
    }
  }

  if (pairs.length < 2) {
    return { ok: false, attempts, primaryFrameHits };
  }

  pairs.sort((a, b) => a.t - b.t);

  while (pairs.length < 3) {
    const lastT = pairs[pairs.length - 1].t;
    const nextT = clamp(lastT + Math.max(minTimeSep, dur * 0.12), start + 0.05, end - 0.05);
    if (pairs.some((p) => Math.abs(p.t - nextT) < minTimeSep * 0.5)) break;
    attempts += 1;
    // eslint-disable-next-line no-await-in-loop
    const url = await captureSingleFrame(videoUrl, nextT);
    if (url && (await isDistinctFromAll(url, pairs))) {
      pairs.push({ t: nextT, url });
      continue;
    }
    break;
  }

  if (pairs.length === 2) {
    const mid = (pairs[0].t + pairs[1].t) / 2;
    attempts += 1;
    const url = await captureSingleFrame(videoUrl, mid);
    if (url && (await isDistinctFromAll(url, pairs))) pairs.push({ t: mid, url });
  }

  pairs.sort((a, b) => a.t - b.t);
  const slice = pairs.slice(0, 3);
  const styled = await buildThreeStyledThumbnailDataUrls(
    slice.map((p) => ({ url: p.url, timeSec: p.t })),
  );
  const options: ThumbnailOption[] = styled.map((s, i) => ({
    id: `social-${clipId}-${i}-${Math.round((s.timeSec ?? 0) * 1000)}`,
    name: s.style,
    src: s.url,
    score: scoreTier(i, 93),
    uplift: i === 0 ? "2.2x" : i === 1 ? "1.9x" : "1.6x",
    reason: `${reasonForStyledOption(s.style, s.timeSec, formatTime, s.usedRawFallback)} Captured from your clip video.`,
  }));

  return {
    ok: true,
    options,
    distinct: slice.length,
    attempts,
    primaryFrameHits,
  };
}

/**
 * Preferred order: (a) ≥2 distinct canvas frames (prefer 3) → (b) distinct image URLs →
 * (c) single_poster only if video produced <2 distinct AND URLs <3.
 */
export async function buildClipThumbnailOptions(args: {
  clip: Clip | null;
  youtubeVideoId: string | null;
}): Promise<{ options: ThumbnailOption[]; meta: ThumbnailBuildMeta }> {
  const { clip, youtubeVideoId } = args;

  lastBuildStats = {
    mode: "static_demo",
    primaryFrameHits: 0,
    captureAttempts: 0,
    visuallyDistinctFrames: 0,
    skippedEarlyFallback: false,
  };

  if (!clip) {
    bumpModeHistogram("static_demo");
    return {
      options: [],
      meta: { mode: "static_demo", detail: "No clip — use bundled static thumbnails." },
    };
  }

  const start = clip.start_time;
  const end = clip.end_time;
  const videoUrl = (clip.video_url ?? "").trim();

  if (videoUrl && !videoUrl.startsWith("blob:")) {
    const videoResult = await tryVideoFrameOptions(videoUrl, start, end, clip.id);
    lastBuildStats.primaryFrameHits = videoResult.primaryFrameHits;
    lastBuildStats.captureAttempts = videoResult.attempts;
    lastBuildStats.visuallyDistinctFrames = videoResult.ok ? videoResult.distinct : 0;

    if (videoResult.ok && videoResult.options.length >= 2) {
      lastBuildStats.mode = "video_frames";
      lastBuildStats.skippedEarlyFallback = true;
      bumpModeHistogram("video_frames");
      return {
        options: videoResult.options.slice(0, 3),
        meta: {
          mode: "video_frames",
          detail: `Video frames → social styles (Zoomed / High contrast / Clean): ${videoResult.distinct} distinct source captures from clip.video_url.`,
        },
      };
    }
  }

  const thumb = (clip.thumbnail_url ?? "").trim();
  const urlSet: string[] = [];
  const push = (u: string) => {
    const x = u.trim();
    if (x && !urlSet.includes(x)) urlSet.push(x);
  };
  push(thumb);

  if (youtubeVideoId) {
    const ytStills = await collectYoutubeDistinctStills(youtubeVideoId, 6);
    for (const u of ytStills) push(u);
  }

  const unique = urlSet.filter(Boolean);
  if (unique.length >= 3) {
    lastBuildStats.mode = "distinct_urls";
    bumpModeHistogram("distinct_urls");
    const bases = unique.slice(0, 3).map((url) => ({ url }));
    const styled = await buildThreeStyledThumbnailDataUrls(bases);
    return {
      options: styled.map((s, i) => ({
        id: `url-styled-${clip.id}-${i}`,
        name: s.style,
        src: s.url,
        score: scoreTier(i, 88),
        uplift: i === 0 ? "2.0x" : i === 1 ? "1.7x" : "1.4x",
        reason: `${reasonForStyledOption(s.style, undefined, formatTime, s.usedRawFallback)} Linked still images (video frames unavailable or not distinct enough).`,
      })),
      meta: {
        mode: "distinct_urls",
        detail:
          "Fallback: poster + YouTube stills, each passed through social thumbnail styles — video frame extraction did not yield 2+ distinct raw frames.",
      },
    };
  }

  const poster = unique[0] || thumb;
  if (poster) {
    lastBuildStats.mode = "single_poster_triplicate";
    bumpModeHistogram("single_poster_triplicate");
    const styled = await buildThreeStyledThumbnailDataUrls([{ url: poster }]);
    return {
      options: styled.map((s, i) => ({
        id: `single-poster-styled-${clip.id}-${i}`,
        name: s.style,
        src: s.url,
        score: 82 - i,
        uplift: "1.4x",
        reason: `${reasonForStyledOption(s.style, undefined, formatTime, s.usedRawFallback)} One poster / key image — three social looks for testing.`,
      })),
      meta: {
        mode: "single_poster_triplicate",
        detail:
          "single_poster: one bitmap source, three styled exports (Zoomed / High contrast / Clean).",
      },
    };
  }

  bumpModeHistogram("static_demo");
  return {
    options: [],
    meta: { mode: "static_demo", detail: "No poster or video URL — use static demo thumbnails." },
  };
}
