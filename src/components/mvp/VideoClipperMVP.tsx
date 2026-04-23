import { useMemo } from "react";
import { toast } from "sonner";
import { trackEvent } from "@/lib/trackingEvents";
import { buildThumbnailDataUrl, MVP_CLIP_CARDS, type MvpClipCard } from "@/lib/mvpClipThumbnail";

type Props = {
  projectId: string;
  ideaSeed?: string;
  hideDashboardFab?: boolean;
};

export default function VideoClipperMVP({ projectId, ideaSeed, hideDashboardFab }: Props) {
  const sourceFilename = "summer_concert_final_v2.mp4";
  const cards = useMemo<MvpClipCard[]>(() => MVP_CLIP_CARDS, []);
  const thumbnailsByLabel = useMemo(() => {
    const map: Record<MvpClipCard["label"], string> = {
      "Clean cut": "",
      "High contrast": "",
      Emotional: "",
    };
    for (const c of cards) map[c.label] = buildThumbnailDataUrl(c);
    return map;
  }, [cards]);

  const onUseBestClip = async () => {
    void trackEvent("cta_clicked", projectId, "use_best_clip");
    void trackEvent("clip_selected", projectId, "clean_cut");
    toast.success("Best clip selected");
  };

  const onCopy = async (card: MvpClipCard) => {
    const text = `${card.label} | ${card.score} | ${card.multiplier} | ${card.range}`;
    try {
      await navigator.clipboard.writeText(text);
      void trackEvent("copy_clicked", projectId, card.label.toLowerCase().replace(/\s+/g, "_"));
      void trackEvent("clip_selected", projectId, card.label.toLowerCase().replace(/\s+/g, "_"));
      toast.success("Copied");
    } catch {
      toast.error("Copy failed");
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2 mb-8 border-b border-border pb-6">
          <p className="text-sm font-semibold tracking-tight text-foreground">Alizé</p>
          <p className="text-xs text-muted-foreground font-medium truncate max-w-full sm:max-w-md text-right">
            {sourceFilename}
          </p>
        </div>

        <section className="mb-8 rounded-2xl border border-border bg-card p-5 md:p-6">
          <p className="text-lg font-semibold text-foreground">Your Next Step</p>
          <p className="text-sm text-muted-foreground mt-1">Step 2 of 5</p>
          <p className="text-sm text-foreground mt-3">Pick the best clip for your first post</p>
          <button
            type="button"
            onClick={onUseBestClip}
            className="mt-5 rounded-full bg-foreground text-background px-6 py-2.5 text-xs font-semibold hover:opacity-90"
          >
            Use best clip
          </button>
        </section>

        <header className="mb-8 space-y-2">
          <h1 className="text-3xl md:text-[2rem] font-bold tracking-tight text-foreground">Pick your clip</h1>
          <p className="text-sm text-muted-foreground max-w-3xl">
            Compare your original with the top 3 cuts. Copy the winner and paste into your upload.
          </p>
        </header>

        <section className="mb-8 rounded-2xl border border-border bg-card p-5 md:p-6">
          <p className="text-sm font-semibold text-foreground">Original</p>
          <div className="mt-3 rounded-xl border border-border bg-black/90 aspect-video flex items-center justify-center">
            <p className="text-xs text-white/80 tracking-wide">Original video</p>
          </div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground mt-4">Source</p>
          <p className="text-sm text-foreground mt-1">{sourceFilename}</p>
          <button
            type="button"
            className="mt-4 rounded-full border border-border bg-background px-5 py-2 text-xs font-semibold"
          >
            Full upload
          </button>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {cards.map((card) => (
            <article
              key={card.label}
              className={`rounded-2xl border bg-card p-5 flex flex-col gap-3 ${
                card.isBest ? "border-foreground ring-2 ring-foreground/40" : "border-border"
              }`}
            >
              <div className="relative overflow-hidden rounded-xl border border-white/15 aspect-video">
                <img
                  src={thumbnailsByLabel[card.label]}
                  alt={`${card.label} thumbnail option`}
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent px-3 py-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-white">{card.bestFor}</p>
                </div>
              </div>

              <div className="flex items-start justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-foreground">{card.label}</p>
                {card.isBest ? (
                  <span className="rounded-full border border-foreground px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                    Best
                  </span>
                ) : null}
              </div>

              <p className="text-sm font-semibold text-foreground">{card.label}</p>
              <p className="text-4xl font-bold text-foreground tabular-nums">{card.score}</p>
              <p className="text-base font-semibold text-foreground">{card.multiplier}</p>
              <p className="text-sm text-muted-foreground">{card.range}</p>
              <p className="text-sm font-medium text-foreground">{card.bestFor}</p>
              <p className="text-sm text-muted-foreground">{card.subline}</p>
              <p className="text-sm text-foreground">{card.description}</p>
              {card.isBest ? (
                <p className="text-sm text-muted-foreground">
                  AI says: This is your best clip. Copy and paste it into your upload now.
                </p>
              ) : null}
              <button
                type="button"
                onClick={() => void onCopy(card)}
                className={`mt-auto rounded-full px-4 py-2.5 text-xs font-semibold ${
                  card.isBest
                    ? "bg-foreground text-background"
                    : "border border-border bg-background text-foreground"
                }`}
              >
                {card.cta}
              </button>
            </article>
          ))}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-8">
          Scores are predictive. Always trust your eye.
        </p>

        {!hideDashboardFab ? (
          <p className="sr-only">
            {ideaSeed}
          </p>
        ) : null}
      </div>
    </div>
  );
}
