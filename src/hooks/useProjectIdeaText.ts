import { useCallback, useSyncExternalStore } from "react";
import { getIdeaTextForToolTemplate } from "@/lib/mvp/toolTemplateSubtype";

function subscribeProjectData(projectId: string, onChange: () => void) {
  const handler = (e: Event) => {
    const id = (e as CustomEvent<{ projectId?: string }>).detail?.projectId;
    if (id === undefined || id === projectId) onChange();
  };
  window.addEventListener("alize-project-data-updated", handler);
  return () => window.removeEventListener("alize-project-data-updated", handler);
}

function safeReadIdea(projectId: string): string {
  try {
    const raw = getIdeaTextForToolTemplate(projectId);
    return typeof raw === "string" ? raw : String(raw ?? "");
  } catch {
    return "";
  }
}

/**
 * Subscribes to project idea updates. Snapshot is always a string (never throws from getSnapshot).
 */
export function useProjectIdeaText(projectId: string): string {
  const pid = projectId || "default";
  const subscribe = useCallback((onChange: () => void) => subscribeProjectData(pid, onChange), [pid]);
  return useSyncExternalStore(
    subscribe,
    () => safeReadIdea(pid),
    () => safeReadIdea(pid),
  );
}
