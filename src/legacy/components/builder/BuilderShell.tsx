import React, { useMemo, useState } from "react";
import {
  BarChart3,
  ClipboardList,
  Copy,
  Layers,
  MessageSquareDashed,
  Monitor,
  Send,
  Settings2,
  Smartphone,
  Sparkles,
  Tablet,
} from "lucide-react";
import { toast } from "sonner";
import { updateMvpCustomizations } from "@/lib/projectData";
import ManualEditorLite from "@/components/builder/ManualEditorLite";
import SaaSPreviewLite from "@/components/builder/SaaSPreviewLite";
import ScreenerEditorLite from "@/components/builder/ScreenerEditorLite";
import SurveyEditorLite from "@/components/builder/SurveyEditorLite";
import TrackingViewLite from "@/components/builder/TrackingViewLite";

type PreviewMode = "desktop" | "tablet" | "mobile";

const previewWidths: Record<PreviewMode, string> = {
  desktop: "100%",
  tablet: "768px",
  mobile: "375px",
};

const sections = [
  { id: "mvp", label: "MVP Product", icon: Layers },
  { id: "edit", label: "Edit Fields", icon: Settings2 },
  { id: "survey", label: "Survey", icon: ClipboardList },
  { id: "screener", label: "Screener", icon: MessageSquareDashed },
  { id: "tracking", label: "Tracking", icon: BarChart3 },
];

function parseAiCommand(input: string): { field: string; value: string } | null {
  const lower = input.toLowerCase().trim();
  if (lower.startsWith("change headline to ") || lower.startsWith("set headline to "))
    return { field: "headline", value: input.replace(/^(change|set) headline to /i, "").trim() };
  if (lower.startsWith("change subtitle to ") || lower.startsWith("set subtitle to "))
    return { field: "subtitle", value: input.replace(/^(change|set) subtitle to /i, "").trim() };
  if (
    lower.startsWith("change cta to ") ||
    lower.startsWith("set cta to ") ||
    lower.startsWith("change cta text to ") ||
    lower.startsWith("set cta text to ")
  )
    return { field: "ctaText", value: input.replace(/^(change|set) cta( text)? to /i, "").trim() };
  if (lower.startsWith("change pricing copy to ") || lower.startsWith("set pricing copy to "))
    return { field: "pricingCopy", value: input.replace(/^(change|set) pricing copy to /i, "").trim() };
  return null;
}

export default function BuilderShell({
  projectId,
  statusMessage,
}: {
  projectId: string;
  statusMessage?: string;
}) {
  const [activeSection, setActiveSection] = useState("mvp");
  const [previewMode, setPreviewMode] = useState<PreviewMode>("desktop");
  const [aiInput, setAiInput] = useState("");

  const idea = localStorage.getItem("alize_idea") || "My Startup Idea";
  const projectName = idea.split(" ").slice(0, 4).join(" ") || "Untitled";
  const includePricing = localStorage.getItem("alize_includePricing") === "true";
  const shareUrl = `${window.location.origin}/#/p/${projectId}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    toast.success("Public link copied!");
  };

  const handleAiSend = () => {
    if (!aiInput.trim()) return;
    const command = parseAiCommand(aiInput);
    if (command) {
      updateMvpCustomizations({ [command.field]: command.value } as any, projectId);
      window.dispatchEvent(new Event("alize-mvp-updated"));
      toast.success(`✓ ${command.field.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())} updated`);
    } else {
      toast.info(`Try: "change headline to …", "change cta to …", "change pricing copy to …"`);
    }
    setAiInput("");
  };

  const content = useMemo(() => {
    if (activeSection === "edit") {
      return (
        <div className="flex gap-4 w-full max-w-5xl">
          <div className="w-72 shrink-0">
            <ManualEditorLite projectId={projectId} />
          </div>
          <div
            className="flex-1 bg-card border border-border rounded-xl overflow-hidden h-fit"
            style={{ maxWidth: previewWidths[previewMode] }}
          >
            <SaaSPreviewLite projectId={projectId} projectName={projectName} includePricing={includePricing} />
          </div>
        </div>
      );
    }

    return (
      <div
        className="bg-card border border-border rounded-xl overflow-hidden transition-all duration-300 h-fit"
        style={{ width: previewWidths[previewMode], maxWidth: "100%" }}
      >
        {activeSection === "mvp" && (
          <SaaSPreviewLite projectId={projectId} projectName={projectName} includePricing={includePricing} />
        )}
        {activeSection === "survey" && <SurveyEditorLite projectName={projectName} />}
        {activeSection === "screener" && <ScreenerEditorLite projectName={projectName} />}
        {activeSection === "tracking" && <TrackingViewLite />}
      </div>
    );
  }, [activeSection, includePricing, previewMode, projectId, projectName]);

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      {/* Top toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <h2 className="text-sm font-semibold text-foreground truncate max-w-[240px]">{projectName}</h2>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground font-medium">
            Builder
          </span>
          {statusMessage && (
            <span className="text-[10px] text-muted-foreground truncate">{statusMessage}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5 bg-secondary/80 rounded-full p-0.5">
            {([
              { mode: "desktop" as const, icon: Monitor },
              { mode: "tablet" as const, icon: Tablet },
              { mode: "mobile" as const, icon: Smartphone },
            ]).map(({ mode, icon: Icon }) => (
              <button
                key={mode}
                type="button"
                onClick={() => setPreviewMode(mode)}
                className={`p-1.5 rounded-full transition-all ${
                  previewMode === mode ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg border border-border hover:bg-secondary transition-colors"
          >
            <Copy className="h-3.5 w-3.5" /> Copy Public Link
          </button>
          <button
            type="button"
            onClick={() => window.open(`/#/p/${projectId}`, "_blank")}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg border border-border hover:bg-secondary transition-colors"
          >
            Preview MVP
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar */}
        <aside className="w-48 shrink-0 border-r border-border bg-card overflow-y-auto">
          <div className="p-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2">Sections</p>
            <div className="space-y-0.5">
              {sections.map((sec) => {
                const Icon = sec.icon;
                return (
                  <button
                    key={sec.id}
                    type="button"
                    onClick={() => setActiveSection(sec.id)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium transition-colors text-left ${
                      activeSection === sec.id
                        ? "bg-foreground/10 text-foreground"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    }`}
                  >
                    <Icon className="h-3 w-3 shrink-0" />
                    {sec.label}
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        {/* Right: Content area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto bg-background flex justify-center p-4">{content}</div>

          {/* Bottom AI chat bar */}
          {activeSection !== "tracking" && (
            <div className="shrink-0 border-t border-border bg-card px-4 py-3">
              <div className="flex items-center gap-3 max-w-3xl mx-auto">
                <Sparkles className="h-4 w-4 text-muted-foreground shrink-0" />
                <input
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAiSend()}
                  placeholder='Describe the change you want to make — e.g. "change headline to …", "add testimonials", "change CTA to …"'
                  className="flex-1 bg-secondary rounded-lg px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-foreground/20"
                />
                <button
                  type="button"
                  onClick={handleAiSend}
                  className="p-2.5 rounded-lg bg-foreground text-background hover:bg-foreground/90 transition-colors"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
              <p className="text-[9px] text-muted-foreground text-center mt-1.5">
                Example commands: \"change headline to …\" · \"change CTA to …\" · \"change pricing copy to …\"
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

