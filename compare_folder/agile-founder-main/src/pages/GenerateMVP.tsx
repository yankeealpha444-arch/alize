import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const STEPS = [
  "Analyzing your idea…",
  "Writing copy…",
  "Designing layout…",
  "Preparing public page…",
  "Setting up tracking…",
  "Preparing dashboard…",
  "Creating share link…",
];

const STEP_DURATION = 800;

export default function GenerateMVP() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);

  const projectMode = localStorage.getItem("alize_projectMode") || "validation";
  const isSaas = projectMode === "growth";
  const typeLabel = isSaas ? "SaaS Product MVP" : "Landing Page MVP";

  useEffect(() => {
    if (currentStep < STEPS.length) {
      const t = setTimeout(() => setCurrentStep((s) => s + 1), STEP_DURATION);
      return () => clearTimeout(t);
    } else {
      const pid = localStorage.getItem("alize_projectId") || "default";
      const t = setTimeout(() => {
        navigate(`/builder/${pid}`, { replace: true });
      }, 600);
      return () => clearTimeout(t);
    }
  }, [currentStep, navigate]);

  const progressPercent = Math.round((currentStep / STEPS.length) * 100);

  return (
    <div className="max-w-lg mx-auto pt-8 pb-16 px-4">
      {/* Back button */}
      <button
        onClick={() => navigate("/questions")}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        ← Back
      </button>

      <h1 className="text-2xl font-medium text-foreground mb-2">
        Generating {typeLabel}
      </h1>
      <p className="text-sm text-muted-foreground mb-10">
        We're building your {isSaas ? "SaaS product" : "landing page"} and setting up your test.
      </p>

      <Progress value={progressPercent} className="h-2 mb-8" />

      <div className="space-y-3">
        {STEPS.map((label, i) => {
          const done = i < currentStep;
          const active = i === currentStep;
          return (
            <div
              key={i}
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
        <p className="text-sm text-foreground font-medium mt-8">
          ✓ Your MVP is ready!
        </p>
      )}
    </div>
  );
}
