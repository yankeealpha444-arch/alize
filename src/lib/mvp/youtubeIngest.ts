/**
 * YouTube Data API v3 ingest for the clipper MVP: metadata + thumbnail upload to Supabase.
 */

import { supabase } from "@/integrations/supabase/client";
import { STORAGE_BUCKET_VIDEO_UPLOADS } from "@/lib/mvp/storageBuckets";

export function getYoutubeDataApiKey(): string | undefined {
  const v = import.meta.env.VITE_YOUTUBE_DATA_API_KEY as string | undefined;
  if (typeof v !== "string" || !v.trim()) return undefined;
  return v.trim();
}

/** Extract 11-char video id from common YouTube URL shapes (watch, youtu.be, shorts, embed, live, m.youtube). */
export function parseYoutubeVideoId(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;

  const tryUrl = (href: string): string | null => {
    try {
      const url = new URL(href.startsWith("http") ? href : `https://${href}`);
      const host = url.hostname.replace(/^www\./, "").toLowerCase();

      if (host === "youtu.be") {
        const id = url.pathname.replace(/^\//, "").split("/").filter(Boolean)[0] ?? "";
        return /^[\w-]{11}$/.test(id) ? id : null;
      }

      if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
        const v = url.searchParams.get("v");
        if (v && /^[\w-]{11}$/.test(v)) return v;
        const m = url.pathname.match(/\/(shorts|embed|live|v)\/([\w-]{11})/);
        if (m && /^[\w-]{11}$/.test(m[2])) return m[2];
      }
    } catch {
      return null;
    }
    return null;
  };

  const fromUrl = tryUrl(s);
  if (fromUrl) return fromUrl;

  // Bare id
  if (/^[\w-]{11}$/.test(s)) return s;

  return null;
}

/** Parse ISO 8601 duration strings from YouTube `contentDetails.duration` (e.g. PT1H2M3S, PT45S). */
export function parseIso8601Duration(iso: string): number {
  if (!iso) return 0;
  const m = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso);
  if (!m) return 0;
  const h = Number(m[1] || 0);
  const min = Number(m[2] || 0);
  const sec = Number(m[3] || 0);
  return h * 3600 + min * 60 + sec;
}

export type YoutubeVideoDetails = {
  videoId: string;
  title: string;
  channelTitle: string | null;
  durationSec: number;
  thumbnailUrl: string | null;
};

export async function fetchYoutubeVideoDetails(videoId: string, apiKey: string): Promise<YoutubeVideoDetails> {
  const url = new URL("https://www.googleapis.com/youtube/v3/videos");
  url.searchParams.set("part", "snippet,contentDetails");
  url.searchParams.set("id", videoId);
  url.searchParams.set("key", apiKey);

  const res = await fetch(url.toString());
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`YouTube Data API error (${res.status}): ${t.slice(0, 240)}`);
  }

  const j = (await res.json()) as {
    items?: Array<{
      id?: string;
      snippet?: {
        title?: string;
        channelTitle?: string;
        thumbnails?: {
          maxres?: { url?: string };
          high?: { url?: string };
          medium?: { url?: string };
          default?: { url?: string };
        };
      };
      contentDetails?: { duration?: string };
    }>;
  };

  const item = j.items?.[0];
  if (!item?.snippet?.title || !item.contentDetails?.duration) {
    throw new Error("YouTube Data API returned no video for this id.");
  }

  const durationSec = Math.max(1, parseIso8601Duration(item.contentDetails.duration));
  const th = item.snippet.thumbnails;
  const thumbnailUrl =
    th?.maxres?.url ?? th?.high?.url ?? th?.medium?.url ?? th?.default?.url ?? null;

  return {
    videoId: item.id ?? videoId,
    title: item.snippet.title,
    channelTitle: item.snippet.channelTitle ?? null,
    durationSec,
    thumbnailUrl,
  };
}

const OEMBED_FALLBACK_DURATION_SEC = 600;

/** When no Data API key: oEmbed gives title/thumbnail; duration is a conservative default (honest in metadata). */
export async function fetchYoutubeOembedFallback(pageUrl: string, videoId: string): Promise<YoutubeVideoDetails> {
  const u = `https://www.youtube.com/oembed?url=${encodeURIComponent(pageUrl)}&format=json`;
  const res = await fetch(u);
  if (!res.ok) {
    throw new Error(`YouTube oEmbed failed (${res.status})`);
  }
  const j = (await res.json()) as { title?: string; author_name?: string; thumbnail_url?: string };
  if (!j.title) {
    throw new Error("YouTube oEmbed returned no title");
  }
  return {
    videoId,
    title: j.title,
    channelTitle: j.author_name ?? null,
    durationSec: OEMBED_FALLBACK_DURATION_SEC,
    thumbnailUrl: j.thumbnail_url ?? null,
  };
}

/** Prefer YouTube Data API when `VITE_YOUTUBE_DATA_API_KEY` is set; otherwise oEmbed + default duration. */
export async function resolveYoutubeVideoDetails(pageUrl: string, videoId: string): Promise<{
  details: YoutubeVideoDetails;
  durationSource: "youtube_data_api" | "oembed_fallback";
}> {
  const key = getYoutubeDataApiKey();
  if (key) {
    const details = await fetchYoutubeVideoDetails(videoId, key);
    return { details, durationSource: "youtube_data_api" };
  }
  const details = await fetchYoutubeOembedFallback(pageUrl, videoId);
  return { details, durationSource: "oembed_fallback" };
}

/** Fetch remote thumbnail bytes and store under `video-uploads` at projectId/youtube-thumbs/jobId-videoId.jpg */
export async function uploadYoutubeThumbnailToStorage(
  projectId: string,
  jobId: string,
  videoId: string,
  thumbnailUrl: string | null,
): Promise<string | null> {
  if (!thumbnailUrl) return null;
  const path = `${projectId}/youtube-thumbs/${jobId}-${videoId}.jpg`;
  const res = await fetch(thumbnailUrl);
  if (!res.ok) {
    throw new Error(`Thumbnail fetch failed (${res.status})`);
  }
  const blob = await res.blob();
  const { error } = await supabase.storage.from(STORAGE_BUCKET_VIDEO_UPLOADS).upload(path, blob, {
    upsert: true,
    contentType: blob.type && blob.type.startsWith("image/") ? blob.type : "image/jpeg",
  });
  if (error) throw new Error(error.message || "Thumbnail upload failed");
  return path;
}

function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function shortTitle(s: string, max = 48): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function formatClock(sec: number): string {
  const s = Math.floor(Math.max(0, sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
  return `${m}:${String(r).padStart(2, "0")}`;
}

export type YoutubeClipSegmentJobRef = {
  id: string;
  project_id: string;
};

export type YoutubeClipInsertRow = {
  job_id: string;
  project_id: string;
  label: string;
  start_time_sec: number;
  end_time_sec: number;
  duration_sec: number;
  score: number;
  caption: string | null;
  thumbnail_url: string | null;
  status: "ready";
};

/** 3–5 segments inside real duration; captions mention channel and time windows; thumbnails from API details. */
export function buildYoutubeClipRowsFromDetails(
  job: YoutubeClipSegmentJobRef,
  details: YoutubeVideoDetails,
): YoutubeClipInsertRow[] {
  const D = Math.max(30, details.durationSec);
  const seed = hashSeed(job.id);
  const n = 3 + (seed % 3);
  const thumb = details.thumbnailUrl;
  const baseTitle = shortTitle(details.title);
  const channel = details.channelTitle?.trim() || null;
  const out: YoutubeClipInsertRow[] = [];
  const slot = Math.floor(D / (n + 1));
  const targetDur = Math.min(55, Math.max(18, Math.floor(slot * 0.85)));

  for (let i = 0; i < n; i++) {
    const start = Math.min(D - 20, Math.max(0, slot * (i + 1)));
    const end = Math.min(D, start + targetDur);
    const dur = Math.max(12, end - start);
    const score = Math.max(55, 88 - i * 7);
    const range = `${formatClock(start)}–${formatClock(end)}`;
    const caption = channel
      ? `${channel} · ${range} · suggested cut from the source video`
      : `${range} · suggested cut from the source video`;

    out.push({
      job_id: job.id,
      project_id: job.project_id,
      label: n > 1 ? `${baseTitle} · ${i + 1}` : baseTitle,
      start_time_sec: start,
      end_time_sec: end,
      duration_sec: dur,
      score,
      caption,
      thumbnail_url: thumb,
      status: "ready",
    });
  }
  return out;
}
