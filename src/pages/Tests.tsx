// AI SAFE FILE
// UI LOCKED
// DO NOT MODIFY LAYOUT, STYLE, STRUCTURE, ROUTES, COPY, OR TEMPLATE
// ONLY FIX THE SPECIFIC REQUESTED LOGIC
// UI changes require: "UI change approved"

import { FlaskConical, Sparkles, LayoutDashboard, Clapperboard } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useProjectId } from "@/hooks/useProject";
import { applyImproveMvpSuite } from "@/lib/improveMvpFlow";
import { ceoInsight, getVideoMvpProject } from "@/lib/videoMvpProject";
import { hashAppUrl } from "@/lib/hashRoutes";

/**
 * Tests & Results: simplified — primary loop is Dashboard → Improve MVP → Preview → Publish.
 */
const Tests = () => {
  const projectId = useProjectId();
  const navigate = useNavigate();
  const videoMvp = getVideoMvpProject(projectId);

  const handleImproveMvp = () => {
    applyImproveMvpSuite(projectId);
    toast.success("Improvements applied — opening Preview Changes.");
    navigate(`/preview/${projectId}`);
  };

  return (
    <div className="p-6 max-w-lg mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
          <FlaskConical className="w-5 h-5 text-foreground" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">Tests &amp; Results</h2>
          <p className="text-sm text-muted-foreground">Use the same one-click flow as the dashboard.</p>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        You are here: <span className="text-foreground font-medium">Tests</span>. The main action is{" "}
        <span className="text-foreground font-medium">Improve MVP</span> on the dashboard — it applies bundled wins and sends you to Preview Changes automatically.
      </p>

      {videoMvp ? (
        <div className="rounded-xl border border-border bg-card p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Clapperboard className="w-4 h-4" />
            Video MVP loop
          </div>
          <p className="text-xs text-muted-foreground">
            Test status: <span className="text-foreground font-medium capitalize">{videoMvp.status}</span>
            {videoMvp.youtube_url ? " · YouTube saved" : ""}
            {videoMvp.feedback ? ` · Feedback: ${videoMvp.feedback}` : ""}
          </p>
          <p className="text-xs text-foreground">
            Creative: {videoMvp.selected_clip?.label ?? "—"} · {videoMvp.selected_thumbnail?.name ?? "—"}
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">Next: {ceoInsight(videoMvp)}</p>
          <button
            type="button"
            onClick={() => window.open(hashAppUrl("/"), "_blank", "noopener,noreferrer")}
            className="text-xs font-medium text-primary underline-offset-4 hover:underline"
          >
            Open public Video MVP (new tab)
          </button>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground rounded-lg border border-dashed border-border px-3 py-2">
          No Video MVP data for <span className="font-mono text-foreground">{projectId}</span> in this browser. Run the public flow, or open a session whose id matches this route.
        </p>
      )}

      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={handleImproveMvp}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-foreground text-background px-5 py-3 text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          <Sparkles className="w-4 h-4" />
          Improve MVP
        </button>
        <button
          type="button"
          onClick={() => navigate(`/founder/${projectId}`)}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-border px-4 py-3 text-sm font-medium text-foreground hover:bg-secondary transition-colors"
        >
          <LayoutDashboard className="w-4 h-4" />
          Back to Dashboard
        </button>
      </div>
    </div>
  );
};

export default Tests;
