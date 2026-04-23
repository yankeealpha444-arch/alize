/**
 * Shared image + accent helpers for SaaS preview surfaces (Builder, Lite, Public).
 * Hero primary/fallback use curated stills (see heroImagePexels); live Pexels swaps in via useSaaSVisualWithHero.
 */

import type { ProductType } from "./productType";
import { buildHeroImageTagPath } from "./templateFamilies";
import { curatedHeroAlt, curatedHeroPrimary } from "./heroImagePexels";

function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export type SaaSVisualAssets = {
  /** Final comma-separated tag path used for URLs */
  keywordQuery: string;
  /** Primary hero — thematic tags for LoremFlickr */
  heroPrimaryUrl: string;
  /** Deterministic fallback (always loads) */
  heroFallbackUrl: string;
  featureThumbUrl: (index: number) => string;
  avatarUrl: (index: number) => string;
};

export function buildSaaSVisualAssets(idea: string, headline: string, productType: ProductType): SaaSVisualAssets {
  const tagPath = buildHeroImageTagPath(productType, idea);
  const devLog = typeof import.meta !== "undefined" && (import.meta as ImportMeta & { env?: { DEV?: boolean } }).env?.DEV;
  if (devLog) {
    console.log("IMAGE TAG PATH", tagPath);
  }
  const seed = hashSeed(`${productType}|${idea}|${headline}|${tagPath}`).toString();

  return {
    keywordQuery: tagPath,
    heroPrimaryUrl: curatedHeroPrimary(productType),
    heroFallbackUrl: curatedHeroAlt(productType),
    featureThumbUrl: (i: number) => `https://picsum.photos/seed/${seed}-f${i}/400/240`,
    avatarUrl: (i: number) => {
      const n = (hashSeed(seed + String(i)) % 70) + 1;
      return `https://i.pravatar.cc/128?img=${n}`;
    },
  };
}

/** Shared shell + button accent classes (Tailwind) */
export const saasShellClass =
  "relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#334155] text-slate-50 shadow-2xl ring-1 ring-white/10 animate-in fade-in duration-500";

export const saasNavClass =
  "border-b border-white/10 bg-slate-950/75 backdrop-blur-xl";

export const saasPrimaryButtonClass =
  "bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/25 hover:from-indigo-600 hover:to-violet-700 hover:shadow-xl hover:shadow-indigo-500/30 transition-all duration-300 hover:-translate-y-0.5";

export const saasSecondaryButtonClass =
  "border border-white/15 bg-white/5 text-slate-200 hover:bg-white/10 hover:border-white/25 transition-all duration-300";

export const saasCardClass =
  "rounded-2xl border border-white/10 bg-slate-900/50 shadow-xl shadow-black/20 backdrop-blur-sm transition-all duration-300 hover:shadow-2xl hover:border-white/15 hover:-translate-y-0.5";
