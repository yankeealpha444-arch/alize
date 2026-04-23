/**
 * Short label for a segmented tool prompt. One-line specs often look like
 * "Revenue Calculator Inputs Price per unit …" — we take the part before the first
 * structured keyword so smoke lists and card headers stay readable.
 */
export function segmentDisplayTitle(raw: string, maxLen = 96): string {
  const t = raw.replace(/\r\n/g, "\n").trim().replace(/^\d+[\.)]?\s*/, "");
  if (!t) return "(empty segment)";

  const marker = /\b(Inputs|Action|Output)\b/i.exec(t);
  let head =
    marker && marker.index > 0 ? t.slice(0, marker.index).trim() : (t.split("\n")[0]?.trim() ?? "");
  head = head.replace(/\s+/g, " ").trim();
  if (!head) {
    head = (t.split("\n")[0]?.trim() ?? "").replace(/\s+/g, " ");
  }
  if (!head) return "(empty segment)";
  return head.length > maxLen ? `${head.slice(0, maxLen - 1)}…` : head;
}

/**
 * Never throws: use for multi-tool smoke lists and headers so a bad segment cannot crash the preview.
 */
export function safeSegmentDisplayTitle(raw: unknown, segmentIndex: number, maxLen = 96): string {
  try {
    const s = typeof raw === "string" ? raw : String(raw ?? "");
    const t = segmentDisplayTitle(s, maxLen);
    if (t && t !== "(empty segment)") return t;
  } catch {
    /* ignore */
  }
  try {
    const s = typeof raw === "string" ? raw : String(raw ?? "");
    const line = s.replace(/\r\n/g, "\n").trim().split("\n")[0]?.trim() ?? "";
    if (line) return line.length > maxLen ? `${line.slice(0, maxLen - 1)}…` : line;
  } catch {
    /* ignore */
  }
  return `Tool ${segmentIndex + 1}`;
}
