export { default } from "./Index";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Link2 } from "lucide-react";
import AlizeLogo from "../components/AlizeLogo";
import { flowStore } from "../store/flowStore";
import { ensureVideoMvpProjectId } from "../../../src/lib/videoMvpProject";
import { parseYoutubeVideoId, resolveYoutubeVideoDetails } from "../../../src/lib/mvp/youtubeIngest";

export default function Upload() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [link, setLink] = useState("");
  const [submitMessage, setSubmitMessage] = useState("");

  const ytId = parseYoutubeVideoId(link.trim());

  const handleSubmit = async () => {
    const rawLink = link.trim();
    if (!rawLink || !parseYoutubeVideoId(rawLink)) {
      setSubmitMessage("Paste a video link to generate clips");
      return;
    }
    setSubmitMessage("");

    flowStore.setSource(rawLink);

    const pid = ensureVideoMvpProjectId();
    try {
      localStorage.setItem(`alize_clips_source_url_${pid}`, rawLink);
    } catch {
      /* ignore */
    }

    const backend = import.meta.env.VITE_VIZARD_BACKEND_URL?.replace(/\/$/, "");
    if (backend) {
      try {
        const { details } = await resolveYoutubeVideoDetails(rawLink, ytId);
        const res = await fetch(`${backend}/api/vizard`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            videoUrl: rawLink,
            durationSec: details.durationSec,
          }),
        });
        const json = (await res.json()) as {
          ok?: boolean;
          projectId?: string;
          vizard?: { projectId?: string; data?: { projectId?: string } };
          clips?: Array<{ start_time: number; end_time: number; score: number; label: string }>;
          error?: string;
        };
        if (json?.ok && json.vizard) {
          const projectId =
            json.projectId ??
            json.vizard.projectId ??
            (json.vizard as { data?: { projectId?: string } }).data?.projectId;
          if (projectId) {
            try {
              localStorage.setItem(`alize_vizard_project_${pid}`, String(projectId));
            } catch {
              /* ignore */
            }
          }
        } else if (!res.ok) {
          console.warn("[Vizard]", json);
        }
      } catch (e) {
        console.warn("[Vizard] request failed — continuing with local clip flow", e);
      }
    }

    await queryClient.invalidateQueries({ queryKey: ["clips"] });
    navigate("/clips");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/40 px-4 py-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <AlizeLogo />
        </div>
      </header>

      <main className="mx-auto flex max-w-2xl flex-col px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="mb-10 text-center">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Step 1 of 5
          </p>
          <h1 className="font-display text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Test clips from your YouTube video
          </h1>
          <p className="mt-3 text-sm font-medium text-foreground">Paste a video link to generate clips instantly</p>
          <p className="mt-4 text-muted-foreground">
            Paste a link. We show three fixed time windows from that same video—no uploads, no extra inputs.
          </p>
        </div>

        <div className="space-y-4 rounded-2xl border border-border/60 bg-card p-5 sm:p-6">
          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Link2 className="h-3.5 w-3.5" />
              Paste your YouTube link
            </span>
            <input
              type="url"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=…"
              className="w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-foreground focus:outline-none"
            />
          </label>

          <p className="text-sm text-muted-foreground">Upload coming soon. Use a video link for now.</p>

          <button
            type="button"
            onClick={() => void handleSubmit()}
            className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-md bg-foreground px-4 py-3 text-sm font-semibold text-background transition-transform hover:scale-[1.01] active:scale-100"
          >
            Generate clips
            <ArrowRight className="h-4 w-4" />
          </button>
          {submitMessage ? <p className="text-center text-sm text-foreground">{submitMessage}</p> : null}

          <p className="text-center text-xs text-muted-foreground">
            Clips use deterministic windows from the video length (or a fallback if length isn&apos;t available).
          </p>
        </div>
      </main>
    </div>
  );
}
