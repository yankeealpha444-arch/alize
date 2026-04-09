import React, { useState, useRef } from "react";
import { Eye, Check, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { addVersion, getProjectData, computeVersionDiffs } from "@/lib/projectData";
import { useProjectId } from "@/hooks/useProject";
import { generateCopy } from "@/lib/copyGenerator";
import SaaSPreview from "@/components/builder/SaaSPreview";

const PreviewChanges = () => {
  const projectId = useProjectId();
  const navigate = useNavigate();
  const idea = localStorage.getItem("alize_idea") || "My Startup";
  const projectName = idea.split(" ").slice(0, 4).join(" ");
  const includePricing = localStorage.getItem("alize_includePricing") === "true";
  const copy = generateCopy(idea, projectName);

  const { diffs, fromVersion, toVersion } = computeVersionDiffs(projectId);
  const [highlightSection, setHighlightSection] = useState<string | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  const handlePublish = () => {
    if (diffs.length === 0) {
      toast.error("No changes to publish. Edit the MVP first.");
      return;
    }
    const summary = diffs.map(d => `${d.field}: "${d.after}"`).join("; ");
    addVersion(summary, "Preview Changes", projectId);
    toast.success(`Version ${toVersion} published!`);
    navigate(`/versions/${projectId}`);
  };

  const handleClickChange = (section: string) => {
    setHighlightSection(highlightSection === section ? null : section);
    // Scroll to section in preview
    const sectionId = section.toLowerCase().replace(/\s/g, "-");
    const el = previewRef.current?.querySelector(`#section-${sectionId}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const typeColor = (type: string) => {
    if (type === "added") return "bg-emerald-500";
    if (type === "removed") return "bg-red-500";
    return "bg-primary";
  };

  const typeBadge = (type: string) => {
    if (type === "added") return "Added";
    if (type === "removed") return "Removed";
    return "Changed";
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-card shrink-0">
        <div className="flex items-center gap-3">
          <Eye className="w-4 h-4 text-foreground" />
          <h2 className="text-sm font-bold text-foreground">Preview Changes</h2>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
            V{fromVersion} → V{toVersion}
          </span>
          {diffs.length > 0 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/20 text-primary font-semibold">
              {diffs.length} change{diffs.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(`/builder/${projectId}`)}
            className="text-xs text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg border border-border hover:bg-secondary transition-colors"
          >
            Edit in Builder
          </button>
          <button
            onClick={handlePublish}
            disabled={diffs.length === 0}
            className="text-xs bg-foreground text-background px-4 py-1.5 rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-30"
          >
            Publish V{toVersion}
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Changes list */}
        <aside className="w-96 shrink-0 border-r border-border bg-card overflow-y-auto p-4">
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-3">
            Changes in this version
          </p>

          {diffs.length === 0 ? (
            <div className="text-center py-10">
              <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mx-auto mb-3">
                <Eye className="w-5 h-5 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground mb-2">No changes detected.</p>
              <p className="text-[10px] text-muted-foreground mb-4">
                Edit headline, CTA, pricing, or other fields in the Builder, then come back here to review.
              </p>
              <button
                onClick={() => navigate(`/builder/${projectId}`)}
                className="text-xs text-foreground underline hover:no-underline"
              >
                Edit MVP first →
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Changes table */}
              <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="bg-secondary/50">
                      <th className="text-left px-3 py-2 text-muted-foreground font-medium">Section</th>
                      <th className="text-left px-3 py-2 text-muted-foreground font-medium">Field</th>
                      <th className="text-left px-3 py-2 text-muted-foreground font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {diffs.map((d, i) => (
                      <tr
                        key={i}
                        onClick={() => handleClickChange(d.section)}
                        className={`cursor-pointer border-t border-border transition-colors ${
                          highlightSection === d.section
                            ? "bg-primary/10"
                            : "hover:bg-secondary/30"
                        }`}
                      >
                        <td className="px-3 py-2 text-foreground">{d.section}</td>
                        <td className="px-3 py-2 text-foreground font-medium">{d.field}</td>
                        <td className="px-3 py-2">
                          <span className={`text-[9px] px-1.5 py-0.5 rounded text-white ${typeColor(d.type)}`}>
                            {typeBadge(d.type)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Detailed before/after cards */}
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-4 mb-2">
                Before → After
              </p>
              {diffs.map((d, i) => (
                <div
                  key={i}
                  onClick={() => handleClickChange(d.section)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    highlightSection === d.section
                      ? "bg-primary/10 border-primary/30"
                      : "bg-secondary/30 border-border hover:border-foreground/20"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${typeColor(d.type)}`} />
                    <p className="text-[11px] font-semibold text-foreground">{d.field}</p>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground ml-auto">
                      {d.section}
                    </span>
                  </div>
                  <div className="space-y-1.5 text-[10px]">
                    <div className="flex gap-2">
                      <span className="text-red-400 font-medium shrink-0 w-10">Before</span>
                      <p className="text-muted-foreground line-through break-all">"{d.before}"</p>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-emerald-400 font-medium shrink-0 w-10">After</span>
                      <p className="text-foreground font-medium break-all">"{d.after}"</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
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

          {diffs.length > 0 && (
            <div className="mt-4 space-y-2">
              <button
                onClick={handlePublish}
                className="w-full text-xs bg-foreground text-background py-2.5 rounded-lg font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
              >
                <Check className="w-3.5 h-3.5" /> Approve & Publish V{toVersion}
              </button>
              <button
                onClick={() => navigate(`/builder/${projectId}`)}
                className="w-full text-xs text-muted-foreground py-2 rounded-lg border border-border hover:bg-secondary transition-colors"
              >
                Go back and edit more
              </button>
            </div>
          )}
        </aside>

        {/* Right: Live MVP Preview */}
        <div className="flex-1 overflow-y-auto bg-background p-4" ref={previewRef}>
          <div className="max-w-2xl mx-auto">
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-3">
              {diffs.length > 0 ? `New version preview (V${toVersion})` : `Current live version (V${fromVersion})`}
            </p>
            <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
              <SaaSPreview
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
