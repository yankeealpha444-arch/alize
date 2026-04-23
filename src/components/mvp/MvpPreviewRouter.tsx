import { useEffect, useMemo } from "react";
import { toast } from "sonner";
import { useProjectIdeaText } from "@/hooks/useProjectIdeaText";
import { mvpBuilderConfigForFounderPreview } from "@/lib/mvp/mvpClassification";
import { saveMvpBuilderConfig, setMvpIdea } from "@/lib/projectData";
import IdeaExperienceShell from "@/components/experience/IdeaExperienceShell";
import BlockedInputPreview from "@/components/mvp/BlockedInputPreview";
import { isNonProductInput } from "@/lib/mvp/nonProductInputGate";

type Props = { projectId: string };

/**
 * Product experience surface (fitness / marketplace / content feed+hooks) — no template switching beyond `IdeaExperienceShell`.
 */
export default function MvpPreviewRouter({ projectId }: Props) {
  const originalPrompt = useProjectIdeaText(projectId);

  const inputBlocked = useMemo(
    () => isNonProductInput(originalPrompt.trim()),
    [originalPrompt],
  );

  useEffect(() => {
    const idea = originalPrompt.trim();
    if (!idea) return;
    try {
      const result = setMvpIdea(idea, projectId);
      if (result.ideaUsed !== idea) {
        try {
          localStorage.setItem("alize_idea", result.ideaUsed);
        } catch {
          /* ignore */
        }
      }
      if (result.blocked && result.message) {
        toast.warning(result.message, { duration: 8000 });
      }
      saveMvpBuilderConfig(mvpBuilderConfigForFounderPreview(result.ideaUsed), projectId);
    } catch (e) {
      console.warn("[Alizé] experience preview persist failed", e);
    }
  }, [projectId, originalPrompt]);

  if (inputBlocked) {
    return (
      <div className="w-full min-h-[20vh]" data-mvp-preview-router-root>
        <BlockedInputPreview projectId={projectId} initialValue={originalPrompt} allowPersistGenerate />
      </div>
    );
  }

  return (
    <div className="w-full min-h-[20vh]" data-mvp-preview-router-root>
      <IdeaExperienceShell projectId={projectId} />
    </div>
  );
}
