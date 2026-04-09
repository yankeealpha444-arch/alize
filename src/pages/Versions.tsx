import { GitBranch, Check, ExternalLink } from "lucide-react";
import { getProjectData } from "@/lib/projectData";
import { useProjectId } from "@/hooks/useProject";
import { useNavigate } from "react-router-dom";
import { hashAppUrl } from "@/lib/hashRoutes";

const Versions = () => {
  const projectId = useProjectId();
  const navigate = useNavigate();
  const data = getProjectData(projectId);
  const versions = data.versions.length > 0
    ? data.versions
    : [{ version: 1, changes: "Initial MVP generated", date: new Date().toISOString().slice(0, 10), source: "System" }];

  const latestVersion = versions[versions.length - 1];
  const liveUrl = hashAppUrl(`/p/${projectId}`);

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
          <GitBranch className="w-5 h-5 text-foreground" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">Versions</h2>
          <p className="text-sm text-muted-foreground">Current live vs new edits (publish on Preview Changes)</p>
        </div>
      </div>

      <p className="text-xs text-muted-foreground mb-4">
        You are here: <span className="text-foreground font-medium">Versions</span>. New copy is drafted in the Builder or via Improve MVP; publishing happens on Preview Changes.
      </p>

      {/* Current live version highlight */}
      <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-4 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-primary" />
            <span className="text-sm font-bold text-foreground">Current live: V{latestVersion.version}</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/20 text-primary font-semibold">LIVE</span>
          </div>
          <span className="text-xs text-muted-foreground">{latestVersion.date}</span>
        </div>
        <p className="text-xs text-muted-foreground mt-2">{latestVersion.changes}</p>
        <button
          type="button"
          onClick={() => window.open(liveUrl, "_blank", "noopener,noreferrer")}
          className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-foreground border border-border rounded-lg px-3 py-2 hover:bg-secondary transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          View live MVP
        </button>
      </div>

      {/* Pending edits → Preview Changes */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6 p-4 rounded-lg border border-border bg-card">
        <div>
          <p className="text-sm font-semibold text-foreground">New version (pending)</p>
          <p className="text-xs text-muted-foreground">
            Review diffs, then use <span className="font-medium text-foreground">Publish changes</span> there.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate(`/preview/${projectId}`)}
          className="shrink-0 text-xs bg-foreground text-background px-4 py-2 rounded-lg font-semibold hover:opacity-90 transition-opacity"
        >
          Publish changes
        </button>
      </div>

      {/* Version history */}
      <div className="space-y-3">
        {[...versions].reverse().map((v, i) => (
          <div key={v.version} className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground">V{v.version}</span>
                {i === 0 && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary font-bold">LIVE</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">{v.source}</span>
                <span className="text-xs text-muted-foreground">{v.date}</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">{v.changes}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Versions;
