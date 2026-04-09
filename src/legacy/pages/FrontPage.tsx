import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { generateProjectId } from "@/lib/projectId";

export default function FrontPage() {
  const [idea, setIdea] = useState("");
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = () => {
    if (!idea.trim() || creating) return;
    setCreating(true);
    const trimmed = idea.trim();
    localStorage.setItem("alize_idea", trimmed);
    localStorage.removeItem("alize_answers");
    localStorage.removeItem("alize_projectMode");
    const pid = generateProjectId(trimmed);
    localStorage.setItem("alize_projectId", pid);
    navigate("/mvp-setup", {
      state: {
        startupIdea: trimmed,
      },
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="max-w-5xl mx-auto flex flex-col items-center justify-center p-6 min-h-screen bg-background">
      <div className="mb-8 w-full text-center">
        <h1 className="text-3xl md:text-4xl font-light tracking-tight text-foreground">Welcome to Alizé</h1>
        <p className="mt-2 text-sm text-muted-foreground">Turn your idea into a startup in 60 seconds.</p>
      </div>

      <div className="mb-10 w-full flex justify-center">
        <div className="relative w-full max-w-xl">
          <input
            type="text"
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe what you want to build…"
            disabled={creating}
            className="w-full h-12 rounded-xl border border-border bg-card px-4 pr-12 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-ring disabled:opacity-50"
          />
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!idea.trim() || creating}
            className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center transition hover:bg-primary/90 disabled:opacity-30"
            aria-label="Create new project"
          >
            {creating ? (
              <div className="h-3.5 w-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            ) : (
              <ArrowRight className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 max-w-3xl mx-auto">
        <div className="rounded-xl border border-border bg-card p-4 text-left">
          <div className="text-lg">⚡</div>
          <h3 className="mt-2 text-sm font-medium text-foreground">60 seconds</h3>
          <p className="mt-1 text-[11px] leading-4 text-muted-foreground">From idea to working MVP</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-left">
          <div className="text-lg">📊</div>
          <h3 className="mt-2 text-sm font-medium text-foreground">Real data</h3>
          <p className="mt-1 text-[11px] leading-4 text-muted-foreground">Track visitors, signups & revenue</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-left">
          <div className="text-lg">🎯</div>
          <h3 className="mt-2 text-sm font-medium text-foreground">Know what's next</h3>
          <p className="mt-1 text-[11px] leading-4 text-muted-foreground">AI tells you exactly what to do</p>
        </div>
      </div>
      <p className="mt-6 text-[11px] text-muted-foreground/60 text-center">Type your startup idea above to begin.</p>
    </div>
  );
}
