import { useRef, useState, useEffect } from "react";
import { Play } from "lucide-react";
import { type Clip, formatTime } from "@/data/demoClips";

interface ClipPlayerProps {
  clip: Clip;
}

export default function ClipPlayer({ clip }: ClipPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showVideo, setShowVideo] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasError, setHasError] = useState(false);

  const canPlay = clip.status === "ready" && !!clip.video_url;
  const label = `Clip ${clip.clip_index + 1}`;

  // Reset state when clip changes
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }

    setShowVideo(false);
    setIsPlaying(false);
    setHasError(false);
  }, [clip.id]);

  const handlePlay = () => {
    if (!canPlay) return;

    setShowVideo(true);
    setIsPlaying(true);
    setHasError(false);
  };

  // Auto-play once video element mounts
  useEffect(() => {
    if (!showVideo || !videoRef.current) return;
    const video = videoRef.current;

    video
      .play()
      .then(() => {
        setIsPlaying(true);
      })
      .catch(() => {
        // Autoplay blocked — keep the real player mounted with controls visible
        setIsPlaying(false);
      });

    return () => {
      video.pause();
    };
  }, [showVideo, clip.video_url]);

  return (
    <div className="space-y-5">
      {/* Video / Thumbnail area */}
      <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-muted shadow-2xl shadow-black/40">
        {/* Thumbnail layer — always behind */}
        {clip.thumbnail_url && !showVideo && (
          <img
            src={clip.thumbnail_url}
            alt={`${label} thumbnail`}
            className="absolute inset-0 h-full w-full object-cover"
            width={1280}
            height={720}
          />
        )}

        {!clip.thumbnail_url && !showVideo && (
          <div className="absolute inset-0 bg-muted" />
        )}

        {/* Video layer */}
        {showVideo && clip.video_url && (
          <video
            key={clip.id}
            ref={videoRef}
            src={clip.video_url}
            poster={clip.thumbnail_url || undefined}
            className="absolute inset-0 h-full w-full object-cover"
            controls
            autoPlay
            playsInline
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => setIsPlaying(false)}
            onError={() => setHasError(true)}
          />
        )}

        {/* Error fallback */}
        {hasError && showVideo && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted">
            {clip.thumbnail_url && (
              <img src={clip.thumbnail_url} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" />
            )}
            <span className="relative text-sm text-muted-foreground">Video unavailable</span>
          </div>
        )}

        {/* Play overlay — only when not showing video */}
        {!showVideo && (
          <button
            type="button"
            onClick={handlePlay}
            disabled={!canPlay}
            className="absolute inset-0 flex items-center justify-center bg-black/30 transition-colors hover:bg-black/40 focus:outline-none disabled:cursor-default"
            aria-label={canPlay ? `Play ${label}` : `${label} is timestamps only`}
          >
            {canPlay ? (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/90 shadow-lg backdrop-blur-sm transition-transform hover:scale-110">
                <Play className="h-7 w-7 fill-black text-black ml-1" />
              </div>
            ) : (
              <span className="rounded-md bg-black/50 px-3 py-1.5 text-xs font-medium text-white/70 backdrop-blur-sm">
                Timestamps only
              </span>
            )}
          </button>
        )}

        {/* Pause button when playing without native controls visible */}
      </div>

      {/* Clip meta */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-display font-semibold text-foreground">
              {label}
            </h3>
            <span className="text-sm text-muted-foreground">
              {formatTime(clip.start_time)} → {formatTime(clip.end_time)}
            </span>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-lg">
            {clip.caption}
          </p>
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-foreground text-xs font-bold text-background">
          {clip.score}
        </div>
      </div>
    </div>
  );
}
