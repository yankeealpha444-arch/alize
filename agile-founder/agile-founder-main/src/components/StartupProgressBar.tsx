import { Check } from "lucide-react";

const STEPS = [
  { num: 1, label: "Idea" },
  { num: 2, label: "Build MVP" },
  { num: 3, label: "Get Users" },
  { num: 4, label: "Collect Data" },
  { num: 5, label: "Improve" },
  { num: 6, label: "PMF" },
];

interface Props {
  currentStep: number; // 1-5
}

export function StartupProgressBar({ currentStep }: Props) {
  return (
    <div className="w-full max-w-2xl mx-auto mb-10">
      <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-4 text-center">
        Startup Progress
      </p>
      <div className="flex items-center justify-between">
        {STEPS.map((step, i) => {
          const isDone = step.num < currentStep;
          const isActive = step.num === currentStep;
          return (
            <div key={step.num} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold border-2 transition-all ${
                    isDone
                      ? "bg-foreground border-foreground text-background"
                      : isActive
                      ? "border-foreground text-foreground bg-foreground/10"
                      : "border-border text-muted-foreground/40 bg-background"
                  }`}
                >
                  {isDone ? <Check className="h-3 w-3" /> : step.num}
                </div>
                <span
                  className={`text-[9px] mt-1.5 text-center leading-tight max-w-[64px] ${
                    isActive
                      ? "text-foreground font-semibold"
                      : isDone
                      ? "text-foreground"
                      : "text-muted-foreground/40"
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-1.5 mt-[-14px] ${
                    step.num < currentStep ? "bg-foreground" : "bg-border"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
