import { FlaskConical, Sparkles, LayoutDashboard } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useProjectId } from "@/hooks/useProject";
import { applyImproveMvpSuite } from "@/lib/improveMvpFlow";

/**
 * Tests & Results: simplified — primary loop is Dashboard → Improve MVP → Preview → Publish.
 */
const Tests = () => {
  const projectId = useProjectId();
  const navigate = useNavigate();

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
          onClick={() => navigate(`/dashboard/${projectId}`)}
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
