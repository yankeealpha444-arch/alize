/**
 * Routes the Carousel Tester MVP when the product/idea clearly matches.
 */
export function isCarouselTesterContext(productName: string, ideaText: string): boolean {
  const s = `${productName} ${ideaText}`.toLowerCase().replace(/\s+/g, " ").trim();
  if (!s) return false;
  if (s.includes("carousel tester")) return true;
  if (s.includes("test carousel") && (s.includes("before") || s.includes("post") || s.includes("idea"))) return true;
  if (/\bcarousel\b/.test(s) && /\btester\b/.test(s)) return true;
  return false;
}
