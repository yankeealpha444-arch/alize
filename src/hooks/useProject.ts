import { useParams } from "react-router-dom";

/**
 * Returns the current projectId from URL params, or "default" fallback.
 * All founder pages use this to scope data to the current project.
 */
export function useProjectId(): string {
  const { projectId } = useParams<{ projectId: string }>();
  return projectId || "default";
}

/**
 * Generate a simple project ID from the idea text.
 */
export function generateProjectId(idea: string): string {
  return idea
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40) || "default";
}
