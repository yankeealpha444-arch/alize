import { useQuery } from "@tanstack/react-query";
import { parseYoutubeVideoId, resolveYoutubeVideoDetails } from "../../../src/lib/mvp/youtubeIngest";
import { type Clip } from "@/data/demoClips";
import { buildYoutubeClipsFromDuration } from "@/lib/youtubeClipSegments";
import { flowStore } from "../store/flowStore";

interface UseClipsResult {
  clips: Clip[];
  sourceName: string;
  isLoading: boolean;
  isDemo: boolean;
}

function readStorageKeys() {
  const projectId = localStorage.getItem("alize_projectId") || "default";
  const preferredJobId = localStorage.getItem(`alize_video_job_id_${projectId}`);
  return { projectId, preferredJobId: preferredJobId ?? "none" };
}

function truncateTitle(s: string, max = 60): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

/**
 * YouTube link only: three deterministic windows from the pasted video (no demo assets, no unrelated DB clips).
 */
export function useClips(_jobId?: string): UseClipsResult {
  const { projectId, preferredJobId } = readStorageKeys();
  const persistedSourceKey =
    typeof localStorage !== "undefined" ? localStorage.getItem(`alize_clips_source_url_${projectId}`) ?? "" : "";

  const { data, isLoading } = useQuery({
    queryKey: ["clips", projectId, preferredJobId, persistedSourceKey],
    queryFn: async () => {
      const pid = localStorage.getItem("alize_projectId") || "default";
      const persistedSource = localStorage.getItem(`alize_clips_source_url_${pid}`)?.trim() ?? "";
      const flowSource = flowStore.get().sourceInput?.trim() || persistedSource;
      const ytId = parseYoutubeVideoId(flowSource);

      if (!flowSource || !ytId) {
        return { clips: [] as Clip[], sourceName: "", isDemo: false };
      }

      let durationSec = 120;
      let sourceName = truncateTitle(flowSource);
      try {
        const { details } = await resolveYoutubeVideoDetails(flowSource, ytId);
        durationSec = Math.max(1, details.durationSec);
        sourceName = truncateTitle(details.title || flowSource);
      } catch {
        durationSec = 120;
      }

      const clips = buildYoutubeClipsFromDuration(ytId, durationSec);
      return { clips, sourceName, isDemo: false };
    },
    staleTime: 15_000,
  });

  const clips =
    data?.clips?.length != null && data.clips.length > 0
      ? data.clips
      : isLoading
        ? []
        : [];

  const sourceName = data?.sourceName ?? "";

  return {
    clips,
    sourceName,
    isLoading,
    isDemo: false,
  };
}
