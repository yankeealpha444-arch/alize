import type { ProductType } from "@/lib/productType";

const PEXELS_SEARCH = "https://api.pexels.com/v1/search";

const PRIMARY: Record<ProductType, string> = {
  growth_tool:
    "https://images.pexels.com/photos/1181677/pexels-photo-1181677.jpeg?auto=compress&cs=tinysrgb&w=900&h=700&fit=crop",
  creator_tool:
    "https://images.pexels.com/photos/3379942/pexels-photo-3379942.jpeg?auto=compress&cs=tinysrgb&w=900&h=700&fit=crop",
  marketplace:
    "https://images.pexels.com/photos/5632402/pexels-photo-5632402.jpeg?auto=compress&cs=tinysrgb&w=900&h=700&fit=crop",
  "ai-tool":
    "https://images.pexels.com/photos/5905708/pexels-photo-5905708.jpeg?auto=compress&cs=tinysrgb&w=900&h=700&fit=crop",
  saas:
    "https://images.pexels.com/photos/1181677/pexels-photo-1181677.jpeg?auto=compress&cs=tinysrgb&w=900&h=700&fit=crop",
  tool:
    "https://images.pexels.com/photos/4348401/pexels-photo-4348401.jpeg?auto=compress&cs=tinysrgb&w=900&h=700&fit=crop",
  landing:
    "https://images.pexels.com/photos/7688336/pexels-photo-7688336.jpeg?auto=compress&cs=tinysrgb&w=900&h=700&fit=crop",
};

const ALT: Record<ProductType, string> = {
  growth_tool:
    "https://images.pexels.com/photos/7688336/pexels-photo-7688336.jpeg?auto=compress&cs=tinysrgb&w=900&h=700&fit=crop",
  creator_tool:
    "https://images.pexels.com/photos/6899260/pexels-photo-6899260.jpeg?auto=compress&cs=tinysrgb&w=900&h=700&fit=crop",
  marketplace:
    "https://images.pexels.com/photos/34577/pexels-photo.jpg?auto=compress&cs=tinysrgb&w=900&h=700&fit=crop",
  "ai-tool":
    "https://images.pexels.com/photos/5212345/pexels-photo-5212345.jpeg?auto=compress&cs=tinysrgb&w=900&h=700&fit=crop",
  saas:
    "https://images.pexels.com/photos/4348401/pexels-photo-4348401.jpeg?auto=compress&cs=tinysrgb&w=900&h=700&fit=crop",
  tool:
    "https://images.pexels.com/photos/1181677/pexels-photo-1181677.jpeg?auto=compress&cs=tinysrgb&w=900&h=700&fit=crop",
  landing:
    "https://images.pexels.com/photos/4348401/pexels-photo-4348401.jpeg?auto=compress&cs=tinysrgb&w=900&h=700&fit=crop",
};

export function curatedHeroPrimary(productType: ProductType): string {
  return PRIMARY[productType] ?? PRIMARY.saas;
}

export function curatedHeroAlt(productType: ProductType): string {
  return ALT[productType] ?? ALT.saas;
}

export function pexelsKeyPresent(): boolean {
  const k = import.meta.env.VITE_PEXELS_API_KEY;
  return typeof k === "string" && k.trim().length > 0;
}

/** Safe dev log — never prints the key. */
function devInfo(...args: unknown[]): void {
  if (import.meta.env.DEV) console.info(...args);
}

export function logPexelsKeyStatus(): void {
  devInfo(`[Hero] PEXELS KEY FOUND = ${pexelsKeyPresent()}`);
}

type PexelsPhoto = {
  alt?: string;
  src?: { large2x?: string; large?: string; medium?: string; original?: string };
};

function scoreAlt(alt: string): number {
  const a = alt.toLowerCase();
  let s = 0;
  const good = [
    "person",
    "people",
    "woman",
    "man",
    "laptop",
    "computer",
    "phone",
    "smartphone",
    "mobile",
    "desk",
    "workspace",
    "office",
    "creator",
    "social",
    "content",
    "video",
    "editing",
    "student",
    "learning",
    "shopping",
    "ecommerce",
    "typing",
    "working",
  ];
  const bad = [
    "bridge",
    "skyline",
    "cityscape",
    "city view",
    "landscape",
    "forest",
    "mountain",
    "rainforest",
    "architecture",
    "building exterior",
    "aerial",
    "highway",
    "empty",
    "skyscraper",
    "downtown",
  ];
  for (const w of good) if (a.includes(w)) s += 2;
  for (const w of bad) if (a.includes(w)) s -= 8;
  return s;
}

function pickBestPhoto(photos: PexelsPhoto[]): { photo: PexelsPhoto; index: number } | null {
  const slice = photos.slice(0, 5);
  if (!slice.length) return null;
  let bestI = 0;
  let bestScore = scoreAlt(slice[0]!.alt || "");
  for (let i = 1; i < slice.length; i++) {
    const sc = scoreAlt(slice[i]!.alt || "");
    if (sc > bestScore) {
      bestScore = sc;
      bestI = i;
    }
  }
  if (bestScore < -2) return null;
  return { photo: slice[bestI]!, index: bestI };
}

/**
 * Tight queries — avoid lone abstract words (growth, audience, dashboard, creator alone).
 */
export function buildPexelsSearchQuery(productType: ProductType, idea: string): string {
  const i = idea.toLowerCase();
  if (productType === "growth_tool") {
    if (i.includes("instagram") || i.includes("insta"))
      return "person using smartphone social media content creator workspace";
    if (i.includes("youtube") || i.includes("yt "))
      return "person youtube creator laptop smartphone video content";
    if (i.includes("tiktok") || i.includes("tik tok"))
      return "person smartphone short video social media creator";
    return "social media manager laptop smartphone workspace content creator";
  }
  if (productType === "creator_tool") {
    if (i.includes("clip") || i.includes("clipper") || i.includes("short") || i.includes("reel"))
      return "video editing laptop short form content creator desk";
    if (i.includes("youtube"))
      return "video editing on laptop content creator youtube workspace";
    return "video editing on laptop content creator camera desk workspace";
  }
  if (productType === "marketplace") {
    if (/\b(clothes|clothing|fashion|outfit|wear|wardrobe|apparel)\b/i.test(i))
      return "fashion outfit model streetwear clothing ecommerce";
    return "clothing ecommerce product online shopping retail";
  }
  if (productType === "ai-tool") return "student studying laptop desk learning education app";
  if (productType === "tool") return "productivity software laptop workspace person typing";
  if (productType === "landing") return "laptop workspace modern desk startup website";
  return "team collaboration laptop modern office software workspace";
}

function photoUrl(p: PexelsPhoto): string | null {
  const s = p.src;
  if (!s) return null;
  return s.large2x || s.large || s.original || s.medium || null;
}

export type PexelsHeroResult = {
  query: string;
  selectedUrl: string | null;
  firstUrl: string | null;
  selectedIndex: number;
  usedPexels: boolean;
  bestAlt: string | null;
};

export async function fetchPexelsHero(productType: ProductType, idea: string): Promise<PexelsHeroResult> {
  const query = buildPexelsSearchQuery(productType, idea);
  const fallback = curatedHeroPrimary(productType);

  if (!pexelsKeyPresent()) {
    devInfo("[Hero] Pexels skipped — no VITE_PEXELS_API_KEY");
    return {
      query,
      selectedUrl: null,
      firstUrl: null,
      selectedIndex: -1,
      usedPexels: false,
      bestAlt: null,
    };
  }

  const key = import.meta.env.VITE_PEXELS_API_KEY as string;
  const url = `${PEXELS_SEARCH}?query=${encodeURIComponent(query)}&per_page=15&orientation=landscape`;

  try {
    const res = await fetch(url, {
      headers: { Authorization: key.trim() },
    });
    if (!res.ok) {
      if (import.meta.env.DEV) console.warn("[Hero] Pexels HTTP", res.status);
      return {
        query,
        selectedUrl: null,
        firstUrl: null,
        selectedIndex: -1,
        usedPexels: false,
        bestAlt: null,
      };
    }
    const data = (await res.json()) as { photos?: PexelsPhoto[] };
    const photos = data.photos || [];
    const firstUrl = photos[0] ? photoUrl(photos[0]!) : null;
    const picked = pickBestPhoto(photos);
    const selectedUrl = picked ? photoUrl(picked.photo) : null;
    const selectedIndex = picked ? picked.index : -1;
    const bestAlt = picked?.photo.alt ?? null;

    devInfo("[Hero] Pexels query:", query);
    devInfo("[Hero] first URL:", firstUrl);
    devInfo("[Hero] selected URL:", selectedUrl || fallback, "alt:", bestAlt, "index:", selectedIndex);

    return {
      query,
      selectedUrl: selectedUrl || null,
      firstUrl,
      selectedIndex,
      usedPexels: true,
      bestAlt,
    };
  } catch (e) {
    if (import.meta.env.DEV) console.warn("[Hero] Pexels fetch failed", e);
    return {
      query,
      selectedUrl: null,
      firstUrl: null,
      selectedIndex: -1,
      usedPexels: false,
      bestAlt: null,
    };
  }
}

/** Final hero URL after fetch (Pexels pick or curated). */
export function resolveHeroUrlAfterFetch(productType: ProductType, result: PexelsHeroResult): string {
  return result.selectedUrl ?? curatedHeroPrimary(productType);
}
