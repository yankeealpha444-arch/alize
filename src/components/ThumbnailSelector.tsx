import { useEffect, useState } from "react";
import { Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Inline SVG — works when `data:` URLs are blocked by CSP; always visibly distinct from pure black UI. */
function MvpThumbnailPlaceholder({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 640 360"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
    >
      <title>Video still placeholder</title>
      <defs>
        <linearGradient id="mvp-thumb-ph-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#52525b" />
          <stop offset="100%" stopColor="#3f3f46" />
        </linearGradient>
      </defs>
      <rect width="640" height="360" fill="url(#mvp-thumb-ph-grad)" />
      <g opacity="0.5" stroke="#a1a1aa" strokeWidth="2" fill="none">
        <rect x="200" y="110" width="240" height="140" rx="10" />
        <path d="M 260 180 L 300 205 L 340 165 L 400 220" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}

export type ThumbnailItem = {
  id: string;
  label: string;
  description: string;
  /**
   * Background image URL (YouTube hqdefault today via `thumbnailPosterSource`).
   * Later: can be a Cloudinary delivery URL — overlay text stays UI-only.
   */
  imageUrl: string;
  /** Overlay text shown on the card (deterministic examples) */
  thumbnailTextExample: string;
  /** Simple priority rank for sorting (not a prediction) */
  score: number;
  /** Visual treatment so each option previews a distinct look. */
  variant: "shock" | "warning" | "results";
};

type ThumbnailImageOverrides = Partial<Record<ThumbnailItem["id"], string>>;

/** Three text-based thumbnail angles with distinct visual treatments. */
export function buildMvpTextThumbnailTemplates(
  posterImageUrl: string,
  imageOverrides?: ThumbnailImageOverrides,
): ThumbnailItem[] {
  const resolveImage = (id: ThumbnailItem["id"]) => imageOverrides?.[id]?.trim() || posterImageUrl;
  return [
    {
      id: "shock",
      label: "Shock",
      description: "Bold, high-energy headline framing",
      imageUrl: resolveImage("shock"),
      thumbnailTextExample: "THIS BLEW UP",
      score: 91,
      variant: "shock",
    },
    {
      id: "warning",
      label: "Warning",
      description: "Curiosity / caution framing",
      imageUrl: resolveImage("warning"),
      thumbnailTextExample: "DON\u0027T DO THIS",
      score: 84,
      variant: "warning",
    },
    {
      id: "results",
      label: "Results",
      description: "Progress or outcome framing",
      imageUrl: resolveImage("results"),
      thumbnailTextExample: "0 TO 10K VIEWS",
      score: 79,
      variant: "results",
    },
  ];
}

function posterImageClassForVariant(variant: ThumbnailItem["variant"]): string {
  switch (variant) {
    case "shock":
      // Dramatic punch: tighter crop, stronger contrast.
      return "scale-[1.14] -translate-y-[4%] saturate-[1.2] contrast-[1.18]";
    case "warning":
      // Different composition + cooler/tense tone.
      return "scale-[1.08] -translate-x-[4%] saturate-[0.9] contrast-[1.06] brightness-[0.95]";
    case "results":
      // Cleaner, brighter proof-style composition.
      return "scale-[1.04] saturate-[1.04] contrast-[1.05] brightness-[1.04]";
    default:
      return "";
  }
}

function overlayClassForVariant(variant: ThumbnailItem["variant"]): string {
  switch (variant) {
    case "shock":
      return "bg-gradient-to-b from-black/10 via-black/5 to-black/30";
    case "warning":
      return "bg-gradient-to-b from-amber-900/20 via-black/10 to-black/30";
    case "results":
      return "bg-gradient-to-b from-emerald-900/10 via-black/8 to-black/22";
    default:
      return "bg-gradient-to-b from-black/12 via-black/8 to-black/24";
  }
}

function ThumbnailBackgroundImage({
  src,
  alt,
  variant,
}: {
  src: string;
  alt: string;
  variant: ThumbnailItem["variant"];
}) {
  const [imgBroken, setImgBroken] = useState(false);
  const [retrySrc, setRetrySrc] = useState<string | null>(null);
  const trimmed = typeof src === "string" ? src.trim() : "";
  const activeSrc = retrySrc ?? trimmed;
  const showRemote = activeSrc.length > 0 && !imgBroken;

  useEffect(() => {
    setImgBroken(false);
    setRetrySrc(null);
  }, [src]);

  console.log("THUMB IMAGE RENDER", {
    src: activeSrc,
    imgBroken,
    showRemote,
  });

  const buildSafeCloudinaryRetry = (url: string): string | null => {
    // Retry once with a conservative transform when aggressive variant params fail.
    const match = url.match(/^(https:\/\/res\.cloudinary\.com\/[^/]+\/video\/fetch\/so_[^,]+),[^/]+\/(.+\.jpg)$/i);
    if (!match) return null;
    const prefix = match[1];
    const encodedSource = match[2];
    return `${prefix},c_fill,g_auto,w_720,h_405/${encodedSource}`;
  };

  const buildYoutubePosterFallback = (url: string): string | null => {
    const m = url.match(/\/([^/]+)\.jpg$/i);
    if (!m) return null;
    try {
      const decoded = decodeURIComponent(m[1]);
      const u = new URL(decoded);
      let id = "";
      if (u.hostname.includes("youtu.be")) {
        id = u.pathname.split("/").filter(Boolean)[0] ?? "";
      } else if (u.hostname.includes("youtube.com")) {
        id = u.searchParams.get("v") ?? "";
      }
      if (!id) return null;
      return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
    } catch {
      return null;
    }
  };

  return (
    <>
      {showRemote ? (
        <img
          src={activeSrc}
          alt={alt}
          className={cn(
            "absolute inset-0 z-[1] h-full w-full object-cover transition-transform",
            posterImageClassForVariant(variant),
          )}
          loading="eager"
          decoding="async"
          width={640}
          height={360}
          onError={() => {
            if (!retrySrc) {
              const safeRetry = buildSafeCloudinaryRetry(trimmed);
              if (safeRetry && safeRetry !== activeSrc) {
                setRetrySrc(safeRetry);
                return;
              }
              const ytPoster = buildYoutubePosterFallback(trimmed);
              if (ytPoster && ytPoster !== activeSrc) {
                setRetrySrc(ytPoster);
                return;
              }
            }
            setImgBroken(true);
          }}
        />
      ) : (
        <MvpThumbnailPlaceholder className="absolute inset-0 z-0 h-full w-full object-cover" />
      )}
    </>
  );
}

/** @deprecated use buildMvpTextThumbnailTemplates — kept for imports that expect a constant */
export const MVP_VIDEO_THUMBNAIL_TEMPLATES: ThumbnailItem[] = buildMvpTextThumbnailTemplates("");

export type ThumbnailSelectorProps = {
  thumbnails: ThumbnailItem[];
  onSelect: (thumbnail: ThumbnailItem) => void;
  onContinue?: () => void;
  recommendedId?: string;
  aiHint?: string;
  initialSelectedId?: string | null;
  initialConfirmed?: boolean;
  disabled?: boolean;
  className?: string;
};

export default function ThumbnailSelector({
  thumbnails,
  onSelect,
  onContinue,
  recommendedId = "shock",
  aiHint,
  initialSelectedId = null,
  initialConfirmed = false,
  disabled = false,
  className,
}: ThumbnailSelectorProps) {
  const [selectedId, setSelectedId] = useState<string | null>(() => initialSelectedId ?? null);
  useEffect(() => {
    if (initialSelectedId) setSelectedId(initialSelectedId);
  }, [initialSelectedId, initialConfirmed, thumbnails]);

  const selected = thumbnails.find((t) => t.id === selectedId) ?? null;

  const handleContinue = () => {
    if (disabled || !selected) return;
    onContinue?.();
  };

  return (
    <div className={cn("space-y-6", disabled && "pointer-events-none", className)}>
      {aiHint ? (
        <p className="text-sm leading-relaxed text-muted-foreground">{aiHint}</p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        {thumbnails.map((thumb) => {
          const isSelected = selectedId === thumb.id;
          const isRecommended = thumb.id === recommendedId;
          console.log("THUMB CARD URL", {
            id: thumb.id,
            imageUrl: thumb.imageUrl,
            label: thumb.label,
          });
          console.log("[thumb-render]", {
            id: thumb.id,
            imageUrl: thumb.imageUrl,
            label: thumb.label,
          });
          const image = thumb.imageUrl;
          console.log("RENDER IMG", thumb.id, thumb.imageUrl);
          return (
            <div
              key={thumb.id}
              className={cn(
                "relative flex flex-col overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm transition-[box-shadow,border-color]",
                isSelected
                  ? "border-foreground ring-2 ring-foreground/20"
                  : "border-border/60 hover:border-border",
              )}
            >
              {isRecommended ? (
                <span className="absolute left-2 top-2 z-[4] inline-flex items-center gap-1 rounded-full bg-foreground px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-background shadow-sm">
                  <Sparkles className="h-3 w-3" />
                  Suggested first test
                </span>
              ) : null}
              <div
                className={cn(
                  "relative w-full min-h-[12rem] overflow-hidden",
                  image.trim().length === 0 ? "border border-dashed border-amber-400/60 bg-muted/50" : "bg-muted",
                )}
                style={{ aspectRatio: "16 / 9" }}
              >
                <ThumbnailBackgroundImage src={thumb.imageUrl} alt={thumb.label} variant={thumb.variant} />
                {/* Light overlay so the real still stays visible on near-black theme */}
                <div
                  className={cn("pointer-events-none absolute inset-0 z-[2]", overlayClassForVariant(thumb.variant))}
                  aria-hidden
                />
                <p className="absolute inset-0 z-[3] flex items-center justify-center px-3 text-center font-black uppercase leading-tight tracking-tight text-white text-sm sm:text-base drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
                  {thumb.thumbnailTextExample}
                </p>
                <div className="absolute left-2 bottom-2 z-[4] flex items-center gap-1">
                  <span className="rounded-md bg-background/95 px-2 py-0.5 text-xs font-bold text-foreground shadow-sm backdrop-blur-sm">
                    {thumb.score}
                  </span>
                  <span className="rounded-md bg-background/90 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground backdrop-blur-sm">
                    priority
                  </span>
                </div>
                {isSelected ? (
                  <span className="absolute right-2 top-2 z-[4] inline-flex h-7 w-7 items-center justify-center rounded-full bg-foreground text-background shadow-md">
                    <Check className="h-4 w-4" strokeWidth={2.5} />
                  </span>
                ) : null}
              </div>
              <div className="flex flex-1 flex-col gap-2 p-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                    {thumb.label}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground/90">
                    Example on-screen text:{" "}
                    <span className="font-medium text-foreground">{thumb.thumbnailTextExample}</span>
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{thumb.description}</p>
                </div>
                <Button
                  type="button"
                  variant={isSelected ? "secondary" : "outline"}
                  className="mt-auto w-full"
                  disabled={disabled}
                  onClick={() => {
                    if (import.meta.env.DEV) {
                      console.log("[mvp-thumb-pipeline]", {
                        step: "thumbnailselector-select-click",
                        beforeSelectId: selectedId,
                        thumbId: thumb.id,
                        imageUrlLen: (thumb.imageUrl ?? "").trim().length,
                      });
                    }
                    setSelectedId((prev) => {
                      if (import.meta.env.DEV) {
                        console.log("[mvp-thumb-pipeline]", {
                          step: "thumbnailselector-select-after",
                          beforeSelectId: prev,
                          afterSelectId: thumb.id,
                        });
                      }
                      return thumb.id;
                    });
                    onSelect(thumb);
                  }}
                >
                  {isSelected ? "Selected" : "Select"}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col items-stretch gap-3 border-t border-border/60 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {selected ? (
            <>
              <span className="font-medium text-foreground">{selected.label}</span> selected.
            </>
          ) : (
            "Pick a thumbnail angle to continue."
          )}
        </p>
        <Button type="button" disabled={disabled || !selected} onClick={handleContinue} className="sm:w-auto">
          Continue
        </Button>
      </div>
    </div>
  );
}
