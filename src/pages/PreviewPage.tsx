import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { patchMvpFlowState } from "@/lib/mvpFlowState";
import { ensureVideoMvpProjectId, getVideoMvpProject } from "@/lib/videoMvpProject";

export default function PreviewPage() {
  const navigate = useNavigate();
  const pid = typeof localStorage !== "undefined" ? localStorage.getItem("alize_projectId") : null;
  const proj = pid ? getVideoMvpProject(pid) : null;
  const clip = proj?.selected_clip;
  const thumb = proj?.selected_thumbnail;

  useEffect(() => {
    if (!pid || !proj) return;
    if (!proj.selected_clip) navigate("/clips", { replace: true });
    else if (!proj.selected_thumbnail) navigate("/thumbnail", { replace: true });
  }, [pid, proj, navigate]);

  const onGoToDashboard = () => {
    const id = ensureVideoMvpProjectId();
    patchMvpFlowState({ testStatus: "running", mvpFlowProjectId: id });
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-4 py-16 space-y-8">
        <p className="text-sm text-muted-foreground">Step 4 of 5</p>
        <h1 className="text-3xl font-bold tracking-tight">Preview your clip</h1>

        <section className="rounded-xl border border-border bg-card p-5 space-y-2">
          <h2 className="font-semibold">Selected clip</h2>
          <p>{clip?.label ?? "No clip selected"}</p>
          <p>{clip ? `${clip.score}, ${clip.multiplier}` : "—"}</p>
          <p>{clip?.description ?? "—"}</p>
        </section>

        <section className="rounded-xl border border-border bg-card p-5 space-y-3">
          <h2 className="font-semibold">Selected thumbnail</h2>
          {thumb?.preview_url ? (
            <div className="rounded-lg border border-border overflow-hidden max-w-md aspect-video bg-muted">
              <img src={thumb.preview_url} alt="" className="w-full h-full object-cover" />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No thumbnail selected</p>
          )}
          <p className="text-sm">{thumb?.name ?? "—"}</p>
        </section>

        <section className="rounded-xl border border-border bg-card p-5 space-y-2">
          <h2 className="font-semibold">What will happen next:</h2>
          <p>We will test this clip</p>
          <p>We will track performance</p>
          <p>We will recommend improvements</p>
        </section>

        <section className="rounded-xl border border-border bg-card p-5 space-y-2">
          <h2 className="font-semibold">Before vs After</h2>
          <p>Before:</p>
          <p>No data yet</p>
          <p className="pt-2">After:</p>
          <p>Expected higher engagement</p>
        </section>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onGoToDashboard}
            className="rounded-full bg-foreground text-background px-6 py-2.5 text-sm font-semibold"
          >
            Go to dashboard
          </button>
          <button
            type="button"
            onClick={() => navigate("/thumbnail")}
            className="rounded-full border border-border px-6 py-2.5 text-sm font-semibold"
          >
            Back to thumbnails
          </button>
        </div>
      </div>
    </div>
  );
}
