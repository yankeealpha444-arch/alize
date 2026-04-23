/**
 * Captures JPEG data URLs from an HTML5 video at the given timestamps (seconds).
 * Requires CORS-permissive video; returns null if the canvas is tainted or decode fails.
 */

function seekVideo(v: HTMLVideoElement, timeSec: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const done = () => {
      v.removeEventListener("seeked", done);
      v.removeEventListener("error", onErr);
      resolve();
    };
    const onErr = () => {
      v.removeEventListener("seeked", done);
      v.removeEventListener("error", onErr);
      reject(new Error("seek failed"));
    };
    v.addEventListener("seeked", done, { once: true });
    v.addEventListener("error", onErr, { once: true });
    try {
      v.currentTime = timeSec;
    } catch {
      reject(new Error("seek threw"));
    }
    window.setTimeout(() => {
      v.removeEventListener("seeked", done);
      v.removeEventListener("error", onErr);
      reject(new Error("seek timeout"));
    }, 12_000);
  });
}

function downscaleToDataUrl(source: HTMLCanvasElement, maxWidth: number, quality: number): string {
  const w = source.width;
  const h = source.height;
  if (w <= 0 || h <= 0) throw new Error("empty frame");
  if (w <= maxWidth) {
    return source.toDataURL("image/jpeg", quality);
  }
  const scale = maxWidth / w;
  const tw = maxWidth;
  const th = Math.max(1, Math.round(h * scale));
  const c = document.createElement("canvas");
  c.width = tw;
  c.height = th;
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("no ctx");
  ctx.drawImage(source, 0, 0, tw, th);
  return c.toDataURL("image/jpeg", quality);
}

/**
 * @returns data URLs in order, or null if capture is not possible (CORS taint, etc.)
 */
export async function captureVideoFramesAtTimes(
  videoUrl: string,
  timesSec: number[],
): Promise<string[] | null> {
  if (!videoUrl.trim() || timesSec.length === 0) return null;

  const v = document.createElement("video");
  v.crossOrigin = "anonymous";
  v.muted = true;
  v.playsInline = true;
  v.setAttribute("playsinline", "");
  v.preload = "auto";

  try {
    await new Promise<void>((resolve, reject) => {
      v.onloadedmetadata = () => resolve();
      v.onerror = () => reject(new Error("video load error"));
      v.src = videoUrl;
      v.load();
    });

    const dur =
      Number.isFinite(v.duration) && v.duration > 0 ? v.duration : Math.max(...timesSec, 0) + 1;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const out: string[] = [];
    for (const rawT of timesSec) {
      const t = Math.min(Math.max(0.05, rawT), Math.max(0.1, dur - 0.05));
      await seekVideo(v, t);
      canvas.width = v.videoWidth;
      canvas.height = v.videoHeight;
      if (canvas.width < 2 || canvas.height < 2) {
        v.remove();
        return null;
      }
      ctx.drawImage(v, 0, 0);
      try {
        out.push(downscaleToDataUrl(canvas, 1280, 0.86));
      } catch {
        v.remove();
        return null;
      }
    }
    v.remove();
    return out;
  } catch {
    try {
      v.remove();
    } catch {
      /* ignore */
    }
    return null;
  }
}

export function isDirectVideoFileUrl(url: string): boolean {
  const u = url.trim().toLowerCase();
  if (!/^https?:\/\//i.test(u)) return false;
  if (/youtube\.com|youtu\.be|googlevideo\.com/i.test(u)) return false;
  return /\.(mp4|webm|ogg)(\?|$)/i.test(u) || u.includes("/video") || u.includes("storage");
}
