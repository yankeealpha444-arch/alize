import { useParams, Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Progress } from "@/components/ui/progress";
import { Check } from "lucide-react";
import { generateProjectId } from "@/lib/projectId";
import BuilderShell from "@/components/builder/BuilderShell";

type ProjectRow = {
  id: string;
  name: string;
  created_at: string;
};

const STEPS = [
  "Analyzing your idea...",
  "Writing copy...",
  "Designing layout...",
  "Preparing public page...",
  "Setting up tracking...",
  "Preparing dashboard...",
  "Creating share link...",
];

const STEP_DURATION = 800;

export default function ProjectPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [status, setStatus] = useState<string>("Loading...");
  const [project, setProject] = useState<ProjectRow | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const navState = (location.state as
    | {
        startupIdea?: string | null;
        selectedMVP?: string;
        selectedStyle?: string;
      }
    | null) ?? null;

  const storedIdea = typeof window !== "undefined" ? localStorage.getItem("alize_idea") || "" : "";
  const idea = navState?.startupIdea || storedIdea;
  const projectId =
    (typeof window !== "undefined" ? localStorage.getItem("alize_projectId") : null) ||
    (idea ? generateProjectId(idea) : "default");

  useEffect(() => {
    if (!id) {
      if (typeof window !== "undefined") {
        if (idea) localStorage.setItem("alize_idea", idea);
        if (!localStorage.getItem("alize_projectId")) localStorage.setItem("alize_projectId", projectId);
      }

      if (currentStep < STEPS.length) {
        const t = setTimeout(() => setCurrentStep((s) => s + 1), STEP_DURATION);
        return () => clearTimeout(t);
      }
    }
  }, [id, currentStep, idea, projectId]);

  useEffect(() => {
    if (!id) {
      setStatus("No project id provided. Showing generation preview.");
      setProject(null);
      return;
    }

    (async () => {
      setStatus("Loading project...");
      const { data, error } = await supabase.from("projects").select("id,name,created_at").eq("id", id).single();

      if (error) {
        console.error("Failed to load project:", error);
        setStatus("Could not load project by id. Showing available setup data.");
        setProject(null);
        return;
      }

      setProject(data as ProjectRow);
      setStatus("Project loaded successfully ✅");
    })();
  }, [id]);

  if (!id) {
    const progressPercent = Math.round((Math.min(currentStep, STEPS.length) / STEPS.length) * 100);

    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="max-w-lg mx-auto pt-8 pb-16 px-4">
          <button
            type="button"
            onClick={() => navigate("/mvp-setup")}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-6 transition-colors"
          >
            ← Back
          </button>

          <h1 className="text-2xl font-medium text-foreground mb-2">Generating Your MVP</h1>
          <p className="text-sm text-muted-foreground mb-10">
            We are preparing your live MVP, tracking, and next-step workspace.
          </p>

          <Progress value={progressPercent} className="h-2 mb-8" />

          <div className="space-y-3">
            {STEPS.map((label, i) => {
              const done = i < currentStep;
              const active = i === currentStep;
              return (
                <div
                  key={label}
                  className={`flex items-center gap-3 text-sm transition-all duration-300 ${
                    done ? "text-foreground" : active ? "text-foreground font-medium" : "text-muted-foreground/40"
                  }`}
                >
                  {done ? (
                    <Check className="h-4 w-4 text-foreground shrink-0" />
                  ) : active ? (
                    <div className="w-4 h-4 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin shrink-0" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-border shrink-0" />
                  )}
                  {label}
                </div>
              );
            })}
          </div>

          {currentStep >= STEPS.length && (
            <div className="mt-8 space-y-3">
              <p className="text-sm text-foreground font-medium">✓ Your MVP is ready!</p>
              <button
                type="button"
                onClick={() => navigate(`/p/${projectId}`)}
                className="inline-flex items-center rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-foreground/90"
              >
                Open Project Workspace
              </button>
              <p className="text-xs text-muted-foreground">Project ID: {projectId}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // /p/:id should render the Builder-style UI (reference-like) even if Supabase data is missing.
  // If Supabase fails, we still render the shell and show a minimal status message.
  return <BuilderShell projectId={id} statusMessage={status} />;
}
