import { useCallback, useSyncExternalStore } from "react";
import {
  getHookGeneratorMvpClassification,
  getSafeFallbackMvpClassification,
  type MvpClassification,
} from "@/lib/mvp/mvpClassification";
import { getIdeaTextForToolTemplate } from "@/lib/mvp/toolTemplateSubtype";
import { getVideoMvpProject } from "@/lib/videoMvpProject";

const classificationSnapshotCache = new Map<string, { key: string; value: MvpClassification }>();

function subscribeProjectData(projectId: string, onChange: () => void) {
  const handler = (e: Event) => {
    const id = (e as CustomEvent<{ projectId?: string }>).detail?.projectId;
    if (id === undefined || id === projectId) onChange();
  };
  window.addEventListener("alize-project-data-updated", handler);
  const onVideoMvp = () => onChange();
  window.addEventListener("alize-video-mvp-project-updated", onVideoMvp);
  return () => {
    window.removeEventListener("alize-project-data-updated", handler);
    window.removeEventListener("alize-video-mvp-project-updated", onVideoMvp);
  };
}

function safeProjectId(projectId: string | undefined): string {
  return typeof projectId === "string" && projectId.length > 0 ? projectId : "default";
}

function computeClassification(projectId: string): MvpClassification {
  try {
    const pid = safeProjectId(projectId);
    const ideaRaw = getIdeaTextForToolTemplate(pid);
    const idea = typeof ideaRaw === "string" ? ideaRaw : String(ideaRaw ?? "");
    const trimmed = idea.trim();
    const vmvp = getVideoMvpProject(pid) ? "1" : "0";
    const cacheKey = `${pid}::${trimmed}::vmvp_${vmvp}`;
    const hit = classificationSnapshotCache.get(pid);
    if (hit?.key === cacheKey) return hit.value;

    const next =
      getVideoMvpProject(pid) || trimmed
        ? getHookGeneratorMvpClassification(trimmed, pid)
        : getSafeFallbackMvpClassification();
    classificationSnapshotCache.set(pid, { key: cacheKey, value: next });
    return next;
  } catch (e) {
    console.warn("[Alizé] useSegmentAwareMvpClassification failed", e);
    return getSafeFallbackMvpClassification();
  }
}

/**
 * Aligned with preview: always Hook Generator classification when the project has an idea.
 */
export function useSegmentAwareMvpClassification(projectId: string | undefined): MvpClassification {
  const pid = safeProjectId(projectId);
  const subscribe = useCallback((onChange: () => void) => subscribeProjectData(pid, onChange), [pid]);
  return useSyncExternalStore(
    subscribe,
    () => computeClassification(pid),
    () => computeClassification(pid),
  );
}
