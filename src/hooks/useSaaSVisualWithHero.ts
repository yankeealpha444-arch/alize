import { useEffect, useMemo, useState } from "react";
import type { ProductType } from "@/lib/productType";
import {
  curatedHeroPrimary,
  fetchPexelsHero,
  logPexelsKeyStatus,
  resolveHeroUrlAfterFetch,
} from "@/lib/heroImagePexels";
import { buildSaaSVisualAssets, type SaaSVisualAssets } from "@/lib/saasPreviewVisual";

export type SaaSVisualWithHero = SaaSVisualAssets & {
  /** Pexels search string used for the hero (when key present). */
  heroPexelsQuery: string | null;
  /** First photo URL from API (photos[0]), for debugging. */
  heroPexelsFirstUrl: string | null;
  /** Best-scored URL among first five, or null. */
  heroPexelsSelectedUrl: string | null;
};

/**
 * Sync thumbs/avatars from buildSaaSVisualAssets; hero URL loads Pexels asynchronously when VITE_PEXELS_API_KEY is set.
 */
export function useSaaSVisualWithHero(
  idea: string,
  headline: string,
  productType: ProductType
): SaaSVisualWithHero {
  const visual = useMemo(() => buildSaaSVisualAssets(idea, headline, productType), [idea, headline, productType]);
  const [heroPrimaryUrl, setHeroPrimaryUrl] = useState(visual.heroPrimaryUrl);
  const [meta, setMeta] = useState<{
    query: string | null;
    firstUrl: string | null;
    selectedUrl: string | null;
  }>({ query: null, firstUrl: null, selectedUrl: null });

  useEffect(() => {
    setHeroPrimaryUrl(visual.heroPrimaryUrl);
  }, [visual.heroPrimaryUrl]);

  useEffect(() => {
    logPexelsKeyStatus();
    let cancelled = false;
    (async () => {
      const result = await fetchPexelsHero(productType, idea);
      if (cancelled) return;
      setMeta({
        query: result.query,
        firstUrl: result.firstUrl,
        selectedUrl: result.selectedUrl,
      });
      setHeroPrimaryUrl(resolveHeroUrlAfterFetch(productType, result));
    })();
    return () => {
      cancelled = true;
    };
  }, [idea, productType]);

  return {
    ...visual,
    heroPrimaryUrl,
    heroPexelsQuery: meta.query,
    heroPexelsFirstUrl: meta.firstUrl,
    heroPexelsSelectedUrl: meta.selectedUrl,
  };
}
