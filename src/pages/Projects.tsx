// AI SAFE FILE
// UI LOCKED
// DO NOT MODIFY LAYOUT, STYLE, STRUCTURE, ROUTES, COPY, OR TEMPLATE
// ONLY FIX THE SPECIFIC REQUESTED LOGIC
// UI changes require: "UI change approved"

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FolderOpen, TrendingUp, Sparkles, ArrowRight, Clock } from "lucide-react";
import { generateProjectId } from "@/hooks/useProject";
import { detectProductType } from "@/lib/productType";
import { sanitizeIdeaForPersistence } from "@/lib/mvp/ideaContentSafety";

interface ProjectSummary {
  id: string;
  name: string;
  stage: string;
  pmf: number;
  lastUpdated: string;
}

function getStage(data: any): string {
  if (!data) return "Building";
  if (data.publishedAt && data.surveys?.length > 5) return "Testing";
  if (data.publishedAt) return "Published";
  return "Building";
}

function timeAgo(dateStr: string): string {
  try {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return `${Math.floor(days / 7)}w ago`;
  } catch {
    return dateStr;
  }
}

function getAllProjects(): ProjectSummary[] {
  const projects: ProjectSummary[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key?.startsWith("alize_project_")) continue;
    const id = key.replace("alize_project_", "");
    if (seen.has(id)) continue;
    seen.add(id);

    try {
      const raw = JSON.parse(localStorage.getItem(key) || "{}");
      const name = id === "default" ? "Default Project" : id.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
      projects.push({
        id,
        name,
        stage: getStage(raw),
        pmf: Math.min(100, Math.floor((raw.surveys?.length || 0) * 2 + (raw.emails?.length || 0) * 3 + (raw.feedback?.length || 0) * 2)),
        lastUpdated: raw.publishedAt || raw.versions?.[raw.versions.length - 1]?.date || new Date().toISOString(),
      });
    } catch { /* skip */ }
  }

  if (projects.length === 0) {
    const idea = sanitizeIdeaForPersistence(localStorage.getItem("alize_idea") || "");
    const pid = localStorage.getItem("alize_projectId");
    if (idea && pid) {
      projects.push({
        id: pid,
        name: idea.split(" ").slice(0, 6).join(" "),
        stage: "Building",
        pmf: 0,
        lastUpdated: new Date().toISOString(),
      });
    }
  }

  return projects;
}

const stageColors: Record<string, string> = {
  Building: "bg-secondary text-muted-foreground",
  Published: "bg-foreground/10 text-foreground",
  Testing: "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]",
  Growing: "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]",
};

const stageDots: Record<string, string> = {
  Building: "bg-muted-foreground",
  Published: "bg-foreground",
  Testing: "bg-[hsl(var(--success))]",
  Growing: "bg-[hsl(var(--success))]",
};

export default function Projects() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [newIdea, setNewIdea] = useState("");

  useEffect(() => {
    setProjects(getAllProjects());
  }, []);

  const handleCreateProject = () => {
    const idea = newIdea.trim();
    if (!idea) return;
    const safe = sanitizeIdeaForPersistence(idea);
    if (!safe) return;
    localStorage.setItem("alize_idea", safe);
    localStorage.removeItem("alize_answers");
    const pid = generateProjectId(safe);
    localStorage.setItem("alize_projectId", pid);
    localStorage.setItem("alize_projectMode", "growth");
    localStorage.setItem("alize_productType", detectProductType(safe));
    localStorage.setItem("alize_includePricing", "false");
    navigate("/");
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-16 min-h-screen">
      <div className="mb-12">
        <h1 className="text-3xl font-extrabold text-foreground tracking-tight">My Projects</h1>
        <p className="text-sm text-muted-foreground mt-2">Your startup ideas and their progress toward product-market fit.</p>
      </div>

      {/* Inline project creation */}
      <div className="mb-10 rounded-2xl border border-border bg-card p-8 shadow-lg">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-foreground/70" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">New project</p>
            <p className="text-[10px] text-muted-foreground">Name your project, then upload a video on the next screen</p>
          </div>
        </div>
        <div className="flex gap-3">
          <input
            value={newIdea}
            onChange={(e) => setNewIdea(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreateProject()}
            placeholder="e.g. PDF to Google Docs converter, social media scheduler, surfboard marketplace..."
            className="flex-1 px-5 py-3.5 rounded-xl border border-border bg-secondary/20 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground/30 transition-colors"
          />
          <button
            onClick={handleCreateProject}
            disabled={!newIdea.trim()}
            className="flex items-center gap-2 bg-foreground text-background px-7 py-3.5 rounded-xl text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-30 shrink-0"
          >
            Start video MVP <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Projects list */}
      {projects.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-sm text-muted-foreground mb-4">No projects yet. Describe your idea above to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4">{projects.length} project{projects.length !== 1 ? "s" : ""}</p>
          {projects.map((p) => (
            <div
              key={p.id}
              onClick={() => navigate(`/video-mvp/${p.id}`)}
              className="flex items-center gap-4 p-5 rounded-2xl border border-border bg-card hover:bg-secondary/20 hover:shadow-lg cursor-pointer transition-all group"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-secondary to-secondary/40 flex items-center justify-center shrink-0">
                <FolderOpen className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground truncate">{p.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Clock className="w-3 h-3 text-muted-foreground" />
                  <p className="text-[11px] text-muted-foreground">{timeAgo(p.lastUpdated)}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${stageDots[p.stage] || stageDots.Building}`} />
                <span className={`text-[10px] font-bold px-3 py-1 rounded-full ${stageColors[p.stage] || stageColors.Building}`}>
                  {p.stage}
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 px-3 py-1.5 rounded-lg bg-secondary/50">
                <TrendingUp className="w-3 h-3 text-muted-foreground" />
                <span className="text-xs font-bold text-foreground">{p.pmf}</span>
                <span className="text-[10px] text-muted-foreground">PMF</span>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
