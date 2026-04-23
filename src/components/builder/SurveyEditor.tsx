import { useState } from "react";
import { ArrowRight, ArrowLeft, CheckCircle2 } from "lucide-react";
import { addSurveyResponse } from "@/lib/projectData";
import { toast } from "sonner";
import { sanitizeIdeaForPersistence } from "@/lib/mvp/ideaContentSafety";

interface SurveyEditorProps {
  projectName: string;
}

interface SurveyQuestion {
  q: string;
  type: "open" | "choice";
  options?: string[];
}

export default function SurveyEditor({ projectName }: SurveyEditorProps) {
  const idea = sanitizeIdeaForPersistence(localStorage.getItem("alize_idea") || "") || projectName;
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [completed, setCompleted] = useState(false);

  const surveyQuestions: SurveyQuestion[] = [
    { q: `What problem are you trying to solve related to ${idea.toLowerCase()}?`, type: "open" },
    { q: "How are you currently solving this problem?", type: "choice", options: ["Spreadsheets", "Another tool", "Manual process", "Not solving it yet"] },
    { q: `What do you like about ${projectName} so far?`, type: "open" },
    { q: "What did you find confusing or dislike?", type: "open" },
    { q: "Would you use this product regularly?", type: "choice", options: ["Yes, definitely", "Probably", "Not sure", "No"] },
    { q: "Would you pay for this if it fully solves your problem?", type: "choice", options: ["Yes", "Maybe", "No"] },
    { q: "How much would you expect this to cost per month?", type: "choice", options: ["Free", "$1–$9", "$10–$29", "$30+"] },
    { q: "What one feature would make this product much better?", type: "open" },
  ];

  const total = surveyQuestions.length;
  const current = surveyQuestions[step];
  const progress = ((step + 1) / total) * 100;

  const handleComplete = () => {
    setCompleted(true);
    addSurveyResponse(answers);
    toast.success("Survey response saved!");
  };

  const handleNext = () => {
    if (step < total - 1) setStep(step + 1);
    else handleComplete();
  };

  const handleSelectChoice = (opt: string) => {
    setAnswers({ ...answers, [step]: opt });
    setTimeout(() => {
      if (step < total - 1) setStep(step + 1);
      else handleComplete();
    }, 300);
  };

  if (completed) {
    return (
      <div className="text-foreground p-6">
        <div className="text-center py-16 max-w-sm mx-auto">
          <div className="w-16 h-16 rounded-full bg-secondary/50 flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 className="w-8 h-8 text-foreground" />
          </div>
          <h2 className="text-2xl font-bold mb-3">Thank you for your feedback!</h2>
          <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
            Your answers help us build a better product. Now try {projectName} and see what we're working on.
          </p>
          <button
            onClick={() => {
              const event = new CustomEvent("alize-switch-section", { detail: "mvp" });
              window.dispatchEvent(event);
            }}
            className="inline-flex items-center gap-2 bg-foreground text-background px-8 py-3.5 rounded-xl text-sm font-bold hover:opacity-90 transition-opacity shadow-lg"
          >
            Try {projectName} <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-8 pt-5 border-t border-border text-center">
          <p className="text-[10px] text-muted-foreground">
            Built with <span className="font-semibold text-foreground">Alizé</span> · Build your own MVP and know exactly what to do next
          </p>
          <button className="text-[10px] text-muted-foreground underline hover:text-foreground mt-1 transition-colors">
            Build with Alizé →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="text-foreground p-6 max-w-lg mx-auto">
      {step === 0 && (
        <div className="p-6 rounded-xl border border-border bg-secondary/10 mb-8">
          <h2 className="text-xl font-bold mb-2">About this survey</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            We're building <span className="text-foreground font-medium">{projectName}</span> — a product that helps people with {idea.toLowerCase()}.
            This survey takes about 5 minutes and helps us build something people actually want.
          </p>
          <div className="flex items-center gap-5 mt-4 text-[11px] text-muted-foreground">
            <span>📋 {total} questions</span>
            <span>⏱ ~5 minutes</span>
            <span>🔒 Anonymous</span>
          </div>
        </div>
      )}

      {/* Progress */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">
            Question {step + 1} of {total}
          </p>
          <p className="text-[11px] text-muted-foreground">{Math.round(progress)}%</p>
        </div>
        <div className="w-full h-2 rounded-full bg-secondary overflow-hidden">
          <div
            className="h-full rounded-full bg-foreground transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Question card */}
      <div className="p-6 rounded-xl border border-border bg-card min-h-[220px] flex flex-col shadow-sm">
        <p className="text-base font-semibold mb-6 leading-relaxed">{current.q}</p>

        {current.type === "choice" && current.options && (
          <div className="space-y-2.5 flex-1">
            {current.options.map((opt) => (
              <button
                key={opt}
                onClick={() => handleSelectChoice(opt)}
                className={`w-full text-left px-5 py-3.5 rounded-xl border transition-all text-sm ${
                  answers[step] === opt
                    ? "border-foreground bg-foreground/5 font-semibold"
                    : "border-border hover:border-foreground/20 hover:bg-secondary/30"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        )}

        {current.type === "open" && (
          <div className="flex-1">
            <textarea
              value={answers[step] || ""}
              onChange={(e) => setAnswers({ ...answers, [step]: e.target.value })}
              className="w-full px-5 py-4 rounded-xl border border-border bg-secondary/20 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-foreground/20 focus:border-foreground/30 transition-colors"
              rows={4}
              placeholder="Type your answer..."
            />
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-6">
        <button
          onClick={() => step > 0 && setStep(step - 1)}
          disabled={step === 0}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>
        <button
          onClick={handleNext}
          className="flex items-center gap-2 bg-foreground text-background px-6 py-3 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          {step === total - 1 ? "Finish" : "Next"} <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="mt-10 pt-5 border-t border-border text-center">
        <p className="text-[10px] text-muted-foreground">
          Built with <span className="font-semibold text-foreground">Alizé</span> · Build your own MVP and know exactly what to do next
        </p>
        <button className="text-[10px] text-muted-foreground underline hover:text-foreground mt-1 transition-colors">
          Build with Alizé →
        </button>
      </div>
    </div>
  );
}
