import type { VideoClipRow } from "@/lib/mvp/videoClipperBackend";

export type ThumbnailVariant = "A" | "B" | "C";

function hashToUnit(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function pickCuriosityText(clip: VideoClipRow): string {
  const raw = `${clip.caption || ""}`.trim();
  const cleaned = raw
    .replace(/\s+/g, " ")
    .replace(/[“”]/g, '"')
    .replace(/[’]/g, "'")
    .slice(0, 90)
    .trim();
  if (cleaned.length >= 18) return cleaned.toUpperCase();
  const label = (clip.label || "THIS CLIP").toUpperCase();
  const templates = [
    `YOU'RE DOING THIS WRONG`,
    `WATCH WHAT HAPPENS NEXT`,
    `THE 1 THING YOU MISSED`,
    `STOP SCROLLING — ${label}`,
    `THIS CHANGES EVERYTHING`,
  ];
  const idx = Math.floor(hashToUnit(clip.id) * templates.length);
  return templates[idx]!;
}

function pickStopScrollHook(clip: VideoClipRow, seed: string): string {
  const curiosity = pickCuriosityText(clip);
  const short = curiosity.split(/\s+/).slice(0, 5).join(" ");
  if (short.length >= 8 && short.length <= 42) return short.toUpperCase();
  const pool = [
    "DO NOT SKIP THIS",
    "THIS IS THE PART THAT MATTERS",
    "WATCH BEFORE YOU POST",
    "THE HOOK THAT WINS FEEDS",
  ];
  return pool[Math.floor(hashToUnit(`${seed}:bhook`) * pool.length)]!;
}

function pickEmotionalHookText(clip: VideoClipRow, seed: string): string {
  const raw = `${clip.caption || ""}`.trim().replace(/\s+/g, " ");
  if (raw.length >= 14 && raw.length <= 80) return raw;
  const pool = [
    "The moment it finally made sense",
    "Why this felt different",
    "Real talk — no fluff",
    "This one hit personal",
    "The part I almost cut",
  ];
  return pool[Math.floor(hashToUnit(`${seed}:emo`) * pool.length)]!;
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = word;
      if (lines.length >= maxLines) break;
    } else {
      line = next;
    }
  }
  if (line && lines.length < maxLines) lines.push(line);
  return lines.slice(0, maxLines);
}

function drawVariantChip(
  ctx: CanvasRenderingContext2D,
  variant: ThumbnailVariant,
  x: number,
  y: number,
  theme: "onDark" | "onLight",
) {
  ctx.fillStyle = theme === "onDark" ? "rgba(255,255,255,0.92)" : "rgba(15,23,42,0.88)";
  ctx.strokeStyle = theme === "onDark" ? "rgba(15,23,42,0.2)" : "rgba(255,255,255,0.2)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x, y, 64, 34, 18);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = theme === "onDark" ? "rgb(15,23,42)" : "rgba(255,255,255,0.95)";
  ctx.font = "800 16px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  ctx.textBaseline = "middle";
  ctx.fillText(variant, x + 26, y + 17);
}

export function generateThumbnailDataUrl(variant: ThumbnailVariant, clip: VideoClipRow, directionSeed: string): string {
  const w = 1280;
  const h = 720;
  if (typeof document === "undefined") return "";
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  const u = hashToUnit(`${directionSeed}:${clip.id}:${variant}`);
  const u2 = hashToUnit(`${directionSeed}:${clip.id}:${variant}:2`);
  const u3 = hashToUnit(`${directionSeed}:${clip.id}:${variant}:3`);

  const label = (clip.label || "Highlight clip").toUpperCase();

  if (variant === "A") {
    const topR = Math.floor(36 + u * 14);
    const topG = Math.floor(44 + u2 * 16);
    const topB = Math.floor(58 + u3 * 18);
    const botR = Math.floor(52 + u * 20);
    const botG = Math.floor(62 + u2 * 14);
    const botB = Math.floor(78 + u3 * 12);
    const g = ctx.createLinearGradient(0, 0, w, h * 1.05);
    g.addColorStop(0, `rgb(${topR},${topG},${topB})`);
    g.addColorStop(1, `rgb(${botR},${botG},${botB})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = "rgba(255,255,255,0.045)";
    const step = 16;
    for (let x = 0; x < w; x += step) {
      for (let y = 0; y < h; y += step) {
        if (((x + y) / step) % 2 === 0) ctx.fillRect(x, y, 2, 2);
      }
    }

    const vig = ctx.createRadialGradient(w * 0.5, h * 0.4, h * 0.12, w * 0.5, h * 0.45, h * 0.95);
    vig.addColorStop(0, "rgba(0,0,0,0)");
    vig.addColorStop(1, "rgba(0,0,0,0.28)");
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, w, h);

    const cardW = w - 160;
    const cardH = 210;
    const cardX = 80;
    const cardY = h - cardH - 72;
    ctx.fillStyle = "rgba(255,255,255,0.94)";
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, 20);
    ctx.fill();
    ctx.strokeStyle = "rgba(15,23,42,0.1)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = "rgb(15,23,42)";
    ctx.font = "700 40px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    ctx.textBaseline = "top";
    const titleLines = wrapLines(ctx, label, cardW - 56, 2);
    titleLines.forEach((ln, i) => ctx.fillText(ln, cardX + 28, cardY + 28 + i * 46));

    ctx.fillStyle = "rgba(15,23,42,0.5)";
    ctx.font = "600 19px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    ctx.fillText("Balanced layout • High readability", cardX + 28, cardY + cardH - 72);
    ctx.fillStyle = "rgba(15,23,42,0.38)";
    ctx.font = "600 16px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    ctx.fillText("Works in feeds, search, and small tiles", cardX + 28, cardY + cardH - 44);

    drawVariantChip(ctx, variant, 18, 18, "onDark");
  } else if (variant === "B") {
    ctx.fillStyle = "#070707";
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = "rgba(250,204,21,0.12)";
    ctx.lineWidth = 3;
    for (let i = -h; i < w + h; i += 48) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + h * 1.05, h);
      ctx.stroke();
    }

    const bandH = Math.floor(h * (0.36 + u * 0.04));
    const bandGrad = ctx.createLinearGradient(0, 0, 0, bandH);
    bandGrad.addColorStop(0, "#fef9c3");
    bandGrad.addColorStop(1, "#facc15");
    ctx.fillStyle = bandGrad;
    ctx.fillRect(0, 0, w, bandH);

    ctx.fillStyle = "#0f172a";
    ctx.font = "900 92px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    ctx.textBaseline = "alphabetic";
    ctx.fillText("STOP SCROLL", 44, bandH - 26);

    ctx.fillStyle = "rgba(15,23,42,0.92)";
    ctx.font = "900 44px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    const hook = pickStopScrollHook(clip, directionSeed);
    const hookLines = wrapLines(ctx, hook, w - 100, 2);
    hookLines.forEach((ln, i) => ctx.fillText(ln, 44, h - 200 + i * 52));

    ctx.fillStyle = "#f43f5e";
    ctx.fillRect(44, h - 118, clamp(480 + u2 * 300, 460, 780), 16);

    ctx.fillStyle = "rgba(255,255,255,0.78)";
    ctx.font = "700 22px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    ctx.fillText("MAX CONTRAST • BUILT TO INTERRUPT THE FEED", 44, h - 72);

    ctx.globalAlpha = 0.22;
    ctx.fillStyle = "#ffffff";
    for (let x = 0; x < w; x += 22) {
      ctx.fillRect(x, bandH, 10, h - bandH);
    }
    ctx.globalAlpha = 1;

    drawVariantChip(ctx, variant, w - 82, 18, "onLight");
  } else {
    const lg = ctx.createLinearGradient(0, 0, w * 0.9, h);
    lg.addColorStop(0, `rgb(${150 + Math.floor(u * 40)},${60 + Math.floor(u2 * 30)},${80 + Math.floor(u3 * 25)})`);
    lg.addColorStop(0.45, "#7f1d1d");
    lg.addColorStop(1, "#1c1917");
    ctx.fillStyle = lg;
    ctx.fillRect(0, 0, w, h);

    const faceX = w * (0.42 + (u - 0.5) * 0.08);
    const faceY = h * (0.26 + (u2 - 0.5) * 0.06);
    const sg = ctx.createRadialGradient(faceX, faceY, 30, faceX, faceY, w * 0.52);
    sg.addColorStop(0, "rgba(255,250,245,0.42)");
    sg.addColorStop(0.55, "rgba(0,0,0,0.08)");
    sg.addColorStop(1, "rgba(0,0,0,0.65)");
    ctx.fillStyle = sg;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fillRect(0, 0, w, h * 0.72);

    const emotional = pickEmotionalHookText(clip, directionSeed);
    const pad = 52;
    const boxW = Math.floor(w * 0.52);
    const boxH = 260;
    const boxX = pad;
    const boxY = Math.floor(h * 0.18);

    ctx.fillStyle = "rgba(28,25,23,0.72)";
    ctx.strokeStyle = "rgba(251,191,36,0.35)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, boxH, 22);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "rgba(255,253,250,0.96)";
    ctx.font = "italic 700 44px Georgia, 'Times New Roman', serif";
    ctx.textBaseline = "top";
    const emoLines = wrapLines(ctx, emotional, boxW - 40, 4);
    emoLines.forEach((ln, i) => ctx.fillText(ln, boxX + 22, boxY + 28 + i * 52));

    ctx.fillStyle = "rgba(254,243,199,0.9)";
    ctx.font = "800 28px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    ctx.fillText("Closer feel • More personality", boxX + 22, boxY + boxH - 52);

    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.font = "700 20px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    ctx.fillText("Dramatic framing • Emotional pull", boxX + 22, boxY + boxH - 22);

    ctx.fillStyle = "rgba(255,255,255,0.88)";
    ctx.font = "800 26px system-ui, -apple-system, Segoe UI, Roboto, Arial";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(label.slice(0, 24), w - 420, h - 48);

    drawVariantChip(ctx, variant, 18, 18, "onDark");
  }

  return canvas.toDataURL("image/jpeg", 0.88);
}
