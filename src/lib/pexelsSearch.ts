import { pexelsKeyPresent } from "@/lib/heroImagePexels";

const PEXELS_SEARCH = "https://api.pexels.com/v1/search";

type PexelsPhoto = {
  alt?: string;
  src?: { large2x?: string; large?: string; medium?: string; original?: string };
};

function photoUrl(p: PexelsPhoto): string | null {
  const s = p.src;
  if (!s) return null;
  return s.large2x || s.large || s.original || s.medium || null;
}

/** First photo URL for a search query (square-ish product shots). */
export async function searchPexelsFirstPhotoUrl(query: string): Promise<string | null> {
  if (!pexelsKeyPresent()) return null;
  const key = import.meta.env.VITE_PEXELS_API_KEY as string;
  const url = `${PEXELS_SEARCH}?query=${encodeURIComponent(query)}&per_page=8&size=medium`;
  try {
    const res = await fetch(url, { headers: { Authorization: key.trim() } });
    if (!res.ok) return null;
    const data = (await res.json()) as { photos?: PexelsPhoto[] };
    const p = data.photos?.[0];
    return p ? photoUrl(p) : null;
  } catch {
    return null;
  }
}
