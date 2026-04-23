/**
 * Capture still frames from a video URL at absolute source timeline seconds.
 * Retries loads/seeks; uses requestVideoFrameCallback when available for decode sync.
 */
const TARGET_WIDTH = 480;
const JPEG_QUALITY = 0.72;
const LOAD_TIMEOUT_MS = 30_000;
const SEEK_TIMEOUT_MS = 10_000;
const DECODE_WAIT_MS = 2_500;
const MAX_VIDEO_LOAD_ATTEMPTS = 3;
const SEEK_RETRIES_PER_TIME = 2;

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function seekVideo(video: HTMLVideoElement, timeSec: number): Promise<void> {
  return new Promise((resolve, reject) => {
    let settled = false;
    let timeoutId = 0;
    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("error", onError);
      fn();
    };
    const onSeeked = () => finish(() => resolve());
    const onError = () => finish(() => reject(new Error("video error")));
    timeoutId = window.setTimeout(() => {
      finish(() => reject(new Error("seek timeout")));
    }, SEEK_TIMEOUT_MS);
    video.addEventListener("seeked", onSeeked);
    video.addEventListener("error", onError);
    try {
      video.currentTime = Math.max(0, timeSec);
    } catch {
      finish(() => reject(new Error("seek failed")));
    }
  });
}

async function awaitDecodedFrame(video: HTMLVideoElement): Promise<void> {
  const anyV = video as HTMLVideoElement & {
    requestVideoFrameCallback?: (cb: () => void) => number;
  };
  const decodeWait = new Promise<void>((resolve) => {
    window.setTimeout(() => resolve(), DECODE_WAIT_MS);
  });
  if (typeof anyV.requestVideoFrameCallback === "function") {
    const rVfc = new Promise<void>((resolve) => {
      anyV.requestVideoFrameCallback!(() => resolve());
    });
    await Promise.race([rVfc, decodeWait]);
    return;
  }
  const raf = new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
  await Promise.race([raf, decodeWait]);
}

function grabFrameToDataUrl(video: HTMLVideoElement): string | null {
  try {
    const w = video.videoWidth;
    const h = video.videoHeight;
    if (!w || !h) return null;
    const canvas = document.createElement("canvas");
    const aspect = w / h;
    canvas.width = TARGET_WIDTH;
    canvas.height = Math.max(1, Math.round(TARGET_WIDTH / aspect));
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  } catch {
    return null;
  }
}

async function createVideoElement(videoUrl: string): Promise<HTMLVideoElement> {
  const video = document.createElement("video");
  video.crossOrigin = "anonymous";
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  video.setAttribute("playsinline", "");
  video.src = videoUrl;
  await new Promise<void>((resolve, reject) => {
    const t = window.setTimeout(() => reject(new Error("load timeout")), LOAD_TIMEOUT_MS);
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(t);
      resolve();
    };
    const fail = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(t);
      reject(new Error("load error"));
    };
    video.addEventListener("loadeddata", done, { once: true });
    video.addEventListener("canplay", done, { once: true });
    video.addEventListener("error", fail, { once: true });
  });
  return video;
}

async function captureOneFrameAt(
  video: HTMLVideoElement,
  timeSec: number,
): Promise<string | null> {
  for (let attempt = 0; attempt <= SEEK_RETRIES_PER_TIME; attempt++) {
    try {
      await seekVideo(video, timeSec);
      await awaitDecodedFrame(video);
      const data = grabFrameToDataUrl(video);
      if (data && data.length > 200) return data;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 80 * (attempt + 1)));
  }
  return null;
}

/**
 * Capture a single frame (for gap-filling when two frames look too similar).
 */
export async function captureSingleFrame(
  videoUrl: string,
  timeSec: number,
): Promise<string | null> {
  if (!videoUrl.trim()) return null;
  let video: HTMLVideoElement | null = null;
  try {
    video = await createVideoElement(videoUrl);
    return await captureOneFrameAt(video, timeSec);
  } catch {
    return null;
  } finally {
    if (video) {
      video.removeAttribute("src");
      video.load();
    }
  }
}

export async function captureFramesAtSourceTimes(
  videoUrl: string,
  timesSec: number[],
): Promise<Array<string | null>> {
  if (!videoUrl.trim() || timesSec.length === 0) return timesSec.map(() => null);

  let lastError: Error | null = null;
  for (let loadAttempt = 0; loadAttempt < MAX_VIDEO_LOAD_ATTEMPTS; loadAttempt++) {
    let video: HTMLVideoElement | null = null;
    try {
      video = await createVideoElement(videoUrl);
      const results: Array<string | null> = [];
      for (const time of timesSec) {
        const frame = await captureOneFrameAt(video, time);
        results.push(frame);
      }
      video.removeAttribute("src");
      video.load();
      return results;
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      if (video) {
        try {
          video.removeAttribute("src");
          video.load();
        } catch {
          /* ignore */
        }
      }
      await new Promise((r) => setTimeout(r, 200 * (loadAttempt + 1)));
    }
  }
  if (lastError && typeof console !== "undefined" && console.debug) {
    console.debug("[thumbnailFrameCapture] load failed after retries", lastError.message);
  }
  return timesSec.map(() => null);
}

/** Spread sample times across [start,end] with minimum pairwise spacing for visible variety. */
export function pickSpreadFrameTimes(start: number, end: number): number[] {
  const dur = end - start;
  if (dur <= 0) return [start, start, start];
  const minGap = Math.max(1.4, dur * 0.14);
  const a = start + dur * 0.1;
  let b = start + dur * 0.48;
  let c = end - dur * 0.1;
  if (b - a < minGap) b = clamp(a + minGap, start, end);
  if (c - b < minGap) c = clamp(b + minGap, start, end);
  if (c > end - 0.02) c = end - 0.02;
  if (b > c - minGap) b = clamp((a + c) / 2, start + minGap * 0.5, end - minGap * 0.5);
  return [clamp(a, start, end), clamp(b, start, end), clamp(c, start, end)].sort((x, y) => x - y);
}

/** Extra candidate times (ratios along segment) to try when replacing similar frames. */
export function extendedCandidateRatios(): number[] {
  return [0.06, 0.14, 0.22, 0.3, 0.38, 0.55, 0.62, 0.72, 0.8, 0.9, 0.95];
}
