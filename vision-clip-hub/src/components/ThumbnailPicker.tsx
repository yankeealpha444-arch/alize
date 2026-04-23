import { useEffect, useMemo, useState } from "react";
import { Check, Sparkles, ImageIcon } from "lucide-react";
import type { Clip } from "@/data/demoClips";
import {
  buildClipThumbnailOptions,
  buildDeterministicFallbackOptions,
  getLastThumbnailBuildStats,
  getThumbnailModeHistogram,
} from "@/lib/buildClipThumbnailOptions";
import type { ThumbnailBuildMeta } from "@/lib/buildClipThumbnailOptions";
import type { ThumbnailOption } from "@/lib/thumbnailOptionTypes";

export type { ThumbnailOption };

interface ThumbnailPickerProps {
  onSelect: (thumb: ThumbnailOption) => void;
  selectedId: string | null;
  /** Clip used for frame capture and poster URLs (selected clip or best clip). */
  clip: Clip | null;
  youtubeVideoId?: string | null;
}

export default function ThumbnailPicker({
  onSelect,
  selectedId,
  clip,
  youtubeVideoId,
}: ThumbnailPickerProps) {
  const [options, setOptions] = useState<ThumbnailOption[]>([]);
  const [meta, setMeta] = useState<ThumbnailBuildMeta | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const w = window as Window & {
      __alizeThumbDebug?: {
        getLastThumbnailBuildStats: typeof getLastThumbnailBuildStats;
        getThumbnailModeHistogram: typeof getThumbnailModeHistogram;
      };
    };
    w.__alizeThumbDebug = { getLastThumbnailBuildStats, getThumbnailModeHistogram };
    return () => {
      delete w.__alizeThumbDebug;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const TIMEOUT_MS = 14_000;

    (async () => {
      let built: Awaited<ReturnType<typeof buildClipThumbnailOptions>> | undefined;
      try {
        built = await Promise.race([
          buildClipThumbnailOptions({
            clip,
            youtubeVideoId: youtubeVideoId ?? null,
          }),
          new Promise<never>((_, reject) => {
            window.setTimeout(() => reject(new Error("thumb-build-timeout")), TIMEOUT_MS);
          }),
        ]);
      } catch (err) {
        if (import.meta.env.DEV && typeof console !== "undefined" && console.warn) {
          console.warn("[ThumbnailPicker] build failed or timed out — deterministic fallback", err);
        }
        if (clip) {
          built = await buildDeterministicFallbackOptions(clip, youtubeVideoId ?? null);
        }
      } finally {
        if (cancelled) return;
        if (built && built.options.length >= 3) {
          setOptions(built.options.slice(0, 3));
          setMeta(built.meta);
        } else if (built && built.options.length >= 1) {
          setOptions(built.options);
          setMeta(built.meta);
        } else {
          setOptions([]);
          setMeta(
            built?.meta ?? {
              mode: "static_demo",
              detail:
                "Thumbnails are not ready — no usable video or poster source, or styling failed. Try again after processing finishes.",
            },
          );
        }
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    clip?.id,
    clip?.start_time,
    clip?.end_time,
    clip?.video_url,
    clip?.thumbnail_url,
    youtubeVideoId,
  ]);

  const sorted = [...options].sort((a, b) => b.score - a.score);
  const bestId = sorted[0]?.id ?? "";
  const sameSrcTriplet = useMemo(() => {
    if (options.length < 2) return false;
    const first = options[0]?.src;
    return options.every((o) => o.src === first);
  }, [options]);
  const showSameImageBadge = meta?.mode === "single_poster_triplicate" && sameSrcTriplet;

  return (
    <section className="mt-16 border-t border-border/40 pt-10">
      <div className="mb-6 max-w-2xl">
        <div className="mb-2 inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
          <ImageIcon className="h-3.5 w-3.5" />
          Step 3 — Pick your thumbnail
        </div>
        <h2 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Now choose how it looks
        </h2>
        <p className="mt-2 text-muted-foreground">
          {meta?.mode === "static_demo" && options.length === 0
            ? "Thumbnails are not ready yet — see Source below."
            : showSameImageBadge
              ? "Preview only — real thumbnails will improve after processing. Pick the best match for now."
              : "Three cover options for this clip. The right thumbnail can double your clicks."}
        </p>
        {meta ? (
          <p className="mt-2 text-[11px] text-muted-foreground/90 leading-relaxed" title={meta.detail}>
            <span className="font-semibold text-foreground/80">Source:</span> {meta.detail}
          </p>
        ) : null}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground animate-pulse">Generating cover options…</p>
      ) : null}

      {!loading && options.length === 0 ? (
        <p className="text-sm text-muted-foreground max-w-xl">
          No styled thumbnails to show yet. When the clip has a processed video URL or poster, three social-style
          options (Zoomed, High contrast, Clean) will appear here.
        </p>
      ) : null}

      {!loading && options.length > 0 && (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((t) => {
            const isBest = t.id === bestId;
            const isSelected = selectedId === t.id;
            return (
              <div key={t.id} className={`flex flex-col ${isBest ? "lg:-mt-2" : ""}`}>
                <div className="mb-2 flex items-center justify-between text-[11px] font-medium uppercase tracking-widest">
                  <span className={isBest ? "text-foreground" : "text-muted-foreground"}>{t.name}</span>
                  {isBest && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-foreground px-2 py-0.5 text-[10px] font-bold text-background">
                      <Sparkles className="h-2.5 w-2.5" />
                      Best
                    </span>
                  )}
                </div>

                <div
                  className={`relative aspect-video w-full overflow-hidden rounded-lg bg-muted transition-all ${
                    isBest
                      ? "ring-2 ring-foreground shadow-2xl shadow-black/50"
                      : "border border-border/40 hover:border-border/70"
                  }`}
                >
                  <img
                    src={t.src}
                    alt={t.name}
                    className="h-full w-full object-cover"
                    loading="lazy"
                    width={1024}
                    height={576}
                    onError={(e) => {
                      const el = e.currentTarget;
                      if (youtubeVideoId && el.src.includes("maxresdefault")) {
                        el.src = `https://i.ytimg.com/vi/${youtubeVideoId}/hqdefault.jpg`;
                      }
                    }}
                  />
                  {showSameImageBadge ? (
                    <div className="absolute bottom-2 left-2 right-2">
                      <span className="rounded-md bg-background/95 px-2 py-1 text-[10px] font-medium text-foreground shadow-sm backdrop-blur-sm">
                        Same image — label only
                      </span>
                    </div>
                  ) : null}
                  <div className="absolute left-2 top-2 flex items-center gap-1">
                    <span className="rounded-md bg-background/90 px-1.5 py-0.5 text-[10px] font-bold text-foreground backdrop-blur-sm">
                      {t.score}
                    </span>
                    <span className="rounded-md bg-background/90 px-1.5 py-0.5 text-[10px] font-semibold text-foreground backdrop-blur-sm">
                      {t.uplift}
                    </span>
                  </div>
                </div>

                <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                  <span className="font-semibold text-foreground">Why:</span> {t.reason}
                </p>

                <button
                  type="button"
                  onClick={() => onSelect(t)}
                  className={`mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-semibold transition-transform hover:scale-[1.02] active:scale-100 ${
                    isBest
                      ? "bg-foreground text-background"
                      : "border border-border/60 bg-transparent text-foreground/80 hover:border-foreground/60 hover:text-foreground"
                  }`}
                >
                  {isSelected ? (
                    <>
                      <Check className="h-4 w-4" />
                      Selected
                    </>
                  ) : (
                    <>Use this thumbnail</>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
