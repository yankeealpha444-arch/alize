import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { setMvpIdea } from "@/lib/projectData";
import { isNonProductInput } from "@/lib/mvp/nonProductInputGate";

type Props = {
  projectId: string;
  /** Current textarea value (blocked content or user edit). */
  initialValue: string;
  /** When false, "Generate MVP" only validates locally — use on multi-tool segments (cannot replace full idea safely). */
  allowPersistGenerate?: boolean;
};

/**
 * Shown when input is SQL/code/config — not a calculator or generic tool preview.
 */
export default function BlockedInputPreview({
  projectId,
  initialValue,
  allowPersistGenerate = true,
}: Props) {
  const [draft, setDraft] = useState(initialValue);

  const persistAndNotify = (text: string) => {
    const t = text.trim();
    if (!t) return;
    const result = setMvpIdea(t, projectId);
    if (result.blocked && result.message) {
      toast.warning(result.message, { duration: 8000 });
    }
    try {
      localStorage.setItem("alize_idea", result.ideaUsed);
    } catch {
      /* ignore */
    }
    if (result.ideaUsed !== t) {
      setDraft(result.ideaUsed);
    }
    window.dispatchEvent(new CustomEvent("alize-project-data-updated", { detail: { projectId } }));
  };

  const onGenerateMvp = () => {
    const t = draft.trim();
    if (!t || isNonProductInput(t)) return;
    if (!allowPersistGenerate) return;
    persistAndNotify(t);
  };

  return (
    <div
      className="w-full max-w-2xl mx-auto space-y-6 pb-8 px-2"
      data-blocked-input-preview
    >
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Invalid Input</h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          This looks like SQL, code, or system configuration, not a startup idea.
        </p>
      </header>

      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground" htmlFor={`blocked-in-${projectId}`}>
          Your input
        </label>
        <textarea
          id={`blocked-in-${projectId}`}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={12}
          className="w-full min-h-[200px] rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      {!allowPersistGenerate ? (
        <p className="text-xs text-muted-foreground">
          This block is part of a multi-tool idea. Edit the full text from the Idea step, or fix this section and update
          your saved idea there.
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          className="rounded-xl font-semibold min-w-[160px]"
          disabled={!draft.trim() || isNonProductInput(draft) || !allowPersistGenerate}
          onClick={onGenerateMvp}
        >
          Generate MVP
        </Button>
        <Button type="button" variant="outline" className="rounded-xl" onClick={() => setDraft("")}>
          Clear
        </Button>
      </div>
    </div>
  );
}
