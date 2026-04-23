/**
 * Canvas-based “social thumbnail” looks: zoom crop, punchy contrast, clean minimal.
 * Input is always a real bitmap URL (data URL from capture or remote still).
 */

const TARGET_WIDTH = 480;
const JPEG_QUALITY = 0.82;
const IMAGE_LOAD_MS = 12_000;

export const SOCIAL_THUMB_LABELS = ["Zoomed", "High contrast", "Clean"] as const;
export type SocialThumbStyle = (typeof SOCIAL_THUMB_LABELS)[number];

function loadImageBitmap(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (!url.startsWith("data:")) {
      img.crossOrigin = "anonymous";
    }
    const t = window.setTimeout(() => reject(new Error("image-load-timeout")), IMAGE_LOAD_MS);
    img.onload = () => {
      window.clearTimeout(t);
      resolve(img);
    };
    img.onerror = () => {
      window.clearTimeout(t);
      reject(new Error("image-load-error"));
    };
    img.src = url;
  });
}

function outputSizeForImage(w: number, h: number): { ow: number; oh: number } {
  const aspect = w / h;
  const ow = TARGET_WIDTH;
  const oh = Math.max(1, Math.round(TARGET_WIDTH / aspect));
  return { ow, oh };
}

/** Tighter framing: center crop ~70% then scale to output. */
function drawZoomed(ctx: CanvasRenderingContext2D, img: HTMLImageElement, ow: number, oh: number) {
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  const crop = 0.7;
  const cw = w * crop;
  const ch = h * crop;
  const sx = (w - cw) / 2;
  const sy = (h - ch) / 2;
  ctx.filter = "none";
  ctx.drawImage(img, sx, sy, cw, ch, 0, 0, ow, oh);
}

function drawFullWithFilter(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  ow: number,
  oh: number,
  filter: string,
) {
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  ctx.filter = filter;
  ctx.drawImage(img, 0, 0, w, h, 0, 0, ow, oh);
  ctx.filter = "none";
}

function toJpegDataUrl(canvas: HTMLCanvasElement): string | null {
  try {
    return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  } catch {
    return null;
  }
}

async function applyStyleToUrl(
  url: string,
  style: SocialThumbStyle,
): Promise<{ dataUrl: string | null; style: SocialThumbStyle; usedRawFallback: boolean }> {
  let img: HTMLImageElement;
  try {
    img = await loadImageBitmap(url);
  } catch {
    return { dataUrl: null, style, usedRawFallback: true };
  }
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  if (!w || !h) return { dataUrl: null, style, usedRawFallback: true };

  const { ow, oh } = outputSizeForImage(w, h);
  const canvas = document.createElement("canvas");
  canvas.width = ow;
  canvas.height = oh;
  const ctx = canvas.getContext("2d");
  if (!ctx) return { dataUrl: null, style, usedRawFallback: true };

  if (style === "Zoomed") {
    drawZoomed(ctx, img, ow, oh);
  } else if (style === "High contrast") {
    drawFullWithFilter(
      ctx,
      img,
      ow,
      oh,
      "brightness(1.08) contrast(1.42) saturate(1.35)",
    );
  } else {
    drawFullWithFilter(
      ctx,
      img,
      ow,
      oh,
      "brightness(1.04) contrast(0.98) saturate(0.86)",
    );
  }

  const dataUrl = toJpegDataUrl(canvas);
  const ok = dataUrl && dataUrl.length > 200;
  return {
    dataUrl: ok ? dataUrl : null,
    style,
    usedRawFallback: !ok,
  };
}

/** Map 1–3 base bitmap URLs to three styled outputs (Zoomed / High contrast / Clean). */
export async function buildThreeStyledThumbnailDataUrls(bases: { url: string; timeSec?: number }[]): Promise<
  Array<{
    url: string;
    style: SocialThumbStyle;
    timeSec?: number;
    usedRawFallback: boolean;
  }>
> {
  const out: Array<{
    url: string;
    style: SocialThumbStyle;
    timeSec?: number;
    usedRawFallback: boolean;
  }> = [];
  if (bases.length === 0) return out;

  const pickBase = (i: number) => {
    if (bases.length >= 3) return bases[i];
    if (bases.length === 2) return bases[i === 2 ? 0 : i];
    return bases[0];
  };

  for (let i = 0; i < 3; i++) {
    const style = SOCIAL_THUMB_LABELS[i];
    const base = pickBase(i);
    const { dataUrl, style: st, usedRawFallback } = await applyStyleToUrl(base.url, style);
    const finalUrl = dataUrl ?? base.url;
    out.push({
      url: finalUrl,
      style: st,
      timeSec: base.timeSec,
      usedRawFallback,
    });
  }
  return out;
}

export function reasonForStyledOption(
  style: SocialThumbStyle,
  timeSec: number | undefined,
  formatTime: (s: number) => string,
  usedRawFallback: boolean,
): string {
  const t =
    timeSec !== undefined && Number.isFinite(timeSec)
      ? ` Frame near ${formatTime(timeSec)} on the source timeline.`
      : "";
  const styleLine =
    style === "Zoomed"
      ? "Tighter center crop for feed-style framing."
      : style === "High contrast"
        ? "Boosted contrast and saturation so the image reads in a busy feed."
        : "Softer, slightly desaturated look for a clean premium feel.";
  const fb = usedRawFallback ? " (Style processing fell back to the raw frame.)" : "";
  return `${styleLine}${t}${fb}`;
}
