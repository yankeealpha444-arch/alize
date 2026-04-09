/**
 * Full URL for HashRouter routes (Vite dev and production).
 * Use for window.open, clipboard, and <a href> when not using react-router navigate().
 */
export function hashAppUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  if (typeof window === "undefined") return p;
  return `${window.location.origin}/#${p}`;
}
