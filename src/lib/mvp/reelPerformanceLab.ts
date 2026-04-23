/**
 * Routes the Instagram Reel Performance Lab experience when the product/idea clearly matches.
 */
export function isReelPerformanceLabContext(productName: string, ideaText: string): boolean {
  const s = `${productName} ${ideaText}`.toLowerCase().replace(/\s+/g, " ").trim();
  if (!s) return false;
  if (s.includes("reel performance lab")) return true;
  if (s.includes("instagram reel performance lab")) return true;
  if (s.includes("instagram reel performance")) return true;
  return /\binstagram\b/.test(s) && /\breel\b/.test(s) && /performance\s*lab/.test(s);
}
