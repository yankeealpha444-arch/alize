import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ceoInsight, getVideoMvpProject, patchVideoMvpProject, clearVideoMvpClipAndThumbnail } from "@/lib/videoMvpProject";
import { hashAppUrl } from "@/lib/hashRoutes";
import ThumbnailTestResultCard from "@/components/mvp/ThumbnailTestResultCard";
import { flowStore, syncFlowStoreFromVideoMvpProject } from "../../../vision-clip-hub/src/store/flowStore";

type Props = {
  projectId: string;
  /** e.g. "Step 5 of 8 · Track & learn" — omit for no step line */
  stepLabel?: string | null;
  /** Founder-only: link to open the public flow in a new tab */
  showPublicMvpLink?: boolean;
  /** Founder routes (clip generation) need AppLayout; hide on public results page */
  showGetUsers?: boolean;
};

export default function VideoMvpSessionPanel({
  projectId,
  stepLabel,
  showPublicMvpLink,
  showGetUsers = true,
}: Props) {
  const navigate = useNavigate();
  const [vpTick, setVpTick] = useState(0);
  useEffect(() => {
    const fn = () => setVpTick((t) => t + 1);
    window.addEventListener("alize-video-mvp-project-updated", fn);
    return () => window.removeEventListener("alize-video-mvp-project-updated", fn);
  }, []);

  const vp = useMemo(() => getVideoMvpProject(projectId), [projectId, vpTick]);
  const [ytDraft, setYtDraft] = useState("");
  useEffect(() => {
    setYtDraft(vp?.youtube_url ?? "");
  }, [vp?.youtube_url, vpTick, projectId]);

  if (!vp) {
    return (
      <section className="rounded-xl border border-border bg-card p-5 space-y-2">
        <p className="text-sm text-foreground">No Video MVP session for this project yet.</p>
        <p className="text-xs text-muted-foreground">
          Run the public flow from the home page, then return here — data is stored in this browser only.
        </p>
        <button
          type="button"
          onClick={() => {
            window.open(hashAppUrl("/"), "_blank", "noopener,noreferrer");
          }}
          className="text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          Open public Video MVP
        </button>
      </section>
    );
  }

  const testStatusLabel = vp.status === "tracking" ? "Tracking" : "Waiting for data";
  const manual = vp.manual_performance_metrics;

  return (
    <div className="space-y-6">
      {stepLabel ? <p className="text-xs text-muted-foreground">{stepLabel}</p> : null}

      {showPublicMvpLink ? (
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>Public layer:</span>
          <button
            type="button"
            className="font-medium text-primary underline-offset-4 hover:underline"
            onClick={() => window.open(hashAppUrl("/"), "_blank", "noopener,noreferrer")}
          >
            Open Video MVP (new tab)
          </button>
        </div>
      ) : null}

      <section className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Current test</h2>
        <p className="text-sm">
          <span className="text-muted-foreground">Status:</span>{" "}
          <span className="font-medium text-foreground">{testStatusLabel}</span>
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">Selected clip</p>
            <p className="text-sm font-medium text-foreground">{vp.selected_clip?.label ?? "—"}</p>
            <p className="text-xs text-muted-foreground">
              {vp.selected_clip
                ? `${vp.selected_clip.score} · ${vp.selected_clip.multiplier} · ${vp.selected_clip.range}`
                : "—"}
            </p>
            <p className="text-xs text-foreground">{vp.selected_clip?.description ?? ""}</p>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">Selected thumbnail</p>
            {vp.selected_thumbnail?.preview_url ? (
              <div className="rounded-lg border border-border overflow-hidden aspect-video max-w-xs bg-muted">
                <img src={vp.selected_thumbnail.preview_url} alt="" className="h-full w-full object-cover" />
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No thumbnail</p>
            )}
            <p className="text-xs text-foreground">{vp.selected_thumbnail?.name ?? "—"}</p>
          </div>
        </div>
        {vp.youtube_url ? (
          <p className="text-xs text-muted-foreground break-all">
            <span className="font-medium text-foreground">YouTube:</span> {vp.youtube_url}
          </p>
        ) : null}
      </section>

      <ThumbnailTestResultCard projectId={projectId} />

      <section className="rounded-xl border border-border bg-card p-5 space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Metrics (placeholder)</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="rounded-lg border border-border bg-background p-3">
            <p className="text-muted-foreground">Views</p>
            <p className="text-lg font-semibold text-foreground mt-1">
              {manual != null ? manual.views.toLocaleString() : "—"}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-background p-3">
            <p className="text-muted-foreground">Click-through rate</p>
            <p className="text-lg font-semibold text-foreground mt-1">—</p>
          </div>
          <div className="rounded-lg border border-border bg-background p-3">
            <p className="text-muted-foreground">Best clip</p>
            <p className="text-lg font-semibold text-foreground mt-1">{vp.selected_clip?.label ?? "—"}</p>
          </div>
          <div className="rounded-lg border border-border bg-background p-3">
            <p className="text-muted-foreground">Best thumbnail</p>
            <p className="text-lg font-semibold text-foreground mt-1">{vp.selected_thumbnail?.name ?? "—"}</p>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-5 space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">AI insight</h2>
        <p className="text-sm text-foreground leading-relaxed">{ceoInsight(vp)}</p>
      </section>

      <section className="rounded-xl border border-border bg-card p-5 space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Track your post</h2>
        <p className="text-xs text-muted-foreground">Paste your published YouTube link, then start tracking.</p>
        <input
          type="url"
          value={ytDraft}
          onChange={(e) => setYtDraft(e.target.value)}
          placeholder="https://www.youtube.com/watch?v=…"
          className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm"
        />
        <button
          type="button"
          onClick={() => {
            patchVideoMvpProject(projectId, {
              youtube_url: ytDraft.trim() || null,
              status: "tracking",
            });
          }}
          className="rounded-full bg-foreground text-background px-6 py-2.5 text-sm font-semibold"
        >
          Start tracking
        </button>
      </section>

      <section className="rounded-xl border border-border bg-card p-5 space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Feedback</h2>
        <p className="text-sm text-foreground">Did this post perform as you hoped?</p>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => patchVideoMvpProject(projectId, { feedback: "yes" })}
            className="rounded-full border border-border px-5 py-2 text-sm font-semibold"
          >
            👍 Yes
          </button>
          <button
            type="button"
            onClick={() => patchVideoMvpProject(projectId, { feedback: "no" })}
            className="rounded-full border border-border px-5 py-2 text-sm font-semibold"
          >
            👎 No
          </button>
        </div>
        {vp.feedback ? (
          <p className="text-xs text-muted-foreground">Saved: {vp.feedback === "yes" ? "Yes" : "No"}</p>
        ) : null}
      </section>

      <section className="rounded-xl border border-border bg-card p-5 space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Actions</h2>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => navigate("/clips")}
            className="rounded-full bg-foreground text-background px-5 py-2 text-sm font-semibold"
          >
            Improve next version
          </button>
          <button
            type="button"
            onClick={() => {
              flowStore.setSource("");
              clearVideoMvpClipAndThumbnail(projectId);
              syncFlowStoreFromVideoMvpProject(projectId);
              navigate("/clips");
            }}
            className="rounded-full border border-border px-5 py-2 text-sm font-semibold"
          >
            Run another test
          </button>
          {showGetUsers ? (
            <button
              type="button"
              onClick={() => navigate(`/get-users/${projectId}`)}
              className="rounded-full border border-border px-5 py-2 text-sm font-semibold"
            >
              Generate next clips
            </button>
          ) : null}
        </div>
      </section>
    </div>
  );
}
