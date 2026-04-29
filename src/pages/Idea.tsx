import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { generateProjectId } from "@/hooks/useProject";
import { isVideoContentUrlInput } from "@/lib/mvp/videoClipperDetection";
import { createVideoJobFromSourceUrl, uploadSourceVideoAndCreateJob } from "@/lib/mvp/videoClipperBackend";
import { trackEvent } from "@/lib/trackingEvents";

export default function Idea() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [videoPrompt, setVideoPrompt] = useState("");
  const [isSubmittingLink, setIsSubmittingLink] = useState(false);
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const navigate = useNavigate();

  const userSafeError = (err: unknown, fallback: string): string => {
    const msg = err instanceof Error ? err.message : "";
    const m = msg.toLowerCase();
    if (m.includes("invalid api key") || m.includes("api key") || m.includes("not configured")) {
      return "Video service is not configured correctly yet. Please try again later.";
    }
    return msg || fallback;
  };

  const processUrl = async (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed || isSubmittingLink || isUploadingVideo) return;
    if (!isVideoContentUrlInput(trimmed)) {
      toast.error("Paste a valid YouTube or TikTok link.");
      return;
    }
    setIsSubmittingLink(true);
    const pid = generateProjectId(trimmed);
    localStorage.setItem("alize_projectId", pid);
    localStorage.setItem("alize_idea", trimmed);
    console.log("[idea] link submit started", { projectId: pid });
    try {
      void trackEvent("upload_started", pid, "source_url", { source_url: trimmed });
      const job = await createVideoJobFromSourceUrl(pid, trimmed);
      console.log("[idea] link job created", { projectId: pid, jobId: job.id, status: job.status });
      localStorage.setItem(`alize_video_job_id_${pid}`, job.id);
      void trackEvent("job_created", pid, "source_url", { job_id: job.id, source_url: trimmed });
      void trackEvent("link_submitted", pid, "source_url", { job_id: job.id });
      console.log("[idea] link navigation triggered", { to: `/video-mvp/${pid}` });
      window.location.assign(`${window.location.origin}/#/video-mvp/${pid}`);
    } catch (e) {
      console.error("[idea] link submit failed", e);
      toast.error(userSafeError(e, "Could not start processing"));
    } finally {
      setIsSubmittingLink(false);
    }
  };

  const handleSubmit = () => void processUrl(videoPrompt);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  const submitUploadedVideo = async (file: File | null) => {
    if (!file) return;
    if (isUploadingVideo || isSubmittingLink) return;
    console.log("[idea] file selected", file.name);
    setIsUploadingVideo(true);
    const pid = generateProjectId(file.name);
    localStorage.setItem("alize_projectId", pid);
    localStorage.setItem("alize_idea", `uploaded:${file.name}`);
    try {
      void trackEvent("upload_started", pid, "uploaded_video", { file_name: file.name });
      console.log("[idea] upload started", { fileName: file.name, projectId: pid });
      const { job } = await uploadSourceVideoAndCreateJob(pid, file);
      console.log("[idea] upload finished", { fileName: file.name, projectId: pid });
      console.log("[idea] upload job created", { projectId: pid, jobId: job.id, status: job.status });
      if (job.status === "failed") {
        toast.error(userSafeError(new Error(job.error_message || "Processing failed"), "Processing failed"));
        return;
      }
      localStorage.setItem(`alize_video_job_id_${pid}`, job.id);
      void trackEvent("job_created", pid, "uploaded_video", { job_id: job.id, file_name: file.name });
      void trackEvent("link_submitted", pid, "uploaded_video", { job_id: job.id, file_name: file.name });
      console.log("[idea] upload navigation triggered", { to: `/video-mvp/${pid}` });
      window.location.assign(`${window.location.origin}/#/video-mvp/${pid}`);
    } catch (e) {
      console.error("[idea] upload failed", e);
      toast.error("Upload failed. Please try again.");
    } finally {
      setIsUploadingVideo(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="max-w-5xl mx-auto flex flex-col items-center justify-center p-6 min-h-screen">
      <div className="mb-8 w-full text-center">
        <h1 className="text-3xl md:text-4xl font-light tracking-tight text-foreground">
          Turn your video into clips that get views
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Paste a YouTube or TikTok link. We find the moments most likely to perform best.
        </p>
      </div>

      <div className="mb-6 w-full flex flex-col items-center gap-3 max-w-xl mx-auto">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isSubmittingLink || isUploadingVideo}
          className="w-full h-12 rounded-xl border border-border bg-card text-sm text-foreground font-medium transition hover:bg-secondary disabled:opacity-40"
        >
          {isUploadingVideo ? "Uploading your video..." : "Upload video"}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          className="hidden"
          disabled={isSubmittingLink || isUploadingVideo}
          onChange={(e) => submitUploadedVideo(e.target.files?.[0] ?? null)}
        />
        <input
          type="text"
          value={videoPrompt}
          onChange={(e) => setVideoPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Paste YouTube or TikTok link..."
          disabled={isSubmittingLink || isUploadingVideo}
          className="w-full h-11 rounded-lg border border-border bg-card px-4 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-ring disabled:opacity-50"
        />
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!videoPrompt.trim() || isSubmittingLink || isUploadingVideo}
          className="w-full h-11 rounded-lg bg-foreground text-background text-sm font-semibold hover:opacity-90 disabled:opacity-50"
        >
          {isSubmittingLink ? "Starting..." : "Get my clips"}
        </button>
      </div>

      <p className="text-[11px] text-muted-foreground/60 text-center">
        No signup required
      </p>

    </div>
  );
}