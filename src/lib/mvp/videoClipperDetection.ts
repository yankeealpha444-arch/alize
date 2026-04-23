/**
 * Detects video clipping / repurposing products (long-form → short clips for social).
 * "clipper" is distinct from the word "clip" so we match it explicitly.
 */
export function isVideoContentUrlInput(input: string): boolean {
  const h = input.toLowerCase().trim();
  if (!h) return false;
  return (
    /https?:\/\/(www\.)?youtube\.com\//i.test(h) ||
    /https?:\/\/(www\.)?youtu\.be\//i.test(h) ||
    /https?:\/\/(www\.)?tiktok\.com\//i.test(h) ||
    /https?:\/\/(www\.)?instagram\.com\/(reel|reels|tv|p)\//i.test(h)
  );
}

export function isVideoClipperProductIdea(idea: string): boolean {
  const h = idea.toLowerCase().replace(/\s+/g, " ").trim();
  if (!h) return false;
  if (isVideoContentUrlInput(h)) return true;

  const clipperShape =
    /\b(clipper|clipping|clips?\s+from|clip\s+from|extract\s+clips|repurpose|cut\s+into\s+clips)\b/i.test(h) ||
    /\b(trim|split|slice)\s+(video|footage|reels?|shorts?)\b/i.test(h);

  const hasVideoContext =
    /\b(video|videos|footage|long[- ]form|recording|stream|upload)\b/i.test(h) ||
    /\b(reels?|shorts?)\b/i.test(h);

  const socialOrChannel =
    /\b(instagram|tiktok|youtube|snapchat|facebook)\b/i.test(h) ||
    /\b(social|creator|content)\b/i.test(h);

  if (clipperShape && (hasVideoContext || socialOrChannel)) return true;

  if (/\b(instagram|tiktok|youtube)\s+clipper\b/i.test(h)) return true;
  if (/\bvideo\s+clipper\b/i.test(h)) return true;

  return false;
}
