import { useEffect, useRef, useState } from "react";
import { createVideoJobFromSourceUrl, fetchClipperState, type VideoClipRow, type VideoJobStatus } from "@/lib/mvp/videoClipperBackend";
import { ensureVideoMvpProjectId } from "@/lib/videoMvpProject";

type ClipRow = {
  id: string;
  video_url: string | null;
  start_time_sec: number | null;
  end_time_sec: number | null;
  start_time?: number | null;
  end_time?: number | null;
  created_at: string | null;
};

function formatTime(sec: number): string {
  if (!Number.isFinite(sec)) return "0s";
  const total = Math.max(0, Math.floor(sec));
  if (total < 60) return `${total}s`;
  const m = Math.floor(total / 60);
  const s = total % 60;
  return s === 0 ? `${m}m` : `${m}m ${s}s`;
}

function isPlayableUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (trimmed.includes("interactive-examples.mdn.mozilla.net")) return false;
  return /^https?:\/\//i.test(trimmed);
}

function toPlayableRows(rows: VideoClipRow[]): ClipRow[] {
  return rows
    .map((row) => ({
      id: row.id,
      video_url: row.video_url ?? null,
      start_time_sec: row.start_time_sec ?? 0,
      end_time_sec: row.end_time_sec ?? 0,
      created_at: row.created_at ?? null,
    }))
    .filter((row) => isPlayableUrl(String(row.video_url ?? "")))
    .slice(0, 3);
}

export default function ClipsCleanV3GenerateJob() {
  const [videoUrlInput, setVideoUrlInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [clips, setClips] = useState<ClipRow[]>([]);
  const [previousPlayableClips, setPreviousPlayableClips] = useState<ClipRow[]>([]);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [activeJobStatus, setActiveJobStatus] = useState<VideoJobStatus | null>(null);
  const projectId = ensureVideoMvpProjectId();
  const pollStartedAtRef = useRef<number | null>(null);
  const POLL_TIMEOUT_MS = 45000;

  const forceDownload = async (url: string, filename: string) => {
    const response = await fetch(url);
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(blobUrl);
  };

  const handleGenerate = async () => {
    const trimmed = videoUrlInput.trim();
    if (!trimmed) {
      setMessage("Enter a video URL first.");
      return;
    }

    setPreviousPlayableClips(clips);
    setIsLoading(true);
    setMessage("");

    try {
      const createdJob = await createVideoJobFromSourceUrl(projectId, trimmed);
      setActiveJobId(createdJob.id);
      setActiveJobStatus(createdJob.status);
      pollStartedAtRef.current = Date.now();
    } catch {
      setMessage("That video could not be processed. Showing previous clips.");
      setClips(previousPlayableClips);
      setIsLoading(false);
      setActiveJobId(null);
      setActiveJobStatus(null);
      pollStartedAtRef.current = null;
    }
  };

  useEffect(() => {
    if (!activeJobId) return;
    let cancelled = false;

    const poll = async () => {
      try {
        const state = await fetchClipperState(projectId, activeJobId, { cacheBuster: Date.now() });
        if (cancelled) return;
        const status = state.latestJob?.status ?? null;
        setActiveJobStatus(status);
        const playableRows = toPlayableRows(state.clips);

        if (playableRows.length === 3) {
          setClips(playableRows);
          setPreviousPlayableClips(playableRows);
          setMessage("");
          setIsLoading(false);
          setActiveJobId(null);
          setActiveJobStatus(null);
          pollStartedAtRef.current = null;
          return;
        }

        const timedOut =
          Boolean(pollStartedAtRef.current) &&
          (status === "queued" || status === "processing") &&
          Date.now() - (pollStartedAtRef.current ?? 0) > POLL_TIMEOUT_MS;

        if (status === "failed" || timedOut || status === "completed") {
          setClips(previousPlayableClips);
          setMessage("That video could not be processed. Showing previous clips.");
          setIsLoading(false);
          setActiveJobId(null);
          setActiveJobStatus(null);
          pollStartedAtRef.current = null;
        }
      } catch {
        if (cancelled) return;
        setClips(previousPlayableClips);
        setMessage("That video could not be processed. Showing previous clips.");
        setIsLoading(false);
        setActiveJobId(null);
        setActiveJobStatus(null);
        pollStartedAtRef.current = null;
      }
    };

    void poll();
    const interval = window.setInterval(() => void poll(), 2000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [activeJobId, previousPlayableClips, projectId]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-2 text-xs font-semibold tracking-wide text-amber-700">VERSION: V14 CLIPS CLEAN V3 GENERATE JOB</div>
        <h1 className="text-3xl font-bold tracking-tight">Alizé Clips</h1>

        <section className="mt-6 max-w-2xl rounded-xl border border-border/60 bg-card p-4">
          <label className="block text-sm font-medium">Video URL</label>
          <input
            type="url"
            value={videoUrlInput}
            onChange={(e) => setVideoUrlInput(e.target.value)}
            placeholder="Paste video URL"
            className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={() => void handleGenerate()}
            disabled={isLoading}
            className="mt-3 inline-flex items-center rounded-md bg-foreground px-4 py-2 text-sm font-semibold text-background disabled:opacity-60"
          >
            {isLoading ? "Loading..." : "Generate Clips"}
          </button>
          {isLoading || activeJobStatus === "queued" || activeJobStatus === "processing" ? (
            <p className="mt-2 text-sm text-muted-foreground">Generating clips...</p>
          ) : null}
          {message ? <p className="mt-2 text-sm text-muted-foreground">{message}</p> : null}
        </section>

        <section className="mt-8">
          {clips.length === 0 ? (
            <p className="text-sm text-muted-foreground">No clips yet.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {clips.map((clip, idx) => {
                const directUrl = (clip.video_url ?? "").trim();
                const hasVideoUrl = directUrl.length > 0;
                const startRaw = Number(clip.start_time_sec ?? clip.start_time ?? 0);
                const endRaw = Number(clip.end_time_sec ?? clip.end_time ?? 0);
                const start = Math.max(0, Math.floor(startRaw));
                const end = Math.max(start, Math.floor(endRaw));
                const duration = Math.max(0, end - start);
                return (
                  <article key={clip.id} className="rounded-xl border border-border/60 bg-card p-3">
                    <p className="text-sm font-semibold">{`Clip ${idx + 1}`}</p>
                    <div className="mt-2 aspect-video overflow-hidden rounded-lg border border-border/60 bg-black">
                      <video src={directUrl} controls playsInline preload="metadata" className="h-full w-full object-cover" />
                    </div>
                    <div className="mt-3">
                      {hasVideoUrl ? (
                        <button
                          type="button"
                          onClick={() => void forceDownload(clip.video_url ?? directUrl, `alize-clip-${idx + 1}.mp4`)}
                          className="inline-flex items-center rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-secondary"
                        >
                          Download MP4
                        </button>
                      ) : (
                        <span className="text-xs text-muted-foreground">Clip still processing</span>
                      )}
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">Source time: {formatTime(start)} - {formatTime(end)}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Duration: {formatTime(duration)}</p>
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
