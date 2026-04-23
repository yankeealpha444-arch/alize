import { Check, Copy, Download, FlaskConical } from "lucide-react";
import { type Clip, formatTime } from "@/data/demoClips";
import { useState } from "react";

interface ClipCardProps {
  clip: Clip;
  isSelected: boolean;
  onSelect: () => void;
}

export default function ClipCard({ clip, isSelected, onSelect }: ClipCardProps) {
  const [imgError, setImgError] = useState(false);
  const canPlay = clip.status === "ready" && !!clip.video_url;
  const label = `Clip ${clip.clip_index + 1}`;
  const actions = [
    { icon: Check, label: "Use Clip" },
    { icon: Copy, label: "Copy Caption" },
    ...(canPlay ? [{ icon: Download, label: "Download Clip" }] : []),
    { icon: FlaskConical, label: "Test" },
  ];

  return (
    <button
      onClick={onSelect}
      className={`group relative flex w-full flex-col overflow-hidden rounded-lg border bg-card text-left transition-all duration-200 ${
        isSelected
          ? "border-foreground/60 ring-2 ring-foreground/20 shadow-xl scale-[1.02]"
          : "border-border/40 hover:border-foreground/30 hover:shadow-lg hover:-translate-y-0.5"
      }`}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video w-full overflow-hidden bg-muted">
        {!imgError && clip.thumbnail_url ? (
          <img
            src={clip.thumbnail_url}
            alt={label}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
            width={640}
            height={360}
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-muted" />
        )}

        {/* Status badge */}
        <div className="absolute left-2 top-2">
          {canPlay ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-card-foreground/80 px-2 py-0.5 text-[10px] font-semibold text-card backdrop-blur-sm">
              <Check className="h-3 w-3" /> Ready
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-md bg-card/80 px-2 py-0.5 text-[10px] font-semibold text-card-foreground backdrop-blur-sm">
              Timestamps
            </span>
          )}
        </div>

        {/* Score */}
        <div className="absolute right-2 top-2">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-card-foreground/80 text-[10px] font-bold text-card backdrop-blur-sm">
            {clip.score}
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-display font-semibold text-card-foreground">
            {label}
          </span>
          <span className="text-xs text-card-foreground/50">
            {formatTime(clip.start_time)} – {formatTime(clip.end_time)}
          </span>
        </div>
        <p className="text-xs text-card-foreground/60 line-clamp-2 leading-relaxed">
          {clip.caption}
        </p>

        {/* Actions */}
        <div className="mt-auto flex flex-wrap gap-1 pt-2">
          {actions.map(({ icon: Icon, label: btnLabel }) => (
            <span
              key={btnLabel}
              role="button"
              tabIndex={0}
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 rounded-md border border-card-foreground/15 px-2 py-1 text-[10px] font-medium text-card-foreground/70 transition-colors hover:bg-card-foreground hover:text-card"
            >
              <Icon className="h-3 w-3" />
              {btnLabel}
            </span>
          ))}
        </div>
      </div>
    </button>
  );
}
