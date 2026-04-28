import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link2 } from "lucide-react";
import { useClips } from "@/hooks/useClips";
import { demoClips } from "@/data/demoClips";
import { flowStore } from "@/store/flowStore";
import { ensureVideoMvpProjectId } from "../../../src/lib/videoMvpProject";
import { trackEvent } from "../../../src/lib/trackingEvents";
import { createVideoJobFromSourceUrl } from "@/lib/mvp/videoClipperBackend";

function formatTime(sec: number): string {
  if (!Number.isFinite(sec)) return "0s";
  const total = Math.max(0, Math.floor(sec));
  if (total < 60) return `${total}s`;
  const m = Math.floor(total / 60);
  const s = total % 60;
  return s === 0 ? `${m}m` : `${m}m ${s}s`;
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

export default function Index() {
  const queryClient = useQueryClient();
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const { clips, latestJobStatus } = useClips(activeJobId, false, true);
  const [link, setLink] = useState(flowStore.get().sourceInput ?? "");
  const [message, setMessage] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const resultsRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const projectId = ensureVideoMvpProjectId();
    void trackEvent("session_started", projectId, "index_clipper_session");
  }, []);

  const handleGenerate = async () => {
    const trimmed = link.trim();
    if (!trimmed || !isValidPublicVideoUrl(trimmed)) {
      setMessage("Paste a valid video link to continue");
      return;
    }

    setIsGenerating(true);
    setMessage("");

    try {
      flowStore.setSource(trimmed);
      const pid = ensureVideoMvpProjectId();
      const createdJob = await createVideoJobFromSourceUrl(pid, trimmed);
      localStorage.setItem(`alize_video_job_id_${pid}`, createdJob.id);
      localStorage.setItem(`alize_clips_source_url_${pid}`, trimmed);
      setActiveJobId(createdJob.id);
      await queryClient.invalidateQueries({ queryKey: ["clips", pid] });
      resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch {
      setMessage("Could not generate clips from that link. Try another public video URL.");
    } finally {
      setIsGenerating(false);
    }
  };

  const isQueuedOrProcessing = latestJobStatus === "queued" || latestJobStatus === "processing";
  const realClips = clips
    .filter((clip) => !String(clip.video_url ?? "").includes("interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4"))
    .slice(0, 3);
  const realPlayableClips = realClips.filter((clip) => Boolean(clip.video_url?.trim()));

  const initialPlayableClips = demoClips.slice(0, 3);
  const cardsSource = realPlayableClips.length > 0 ? realPlayableClips : initialPlayableClips;
  const cards = [0, 1, 2].map((i) => cardsSource[i] ?? null);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-4 rounded-md border border-emerald-500/50 bg-emerald-500/10 px-3 py-2 text-xs font-semibold tracking-wide text-emerald-700">
          LIVE FILE: Index
        </div>

        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Alize Clips</p>
          <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Paste a video link and get clips instantly
          </h1>
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
            className="mt-4 inline-flex w-full items-center justify-center rounded-md bg-foreground px-4 py-3 text-sm font-semibold text-background transition-transform hover:scale-[1.01] active:scale-100 disabled:opacity-60"
          >
            {isGenerating ? "Generating..." : "Generate Clips"}
          </button>

          {message ? <p className="mt-3 text-sm text-foreground">{message}</p> : null}
        </section>

        <section ref={resultsRef} className="mt-8">
          {isQueuedOrProcessing || isGenerating ? (
            <p className="mb-3 text-sm text-muted-foreground">Generating clips...</p>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map((clip, idx) => {
              const label = `Clip ${idx + 1}`;
              const directUrl = clip?.video_url?.trim() ?? "";
              const isFlowerDemoUrl = directUrl.includes("interactive-examples.mdn.mozilla.net");
              const canDownload = Boolean(directUrl) && !isFlowerDemoUrl;
              const startSec = Math.max(0, Math.floor(Number(clip?.start_time) || 0));
              const endSec = Math.max(startSec, Math.floor(Number(clip?.end_time) || 0));
              const durationSec = Math.max(0, endSec - startSec);

              return (
                <article key={clip?.id ?? label} className="rounded-xl border border-border/60 bg-card p-3">
                  <p className="text-sm font-semibold">{label}</p>
                  <div className="mt-3 aspect-video overflow-hidden rounded-lg border border-border/60 bg-black">
                    {directUrl ? (
                      <video src={directUrl} controls playsInline preload="metadata" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-muted text-xs text-muted-foreground">
                        No playable source for this clip yet
                      </div>
                    )}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Start: {formatTime(startSec)} · End: {formatTime(endSec)} · Duration: {formatTime(durationSec)}
                  </p>
                  <div className="mt-3">
                    {canDownload ? (
                      <a
                        href={clip?.video_url ?? directUrl}
                        download={`alize-clip-${idx + 1}.mp4`}
                        className="inline-flex items-center rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-secondary"
                      >
                        Download MP4
                      </a>
                    ) : (
                      <span className="text-xs text-muted-foreground">Clip still processing</span>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}