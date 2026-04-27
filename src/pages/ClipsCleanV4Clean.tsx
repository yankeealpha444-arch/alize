import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { createVideoJobFromSourceUrl } from "@/lib/mvp/videoClipperBackend";
import { ensureVideoMvpProjectId } from "@/lib/videoMvpProject";

type ClipRow = {
  id: string;
  job_id: string;
  video_url: string | null;
  start_time_sec: number | null;
  end_time_sec: number | null;
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
  return /^https?:\/\//i.test(trimmed);
}

export default function ClipsCleanV4Clean() {
  const [videoUrlInput, setVideoUrlInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("Paste a video link to generate clips.");
  const [clips, setClips] = useState<ClipRow[]>([]);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [activeSourceUrl, setActiveSourceUrl] = useState("");
  const [isReady, setIsReady] = useState(false);
  const [progressStage, setProgressStage] = useState("");
  const pollStartedAtRef = useRef<number | null>(null);
  const runSeqRef = useRef(0);
  const projectId = ensureVideoMvpProjectId();
  const POLL_TIMEOUT_MS = 45000;

  useEffect(() => {
    console.log("[clean-v4] page mounted");
  }, []);

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
    const submittedUrl = videoUrlInput.trim();
    if (!submittedUrl) {
      setMessage("Enter a video URL first.");
      return;
    }

    runSeqRef.current += 1;
    const runSeq = runSeqRef.current;

    console.log("[clean-v4] submit clicked");
    console.log("[clean-v4] submitted url", submittedUrl);

    setClips([]);
    setIsReady(false);
    setMessage("Generating clips...");
    setIsLoading(true);
    setActiveJobId(null);
    setActiveSourceUrl(submittedUrl);
    setProgressStage("");

    try {
      const createdJob = await createVideoJobFromSourceUrl(projectId, submittedUrl);
      if (runSeq !== runSeqRef.current) return;
      console.log("[clean-v4] created job id", createdJob.id);
      setActiveJobId(createdJob.id);
      console.log("[clean-v4] activeJobId set", createdJob.id);
      pollStartedAtRef.current = Date.now();
    } catch (error) {
      if (runSeq !== runSeqRef.current) return;
      const msg = error instanceof Error ? error.message : "That video could not be processed.";
      setMessage(msg);
      setIsLoading(false);
      setActiveJobId(null);
      pollStartedAtRef.current = null;
    }
  };

  useEffect(() => {
    if (!activeJobId) return;
    const runSeq = runSeqRef.current;
    let cancelled = false;

    const poll = async () => {
      if (cancelled || runSeq !== runSeqRef.current) return;
      console.log("[clean-v4] polling job id", activeJobId);

      const jobRes = await supabase
        .from("video_jobs")
        .select("id, status, error_message, metadata")
        .eq("id", activeJobId)
        .single();

      if (cancelled || runSeq !== runSeqRef.current) return;

      if (jobRes.error) {
        setMessage(jobRes.error.message || "Failed to poll job status.");
        setIsLoading(false);
        return;
      }

      const status = String(jobRes.data.status || "");
      const errorMessage = String(jobRes.data.error_message || "");
      const workerPipeline = String((jobRes.data.metadata && jobRes.data.metadata.worker && jobRes.data.metadata.worker.pipeline) || "");
      console.log("[clean-v4] job status", status);
      console.log("[clean-v4] job error_message", errorMessage || null);
      console.log("[clean-v4] current stage", workerPipeline || status);
      setProgressStage(workerPipeline || status);

      const clipsRes = await supabase
        .from("video_clips")
        .select("id, job_id, video_url, start_time_sec, end_time_sec")
        .eq("job_id", activeJobId)
        .order("created_at", { ascending: true });

      if (cancelled || runSeq !== runSeqRef.current) return;
      if (clipsRes.error) {
        setMessage(clipsRes.error.message || "Failed to load clips.");
        setIsLoading(false);
        return;
      }

      const rows = (clipsRes.data ?? []) as ClipRow[];
      const playableRows = rows.filter((row) => isPlayableUrl(String(row.video_url ?? ""))).slice(0, 3);
      console.log("[clean-v4] clips returned", playableRows.length);
      console.log("[clean-v4] clip job ids", playableRows.map((row) => row.job_id));

      if (playableRows.length === 3) {
        setClips(playableRows);
        setIsReady(true);
        setIsLoading(false);
        setMessage("");
        setProgressStage("completed");
        setActiveJobId(null);
        pollStartedAtRef.current = null;
        console.log("[clean-v4] clips ready");
        return;
      }

      const timedOut =
        Boolean(pollStartedAtRef.current) &&
        (status === "queued" || status === "processing") &&
        Date.now() - (pollStartedAtRef.current ?? 0) > POLL_TIMEOUT_MS;

      if (timedOut && (status === "queued" || status === "processing")) {
        setMessage("Processing is taking longer than expected...");
      }

      if (status === "failed") {
        setClips([]);
        setIsReady(false);
        setIsLoading(false);
        pollStartedAtRef.current = null;
        setProgressStage("failed");
        setMessage(errorMessage || (timedOut ? "Job timed out while processing this video." : "That video could not be processed."));
      }
    };

    void poll();
    const interval = window.setInterval(() => void poll(), 2000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [activeJobId]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-2 text-xs font-semibold tracking-wide text-amber-700">VERSION: V18 CLEAN CLIPPER REBUILD NO PRELOADED DATA</div>
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
            className="mt-3 inline-flex items-center rounded-md bg-foreground px-4 py-2 text-sm font-semibold text-background"
          >
            Generate Clips
          </button>
          {isLoading ? <p className="mt-2 text-sm text-muted-foreground">Generating clips...</p> : null}
          {message ? <p className="mt-2 text-sm text-muted-foreground">{message}</p> : null}
          <p className="mt-2 text-[11px] text-muted-foreground">Active job: {activeJobId ?? "-"}</p>
          <p className="text-[11px] text-muted-foreground">Source: {activeSourceUrl || "-"}</p>
          <p className="text-[11px] text-muted-foreground">Stage: {progressStage || "-"}</p>
        </section>

        <section className="mt-8">
          {clips.length === 0 ? null : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {clips.map((clip, idx) => {
                const directUrl = (clip.video_url ?? "").trim();
                const hasVideoUrl = directUrl.length > 0;
                const start = Math.max(0, Math.floor(Number(clip.start_time_sec ?? 0)));
                const end = Math.max(start, Math.floor(Number(clip.end_time_sec ?? 0)));
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
                          onClick={() => void forceDownload(directUrl, `alize-clip-${idx + 1}.mp4`)}
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
          {isReady ? <p className="mt-3 text-sm text-emerald-700">✓ Clips ready</p> : null}
        </section>
      </main>
    </div>
  );
}
