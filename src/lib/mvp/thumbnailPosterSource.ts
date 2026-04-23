/**
 * Where thumbnail-step poster images come from (background under UI text overlays).
 *
 * Today: YouTube hqdefault only — no Cloudinary.
 * Later: add a branch (e.g. `source: "cloudinary"`) or replace `resolveYoutubePosterUrl`
 * without changing ThumbnailSelector overlay logic.
 */

/**
 * Public still for a YouTube video (hqdefault).
 * Use `i.ytimg.com` — matches YouTube’s CDN and ThumbnailPicker fallbacks; `img.youtube.com` can fail to paint in some browsers/CSP contexts.
 */
export function resolveYoutubePosterUrl(videoId: string): string {
  const id = videoId.trim();
  if (!id) return "";
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

/** Normalize legacy or alternate poster URLs to the same CDN host used by `resolveYoutubePosterUrl`. */
export function normalizeYoutubePosterUrlForImg(url: string): string {
  const u = url.trim();
  if (!u) return "";
  try {
    const parsed = new URL(u);
    if (parsed.hostname === "img.youtube.com" && parsed.pathname.includes("/vi/")) {
      const id = parsed.pathname.split("/vi/")[1]?.split("/")[0];
      if (id) return resolveYoutubePosterUrl(id);
    }
  } catch {
    /* ignore */
  }
  return u;
}

export function posterUrlForYoutubeOrEmpty(videoId: string | null | undefined): string {
  if (!videoId) return "";
  return resolveYoutubePosterUrl(videoId);
}
