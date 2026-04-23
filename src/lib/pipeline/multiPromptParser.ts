/**
 * Detects and splits bulk prompts that describe multiple independent tools (Lovable-style).
 * Single-tool behavior: returns a one-element array when no multi signals match.
 */

function norm(s: string): string {
  return s.replace(/\r\n/g, "\n").trim();
}

function coercePromptInput(raw: unknown): string {
  if (raw == null) return "";
  if (typeof raw === "string") return raw;
  try {
    return String(raw);
  } catch {
    return "";
  }
}

/** Explicit `TOOL START` … `TOOL END` blocks (case-insensitive). Inner text is one tool spec. */
function splitExplicitToolDelimiterBlocks(text: string): string[] {
  const t = text.replace(/\r\n/g, "\n");
  const re = /TOOL\s+START\s*([\s\S]*?)TOOL\s+END/gi;
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(t)) !== null) {
    const inner = m[1].trim();
    if (inner) out.push(inner);
  }
  return out;
}

/**
 * True when a line starts a numbered **tool** row (not arbitrary list text like `3 short insights`).
 *
 * - `1. Title` / `1) Title`: title must start with an uppercase letter (tool names / acronyms).
 * - `1 Title` (space, no dot): same — avoids matching `3 short insights` where the word after the number is lowercase.
 * - `2024 Budget` lines are still excluded (no line-start `N ` pattern with N≤999 that looks like a tool).
 */
function isNumberedListItemLine(line: string): boolean {
  const t = line.trimStart();
  // Dot/paren form: "1. Profit Calculator" — require capital letter start of title (skips "1. build step one").
  const dotOrParen = /^(\d+)[\.)]\s*(.*)$/.exec(t);
  if (dotOrParen) {
    const rest = dotOrParen[2]?.trimStart() ?? "";
    if (!rest) return false;
    return /^[A-Z]/.test(rest);
  }
  // Space-only form: "1 Profit Margin Calculator" — first character of title must be uppercase.
  const sp = /^(\d{1,3})\s+(\S)/.exec(t);
  if (!sp) return false;
  const n = Number(sp[1], 10);
  if (n < 1 || n > 999) return false;
  return /^[A-Z]/.test(sp[2] ?? "");
}

/**
 * If every tool heading is pasted on a single physical line, line-based splitting only sees one `^N` prefix
 * and yields a single chunk. Insert newlines before `N Title` where `Title` starts with an uppercase letter.
 */
function expandInlineNumberedToolHeadings(text: string): string {
  const t = text.replace(/\r\n/g, "\n");
  return t.replace(/(?<=\S)\s+(?=\d{1,3}\s+[A-Z])/g, "\n");
}

/** Remove leading `12. ` / `12) ` / `12 ` from the first line only (multi-line chunks keep body lines). */
function stripFirstLineNumberPrefix(firstLine: string): string {
  const t = firstLine.trimStart();
  const dotOrParen = /^\d+[\.)]\s*/.exec(t);
  if (dotOrParen) return t.slice(dotOrParen[0].length).trimStart();

  const sp = /^(\d{1,3})\s+/.exec(t);
  if (sp) {
    const n = Number(sp[1], 10);
    if (n >= 1 && n <= 999) return t.slice(sp[0].length).trimStart();
  }
  return firstLine;
}

/** Split `1. foo` / `1) foo` / `1 foo` numbered blocks (line-start only). Skips preamble before the first number. */
function splitNumberedListItems(text: string): string[] {
  const expanded = expandInlineNumberedToolHeadings(text);
  const lines = expanded.split("\n");
  const chunks: string[][] = [];
  let buf: string[] = [];

  for (const line of lines) {
    if (isNumberedListItemLine(line)) {
      if (buf.length > 0) chunks.push(buf);
      buf = [line];
    } else {
      if (buf.length === 0) continue;
      buf.push(line);
    }
  }
  if (buf.length) chunks.push(buf);

  if (chunks.length < 2) return [];

  return chunks
    .map((chunk) => {
      const joined = chunk.join("\n");
      const firstBreak = joined.indexOf("\n");
      const head = firstBreak === -1 ? joined : joined.slice(0, firstBreak);
      const tail = firstBreak === -1 ? "" : joined.slice(firstBreak + 1);
      const strippedHead = stripFirstLineNumberPrefix(head);
      return tail ? `${strippedHead}\n${tail}`.trim() : strippedHead.trim();
    })
    .filter(Boolean);
}

/** Split on repeated "Build an MVP called …" (case-insensitive). Drops preamble lines. */
function splitBuildMvpBlocks(text: string): string[] {
  const parts = text
    .split(/(?=\bbuild\s+an\s+mvp\s+called\b)/i)
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((p) => /\bbuild\s+an\s+mvp\s+called\b/i.test(p));
  if (parts.length < 2) return [];
  return parts.map((p) => p.replace(/^\s*build\s+an\s+mvp\s+called\s*/i, "").trim()).filter(Boolean);
}

/** Split on a second+ "Goal:" section at line start (structured specs). */
function splitGoalSections(text: string): string[] {
  const blocks = text.split(/\n(?=\s*Goal\s*:)/i).map((s) => s.trim());
  const nonempty = blocks.filter(Boolean);
  if (nonempty.length < 2) return [];
  return nonempty;
}

function firstSegmentTitleForDebug(segment: string): string {
  const head = segment.trim().split("\n")[0] ?? "";
  return stripFirstLineNumberPrefix(head).trim();
}

/**
 * Returns ordered tool prompts. If only one conceptual tool is present, returns `[fullText]`
 * (or the single delimited inner body when `TOOL START`/`TOOL END` wraps one tool).
 *
 * Priority: **TOOL START/END** → numbered list → Build an MVP called → repeated Goal: → single.
 */
export function parseMultiPrompt(raw: unknown): string[] {
  const t = norm(coercePromptInput(raw));
  if (!t) return [];

  const delimited = splitExplicitToolDelimiterBlocks(t);
  if (delimited.length > 0) return delimited;

  const numbered = splitNumberedListItems(t);
  if (numbered.length > 1) {
    if (import.meta.env.DEV && import.meta.env.MODE !== "test") {
      const titles = numbered.map((seg) => firstSegmentTitleForDebug(seg));
      console.info("[Alizé][multiPrompt] parsed tool titles:", titles);
    }
    return numbered;
  }

  const build = splitBuildMvpBlocks(t);
  if (build.length > 1) return build;

  const goals = splitGoalSections(t);
  if (goals.length > 1) return goals;

  return [t];
}

export function hasMultipleToolPrompts(raw: unknown): boolean {
  return parseMultiPrompt(raw).length > 1;
}

/** How many independent tool specs the batch parser detected (1 = single-tool flow). */
export function getDetectedToolCount(raw: unknown): number {
  return parseMultiPrompt(raw).length;
}
