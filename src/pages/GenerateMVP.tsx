import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { fetchClipperState, processQueuedVideoJob } from "@/lib/mvp/videoClipperBackend";
import { trackEvent } from "@/lib/trackingEvents";

export default function GenerateMVP() {
  const { projectId: routeProjectId } = useParams<{ projectId?: string }>();
  const projectId = routeProjectId || localStorage.getItem("alize_projectId") || "default";
  const jobId = localStorage.getItem(`alize_video_job_id_${projectId}`);
  const navigate = useNavigate();
  const [status, setStatus] = useState<"queued" | "processing" | "completed" | "failed" | "missing">("queued");
  const [jobErrorMessage, setJobErrorMessage] = useState<string | null>(null);
  const trackedStarted = useRef(false);
  const trackedCompleted = useRef(false);

  useEffect(() => {
    if (!jobId) {
      setStatus("missing");
      return;
    }
    if (!trackedStarted.current) {
      trackedStarted.current = true;
      void trackEvent("processing_started", projectId, "video_job", { job_id: jobId });
    }

    let alive = true;
    const poll = async () => {
      try {
        await processQueuedVideoJob(jobId);
        const s = await fetchClipperState(projectId, jobId);
        if (!alive) return;
        const next = s.latestJob?.status ?? "missing";
        setStatus(next === "queued" || next === "processing" || next === "completed" || next === "failed" ? next : "missing");
        setJobErrorMessage(s.latestJob?.error_message ?? null);
        if (s.clips.length > 0 || next === "completed") {
          if (!trackedCompleted.current) {
            trackedCompleted.current = true;
            void trackEvent("clips_generated", projectId, "video_job", { job_id: jobId, clip_count: s.clips.length });
          }
          navigate(`/p/${projectId}`, { replace: true });
        }
      } catch {
        if (alive) setStatus("failed");
      }
    };
    void poll();
    const timer = window.setInterval(() => void poll(), 2200);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [projectId, jobId, navigate]);

  return (
    <div className="max-w-3xl mx-auto pt-8 pb-16 px-4">
      <h1 className="text-2xl font-medium text-foreground mb-2 text-center">Analyzing your video...</h1>
      <p className="text-sm text-muted-foreground text-center">
        Finding the best moments for short-form clips
      </p>
      <div className="mt-8 rounded-xl border border-border bg-card p-6 text-center">
        <p className="text-sm text-foreground">
          {status === "queued" && "Analyzing your video..."}
          {status === "processing" && "Finding best moments..."}
          {status === "completed" && "Your clips are ready. Opening them now..."}
          {status === "failed" &&
            (jobErrorMessage?.trim() || "Something went wrong. Try another link.")}
          {status === "missing" && "Could not find this job. Paste a new link to start again."}
        </p>
        <p className="text-xs text-muted-foreground mt-2">Job: {jobId ?? "missing"}</p>
      </div>
      {(status === "failed" || status === "missing") && (
        <p className="mt-4 text-xs text-center text-muted-foreground">Go back and try another link.</p>
      )}
    </div>
  );
}
