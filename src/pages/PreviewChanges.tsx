import React, { useRef, useState } from "react";
import { Check, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { addVersion, computeVersionDiffs, setPublished } from "@/lib/projectData";
import { useProjectId } from "@/hooks/useProject";
import SaaSPreview from "@/components/builder/SaaSPreview";
import { fieldKeyToDataSection } from "@/lib/previewSectionMap";

const HIGHLIGHT_MS = 2500;

const PreviewChanges = () => {
  const projectId = useProjectId();
  const navigate = useNavigate();
  const idea = localStorage.getItem("alize_idea") || "My Startup";
  const projectName = idea.split(" ").slice(0, 4).join(" ");
  const includePricing = localStorage.getItem("alize_includePricing") === "true";

  const { diffs, fromVersion, toVersion } = computeVersionDiffs(projectId);
  const [highlightFieldKey, setHighlightFieldKey] = useState<string | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handlePublish = () => {
    if (diffs.length === 0) {
      toast.info("No changes to apply.");
      return;
    }
    const summary =
      diffs.length > 0
        ? diffs.map((d) => `${d.field}: "${d.after}"`).join("; ")
        : "Republished current MVP (no pending text diffs)";
    addVersion(summary, "Preview Changes", projectId);
    setPublished(projectId);
    toast.success("Your MVP is live. Next: get users or improve again.");
    navigate(`/dashboard/${projectId}`);
  };

  const flashElement = (el: Element) => {
    el.classList.add("mvp-section-flash");
    if (highlightTimer.current) clearTimeout(highlightTimer.current);
    highlightTimer.current = setTimeout(() => {
      el.classList.remove("mvp-section-flash");
      highlightTimer.current = null;
    }, HIGHLIGHT_MS);
  };

  const handleClickChange = (fieldKey: string) => {
    setHighlightFieldKey(fieldKey);
    const section = fieldKeyToDataSection(fieldKey);
    const root = previewRef.current;
    if (!root) return;
    const el = root.querySelector(`[data-section="${section}"]`);
    if (!el) {
      toast.info("That section is not visible in this preview (e.g. pricing off or testimonials hidden).");
      return;
    }
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    flashElement(el);
  };

  const typeBadge = (type: string) => (type === "added" ? "Added" : type === "removed" ? "Removed" : "Changed");

  const appliedLine =
    diffs.length > 0 ? `${diffs.length} improvement${diffs.length !== 1 ? "s" : ""} applied` : "No text changes pending";
  const publishDisabled = diffs.length === 0;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex flex-col gap-2 px-6 py-3 border-b border-border bg-card shrink-0">
        <div className="rounded-lg border-2 border-foreground/20 bg-secondary/40 px-4 py-3">
          <p className="text-sm font-semibold text-foreground">
            {diffs.length > 0
              ? `${appliedLine}. Review the changes below, then publish changes to make them live.`
              : "No changes to apply."}
          </p>
        </div>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-3 flex-wrap">
            <Eye className="w-4 h-4 text-foreground shrink-0" />
            <h2 className="text-sm font-bold text-foreground">Preview Changes</h2>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
              V{fromVersion} → V{toVersion}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-foreground font-semibold">
              {appliedLine}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handlePublish}
              disabled={publishDisabled}
              className="text-xs bg-foreground text-background px-4 py-2 rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-30"
            >
              Publish changes
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Changes list */}
        <aside className="w-96 shrink-0 border-r border-border bg-card overflow-y-auto p-4">
          {diffs.length === 0 ? (
            <div className="text-center py-10">
              <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mx-auto mb-3">
                <Eye className="w-5 h-5 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground mb-2">No text changes detected.</p>
              <p className="text-[10px] text-muted-foreground mb-4">
                Run <span className="text-foreground font-medium">Improve MVP</span> from the dashboard, or edit in the builder, then return here.
              </p>
            </div>
          ) : (
            <>
              <p className="text-sm font-semibold text-foreground mb-1">{appliedLine}</p>
              <p className="text-[10px] text-muted-foreground mb-2">Tap a change to scroll the preview and highlight it.</p>

              <div className="flex flex-wrap gap-1.5 mb-3">
                {diffs.map((d) => (
                  <button
                    type="button"
                    key={d.fieldKey}
                    onClick={() => handleClickChange(d.fieldKey)}
                    className={`text-[10px] px-2 py-1 rounded-md border transition-colors ${
                      highlightFieldKey === d.fieldKey
                        ? "border-foreground bg-secondary text-foreground"
                        : "border-border bg-secondary/40 text-foreground hover:bg-secondary"
                    }`}
                  >
                    {d.field}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2">Before → After</p>
              <div className="space-y-2">
                {diffs.map((d, i) => (
                  <button
                    type="button"
                    key={i}
                    onClick={() => handleClickChange(d.fieldKey)}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      highlightFieldKey === d.fieldKey ? "bg-secondary border-foreground/60" : "bg-secondary/30 border-border hover:border-foreground/20"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <p className="text-[11px] font-semibold text-foreground">{d.field}</p>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground ml-auto">{d.section}</span>
                    </div>
                    <div className="mb-1.5">
                      <span className="text-[10px] text-muted-foreground">{typeBadge(d.type)}</span>
                    </div>
                    <div className="space-y-1.5 text-[10px]">
                      <div className="flex gap-2">
                        <span className="text-muted-foreground font-medium shrink-0 w-10">Before</span>
                        <p className="text-muted-foreground line-through break-all">"{d.before}"</p>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-muted-foreground font-medium shrink-0 w-10">After</span>
                        <p className="text-foreground font-medium break-all">"{d.after}"</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Version info */}
          <div className="mt-6 pt-4 border-t border-border">
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2">Version info</p>
            <div className="space-y-1.5 text-[11px]">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Current live</span>
                <span className="text-foreground font-semibold">V{fromVersion}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">New version</span>
                <span className="text-foreground font-semibold">V{toVersion}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Changes</span>
                <span className="text-foreground font-semibold">{diffs.length}</span>
              </div>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <button
              type="button"
              onClick={handlePublish}
              disabled={publishDisabled}
              className="w-full text-sm bg-foreground text-background py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-30"
            >
              <Check className="w-4 h-4" /> Publish changes
            </button>
            <button
              type="button"
              onClick={() => navigate(`/dashboard/${projectId}`)}
              className="w-full text-xs text-muted-foreground py-2 rounded-lg border border-border hover:bg-secondary transition-colors"
              >
              Back to Dashboard
            </button>
          </div>
        </aside>

        {/* Right: Live MVP Preview */}
        <div className="flex-1 overflow-y-auto bg-background p-4" ref={previewRef}>
          <div className="max-w-2xl mx-auto">
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-3">
              {diffs.length > 0 ? `New version preview (V${toVersion})` : `Current live version (V${fromVersion})`}
            </p>
            <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
              <SaaSPreview
                projectId={projectId}
                projectName={projectName}
                activeSection="mvp"
                includePricing={includePricing}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PreviewChanges;
