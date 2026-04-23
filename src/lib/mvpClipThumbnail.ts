export type MvpClipCard = {
  label: "Clean cut" | "High contrast" | "Emotional";
  score: number;
  multiplier: string;
  range: string;
  bestFor: string;
  subline: string;
  description: string;
  cta: string;
  thumbPhrase: string;
  thumbStyle: "clean" | "contrast" | "emotional";
  isBest?: boolean;
};

function encodeSvg(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function buildThumbnailDataUrl(card: MvpClipCard): string {
  const base =
    card.thumbStyle === "clean"
      ? {
          bgA: "#2B7FFF",
          bgB: "#7A42FF",
          glow: "#FFD84D",
          cropX: 920,
          cropY: 350,
          cropR: 210,
          phraseY: 160,
          phraseBg: "rgba(12,16,34,0.72)",
        }
      : card.thumbStyle === "contrast"
        ? {
            bgA: "#111111",
            bgB: "#FF005C",
            glow: "#00E5FF",
            cropX: 960,
            cropY: 280,
            cropR: 240,
            phraseY: 126,
            phraseBg: "rgba(0,0,0,0.78)",
          }
        : {
            bgA: "#FF7A18",
            bgB: "#FF3D81",
            glow: "#4AE3B5",
            cropX: 860,
            cropY: 320,
            cropR: 228,
            phraseY: 168,
            phraseBg: "rgba(16,8,20,0.68)",
          };

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${base.bgA}"/>
      <stop offset="100%" stop-color="${base.bgB}"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.28" cy="0.32" r="0.65">
      <stop offset="0%" stop-color="${base.glow}" stop-opacity="0.95"/>
      <stop offset="100%" stop-color="${base.glow}" stop-opacity="0"/>
    </radialGradient>
    <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="14"/>
    </filter>
  </defs>

  <rect width="1280" height="720" fill="url(#bg)"/>
  <rect width="1280" height="720" fill="url(#glow)" opacity="0.45"/>

  <g opacity="0.34" filter="url(#soft)">
    <circle cx="220" cy="600" r="180" fill="#ffffff"/>
    <circle cx="1100" cy="140" r="160" fill="#ffffff"/>
  </g>

  <g>
    <rect x="70" y="85" width="670" height="560" rx="28" fill="rgba(0,0,0,0.22)" />
    <rect x="88" y="105" width="634" height="520" rx="22" fill="rgba(255,255,255,0.10)" />
    <circle cx="${base.cropX}" cy="${base.cropY}" r="${base.cropR}" fill="rgba(0,0,0,0.40)" />
    <circle cx="${base.cropX}" cy="${base.cropY}" r="${base.cropR - 26}" fill="rgba(255,255,255,0.18)" />
    <rect x="780" y="540" width="390" height="86" rx="22" fill="rgba(0,0,0,0.50)" />
  </g>

  <rect x="84" y="${base.phraseY}" width="560" height="96" rx="24" fill="${base.phraseBg}" />
  <text x="120" y="${base.phraseY + 62}" fill="#FFFFFF" style="font: 900 58px Arial, sans-serif; letter-spacing: 1px;">${card.thumbPhrase}</text>

  <text x="102" y="590" fill="#FFFFFF" style="font: 700 34px Arial, sans-serif;">${card.label.toUpperCase()}</text>
  <text x="790" y="596" fill="#FFFFFF" style="font: 800 42px Arial, sans-serif;">${card.subline.toUpperCase()}</text>
</svg>`;
  return encodeSvg(svg);
}

export const MVP_CLIP_CARDS: MvpClipCard[] = [
  {
    label: "Clean cut",
    score: 94,
    multiplier: "2.4x",
    range: "0:32–1:11",
    bestFor: "Best for first upload",
    subline: "2.4x vs baseline",
    description: "Hook lands fast and chorus is familiar",
    cta: "Copy and use this clip",
    thumbPhrase: "SAFE WINNER",
    thumbStyle: "clean",
    isBest: true,
  },
  {
    label: "High contrast",
    score: 87,
    multiplier: "1.9x",
    range: "0:45–1:31",
    bestFor: "Best for backup test",
    subline: "1.9x vs baseline",
    description: "Strong motion and recognisable moment",
    cta: "Copy as backup",
    thumbPhrase: "STOP SCROLL",
    thumbStyle: "contrast",
  },
  {
    label: "Emotional",
    score: 79,
    multiplier: "1.4x",
    range: "0:58–1:11",
    bestFor: "Best for fast variation",
    subline: "1.4x vs baseline",
    description: "Short punchy section for quick testing",
    cta: "Copy for testing",
    thumbPhrase: "WHY THIS HITS",
    thumbStyle: "emotional",
  },
];

export function mvpThumbnailDataUrlForLabel(label: string): string | null {
  const c = MVP_CLIP_CARDS.find((x) => x.label === label);
  return c ? buildThumbnailDataUrl(c) : null;
}

export function mvpThumbPhraseForLabel(label: string): string | null {
  const c = MVP_CLIP_CARDS.find((x) => x.label === label);
  return c?.thumbPhrase ?? null;
}
