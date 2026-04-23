/**
 * Deterministic marketplace catalog from the founder's idea.
 * Images are filled with curated fallbacks first; Pexels hydrates in the UI.
 */

import { searchPexelsFirstPhotoUrl } from "@/lib/pexelsSearch";

export type MarketplaceItem = {
  id: string;
  title: string;
  price: string;
  description: string;
  image: string;
};

const FASHION_TITLES = [
  "Streetwear Hoodie",
  "Minimal Linen Shirt",
  "Oversized Denim Jacket",
  "Merino Crewneck Sweater",
  "Tailored Wide-Leg Trousers",
  "Canvas High-Top Sneakers",
  "Structured Tote Bag",
  "Ribbed Knit Midi Dress",
  "Technical Running Shorts",
  "Wool Blend Overcoat",
  "Vintage Wash Tee",
  "Pleated Midi Skirt",
];

const GENERIC_TITLES = [
  "Featured listing A",
  "Featured listing B",
  "Curated pick",
  "Top rated",
  "Staff pick",
  "New arrival",
  "Limited drop",
  "Bestseller",
];

const FASHION_DESCRIPTIONS: string[] = [
  "Premium fabric with a relaxed fit — easy to dress up or down.",
  "Breathable weave, clean seams, built for everyday wear.",
  "Versatile layer that works across seasons.",
  "Soft hand-feel; pairs with denim or tailored pieces.",
  "Modern cut with attention to detail and finish.",
  "Lightweight comfort with a structured silhouette.",
  "Designed for mix-and-match with your existing wardrobe.",
  "Statement piece without sacrificing comfort.",
];

/** Curated Pexels fashion stills when API is unavailable (deterministic by index). */
export const MARKETPLACE_IMAGE_FALLBACKS: string[] = [
  "https://images.pexels.com/photos/6311666/pexels-photo-6311666.jpeg?auto=compress&cs=tinysrgb&w=600&h=600&fit=crop",
  "https://images.pexels.com/photos/6311392/pexels-photo-6311392.jpeg?auto=compress&cs=tinysrgb&w=600&h=600&fit=crop",
  "https://images.pexels.com/photos/1926769/pexels-photo-1926769.jpeg?auto=compress&cs=tinysrgb&w=600&h=600&fit=crop",
  "https://images.pexels.com/photos/1927259/pexels-photo-1927259.jpeg?auto=compress&cs=tinysrgb&w=600&h=600&fit=crop",
  "https://images.pexels.com/photos/1536619/pexels-photo-1536619.jpeg?auto=compress&cs=tinysrgb&w=600&h=600&fit=crop",
  "https://images.pexels.com/photos/1040945/pexels-photo-1040945.jpeg?auto=compress&cs=tinysrgb&w=600&h=600&fit=crop",
  "https://images.pexels.com/photos/1755385/pexels-photo-1755385.jpeg?auto=compress&cs=tinysrgb&w=600&h=600&fit=crop",
  "https://images.pexels.com/photos/13461809/pexels-photo-13461809.jpeg?auto=compress&cs=tinysrgb&w=600&h=600&fit=crop",
];

function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function isFashionIdea(idea: string): boolean {
  return /\b(clothes|clothing|fashion|outfit|wear|wardrobe|apparel|dress|streetwear)\b/i.test(idea);
}

/** Pexels search strings — concrete fashion / product (no abstract “marketplace” alone). */
export function marketplacePexelsQueries(idea: string): string[] {
  const fashion = isFashionIdea(idea);
  if (fashion) {
    return [
      "fashion outfit model",
      "streetwear clothing",
      "modern clothing ecommerce",
      "clothing ecommerce product",
      "streetwear model photoshoot",
      "apparel product flat lay",
    ];
  }
  return [
    "online shopping product photo",
    "ecommerce product on white background",
    "retail product photography",
    "marketplace listing photo",
  ];
}

/**
 * Always returns 8 items with titles/prices/descriptions; images use fallbacks until hydrated.
 */
export function generateMarketplaceItems(idea: string): MarketplaceItem[] {
  const seed = hashSeed(idea.trim().toLowerCase());
  const fashion = isFashionIdea(idea);
  const titles = fashion ? FASHION_TITLES : GENERIC_TITLES;
  const n = 8;
  const out: MarketplaceItem[] = [];
  for (let i = 0; i < n; i++) {
    const ti = (seed + i * 7) % titles.length;
    const priceNum = 29 + ((seed + i * 13) % 120);
    const desc = FASHION_DESCRIPTIONS[(seed + i) % FASHION_DESCRIPTIONS.length] ?? "Quality listing with clear photos and fast shipping.";
    out.push({
      id: `mp-${seed}-${i + 1}`,
      title: titles[ti] ?? `Item ${i + 1}`,
      price: `$${priceNum}`,
      description: desc,
      image: MARKETPLACE_IMAGE_FALLBACKS[i % MARKETPLACE_IMAGE_FALLBACKS.length]!,
    });
  }
  return out;
}

/** Fetch Pexels image per item; rotates concrete fashion queries. */
export async function hydrateMarketplaceImages(idea: string, items: MarketplaceItem[]): Promise<MarketplaceItem[]> {
  const queries = marketplacePexelsQueries(idea);
  const next = await Promise.all(
    items.map(async (item, i) => {
      const q = queries[i % queries.length]!;
      const url = await searchPexelsFirstPhotoUrl(q);
      if (!url) return item;
      return { ...item, image: url };
    }),
  );
  return next;
}
