export type HookOption = {
  id: string;
  startSec: number;
  endSec: number;
  style: "Pain point" | "Curiosity" | "Transformation" | "Urgency" | "Authority";
  hookLine: string;
  whyItWorks: string;
};

function fmt(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function tidyTitle(s: string): string {
  return String(s || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

function extractTopic(idea: string, videoTitle?: string | null): string {
  const t = tidyTitle(videoTitle || "");
  if (t) return t;
  const cleaned =
    idea
      .replace(/\b(youtube|instagram|tiktok|growth|engine|tool|app|platform)\b/gi, "")
      .replace(/\s+/g, " ")
      .trim() || idea.trim();
  return tidyTitle(cleaned || "this video");
}

export type HookContext = {
  platformLabel: string;
  goalLabel: string;
  channelName?: string;
  videoTitle?: string | null;
};

/**
 * Simple MVP logic:
 * - Uses only the first 15-30 seconds
 * - Splits into 3-5 candidate segments
 */
export function generateHookOptions(source: string, idea: string): HookOption[] {
  const topic = extractTopic(idea);
  const ranges: Array<[number, number]> = [
    [0, 5],
    [5, 10],
    [10, 15],
    [15, 22],
    [22, 30],
  ];

  const styles: HookOption["style"][] = ["Pain point", "Curiosity", "Transformation", "Urgency", "Authority"];

  return ranges.slice(0, 5).map(([startSec, endSec], i) => {
    const style = styles[i] || "Curiosity";
    const ts = `${fmt(startSec)} to ${fmt(endSec)}`;
    const hookLine =
      style === "Pain point"
        ? `This is why your ${topic} isn’t getting the views it should`
        : style === "Curiosity"
          ? `I tested ${topic} 3 ways — here’s the one that actually worked`
          : style === "Transformation"
            ? `In 30 seconds, you’ll know how to fix ${topic} starting today`
            : style === "Urgency"
              ? `Stop scrolling — this ${topic} fix takes 60 seconds`
              : `I’ve grown channels with this ${topic} hook — copy the structure`;

    const whyItWorks =
      style === "Pain point"
        ? "Calls out a specific problem and creates immediate relevance."
        : style === "Curiosity"
          ? "Promises a concrete outcome and makes viewers want the comparison."
          : style === "Transformation"
            ? "Sets a clear before/after and a quick payoff."
            : style === "Urgency"
              ? "Uses pattern interrupt and a fast-win promise."
              : "Signals credibility and gives permission to copy a proven structure.";

    return {
      id: `hook-${i + 1}`,
      startSec,
      endSec,
      style,
      hookLine,
      whyItWorks,
    };
  });
}

export function hookAsText(h: HookOption): string {
  return `${h.style}\n${fmt(h.startSec)}-${fmt(h.endSec)}\n${h.hookLine}\nWhy it works: ${h.whyItWorks}`;
}

export function downloadTextFile(filename: string, text: string): void {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
