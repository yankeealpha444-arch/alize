import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link2 } from "lucide-react";
import { useClips } from "@/hooks/useClips";
import { flowStore } from "@/store/flowStore";
import { ensureVideoMvpProjectId } from "../../../src/lib/videoMvpProject";
import { parseYoutubeVideoId } from "../../../src/lib/mvp/youtubeIngest";
import { trackEvent } from "../../../src/lib/trackingEvents";
import { createVideoJobFromSourceUrl } from "../../../src/lib/mvp/videoClipperBackend";

function buildYoutubeEmbedSrc(videoId: string, startTime: number, endTime: number): string {
  return `https://www.youtube.com/embed/${videoId}?start=${Math.floor(startTime)}&end=${Math.ceil(endTime)}&rel=0&modestbranding=1`;
}

function isValidPublicVideoUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) return false;
    if (/^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/i.test(url.hostname)) return false;
    return true;
  } catch {
    return false;
  }
}

export default function LinkClipperMvp() {
  const queryClient = useQueryClient();
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const { clips, isLoading, latestJobStatus } = useClips(activeJobId, false, true);
  const [link, setLink] = useState(flowStore.get().sourceInput ?? "");
  const [message, setMessage] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [shouldScrollToResults, setShouldScrollToResults] = useState(false);
  const resultsRef = useRef<HTMLElement | null>(null);
  const pendingGeneratedTrack = useRef(false);
  const trackedPlayedClipIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    const projectId = ensureVideoMvpProjectId();
    void trackEvent("session_started", projectId, "link_clipper_session");
  }, []);

  useEffect(() => {
    console.log("[clipper][render] activeJobId", activeJobId);
  }, [activeJobId]);

  useEffect(() => {
    if (!shouldScrollToResults || isLoading || clips.length === 0) return;
    resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    if (pendingGeneratedTrack.current) {
      const projectId = ensureVideoMvpProjectId();
      void trackEvent("clips_generated", projectId, "link_clipper_generated", { clip_count: clips.length });
      pendingGeneratedTrack.current = false;
    }
    setShouldScrollToResults(false);
  }, [shouldScrollToResults, isLoading, clips.length]);

  const handleGenerate = async () => {
    const trimmed = link.trim();
    const isYoutube = Boolean(parseYoutubeVideoId(trimmed));
    const isPublicVideoUrl = isValidPublicVideoUrl(trimmed);
    if (!trimmed || (!isYoutube && !isPublicVideoUrl)) {
      setMessage("Paste a valid video link to continue");
      return;
    }
    setIsGenerating(true);
    try {
      setMessage("");
      flowStore.setSource(trimmed);
      const pid = ensureVideoMvpProjectId();
      console.log("[clipper][submit]", {
        submittedUrl: trimmed,
        projectId: pid,
      });
      const createdJob = await createVideoJobFromSourceUrl(pid, trimmed);
      localStorage.setItem(`alize_video_job_id_${pid}`, createdJob.id);
      setActiveJobId(createdJob.id);
      console.log("[clipper][submit]", {
        createdJobId: createdJob.id,
        source_url: createdJob.source_url ?? trimmed,
        projectId: pid,
      });
      void trackEvent("link_submitted", pid, "link_clipper_submit", { source_url: trimmed });
      localStorage.setItem(`alize_clips_source_url_${pid}`, trimmed);
      await queryClient.invalidateQueries({ queryKey: ["clips", pid] });
      await queryClient.refetchQueries({ queryKey: ["clips", pid, createdJob.id], type: "active" });
      pendingGeneratedTrack.current = true;
      setShouldScrollToResults(true);
    } catch {
      const pid = ensureVideoMvpProjectId();
      void trackEvent("generation_failed", pid, "link_clipper_generation_failed");
      setMessage("Could not generate clips from that link. Try another public video URL.");
    } finally {
      setIsGenerating(false);
    }
  };

  const isQueuedOrProcessing = latestJobStatus === "queued" || latestJobStatus === "processing";
  const displayClips = clips;

  console.log("[clips-render]", {
    activeJobId,
    clipsLength: clips.length,
    clipJobIds: clips.map((c) => c.job_id),
    videoUrls: clips.map((c) => c.video_url),
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Alize Clips</p>
          <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Paste a video link and get clips instantly
          </h1>
          <p className="mt-2 text-muted-foreground">Turn one video into ready to use clips in seconds</p>
          <p className="mt-2 text-xs text-muted-foreground">by Alize</p>
        </div>

        <section className="mt-6 max-w-2xl rounded-2xl border border-border/60 bg-card p-5 sm:p-6">
          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Link2 className="h-3.5 w-3.5" />
              Video link
            </span>
            <input
              type="url"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="Paste YouTube or public video link"
              className="w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-foreground focus:outline-none"
            />
          </label>

          <button
            type="button"
            onClick={() => void handleGenerate()}
            disabled={isGenerating}
            className="mt-4 inline-flex w-full items-center justify-center rounded-md bg-foreground px-4 py-3 text-sm font-semibold text-background transition-transform hover:scale-[1.01] active:scale-100"
          >
            {isGenerating ? "Generating..." : "Generate Clips"}
          </button>

          {message ? <p className="mt-3 text-sm text-foreground">{message}</p> : null}
        </section>

        <section ref={resultsRef} className="mt-8">
          {isQueuedOrProcessing ? (
            <p className="text-sm text-muted-foreground">Generating clips...</p>
          ) : null}
          {displayClips.length === 0 && !isQueuedOrProcessing && !isGenerating ? (
            <p className="text-sm text-muted-foreground">No clips yet. Paste a video link to get started.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {displayClips.map((clip, idx) => {
                const directUrl = clip.video_url?.trim() ?? "";
                const ytId = !directUrl ? clip.youtube_video_id?.trim() || "" : "";
                const isYoutube = !directUrl && Boolean(ytId);
                const canDownload = Boolean(directUrl) && !isYoutube;
                const label = `Clip ${idx + 1}`;
                const embedSrc = isYoutube ? buildYoutubeEmbedSrc(ytId, clip.start_time, clip.end_time) : "";
                const startSec = Math.max(0, Math.floor(Number(clip.start_time) || 0));
                const endSec = Math.max(startSec, Math.floor(Number(clip.end_time) || 0));
                const durationSec = Math.max(0, endSec - startSec);
                console.log("[clipper][render] clip", {
                  activeJobId,
                  clipId: clip.id,
                  video_url: directUrl || null,
                  youtube_video_id: clip.youtube_video_id ?? null,
                });
                return (
                  <article key={clip.id} className="rounded-xl border border-border/60 bg-card p-3">
                    <p className="text-sm font-semibold">{label}</p>

                    <div className="mt-3 aspect-video overflow-hidden rounded-lg border border-border/60 bg-black">
                      {isYoutube ? (
                        <iframe
                          title={`${label} preview`}
                          src={embedSrc}
                          onLoad={() => {
                            if (trackedPlayedClipIds.current.has(clip.id)) return;
                            trackedPlayedClipIds.current.add(clip.id);
                            const pid = ensureVideoMvpProjectId();
                            void trackEvent("clip_played", pid, clip.id, { source: "youtube_iframe" });
                          }}
                          className="h-full w-full border-0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          allowFullScreen
                        />
                      ) : directUrl ? (
                        <video
                          src={directUrl}
                          controls
                          className="h-full w-full object-cover"
                          onPlay={() => {
                            if (trackedPlayedClipIds.current.has(clip.id)) return;
                            trackedPlayedClipIds.current.add(clip.id);
                            const pid = ensureVideoMvpProjectId();
                            void trackEvent("clip_played", pid, clip.id, { source: "direct_video" });
                          }}
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center bg-muted text-xs text-muted-foreground">
                          No playable source for this clip yet
                        </div>
                      )}
                    </div>
                    {isYoutube ? (
                      <p className="mt-2 text-xs text-muted-foreground">
                        This video owner has disabled playback on other websites. Open on YouTube or try another link.
                      </p>
                    ) : null}
                    <p className="mt-2 text-xs text-muted-foreground">
                      Start: {startSec}s
                      {" · "}
                      End: {endSec}s
                      {" · "}
                      Duration: {durationSec}s
                    </p>

                    <div className="mt-3 flex gap-2">
                      {canDownload ? (
                        <a
                          href={directUrl}
                          download
                          onClick={() => {
                            const pid = ensureVideoMvpProjectId();
                            void trackEvent("clip_downloaded", pid, clip.id);
                          }}
                          className="inline-flex items-center rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-secondary"
                        >
                          Download
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground">Preview only</span>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
