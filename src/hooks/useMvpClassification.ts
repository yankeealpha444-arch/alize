import { useCallback, useSyncExternalStore } from "react";
import { classifyMvpFromProject, type MvpClassification } from "@/lib/mvp/mvpClassification";

function subscribeProjectData(projectId: string, onChange: () => void) {
  const handler = (e: Event) => {
    const id = (e as CustomEvent<{ projectId?: string }>).detail?.projectId;
    if (id === undefined || id === projectId) onChange();
  };
  window.addEventListener("alize-project-data-updated", handler);
  return () => window.removeEventListener("alize-project-data-updated", handler);
}

/** Recomputes when project data changes (idea, MVP builder, etc.). */
export function useMvpClassification(projectId: string): MvpClassification {
  const subscribe = useCallback((onChange: () => void) => subscribeProjectData(projectId, onChange), [projectId]);
  return useSyncExternalStore(
    subscribe,
    () => classifyMvpFromProject(projectId),
    () => classifyMvpFromProject(projectId),
  );
}
