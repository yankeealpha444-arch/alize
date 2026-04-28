import { useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { type Clip } from "@/data/demoClips";
import {
  fetchClipperState,
  fetchVideoClipsByJobIdFresh,
  type VideoJobStatus,
} from "@/lib/mvp/videoClipperBackend";

interface UseClipsResult {
  clips: Clip[];
  sourceName: string;
  isLoading: boolean;
  isDemo: boolean;
  latestJobStatus: VideoJobStatus | null;
  latestJobError: string | null;
}

function readStorageKeys() {
  const projectId = localStorage.getItem("alize_projectId") || "default";
  const preferredJobId = localStorage.getItem(`alize_video_job_id_${projectId}`);
  return { projectId, preferredJobId: preferredJobId ?? null };
}

function truncateTitle(s: string, max = 60): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

/**
 * @param activeJobId When set (e.g. right after upload), this id drives the query key + fetch so React Query
 * does not refetch a stale `preferredJobId` before the next render reads localStorage.
 * @param strictPreferredJob When true, never fetch "latest" jobs without a concrete job id (e.g. /clips page load).
 */
export function useClips(activeJobId?: string | null, uploadOnly = false, strictPreferredJob = false): UseClipsResult {
  const { projectId, preferredJobId } = readStorageKeys();
  /** /clips (strict): only the in-memory job id — never fall back to persisted id (avoids wrong job + old clips). */
  const effectiveJobId = strictPreferredJob ? (activeJobId ?? null) : (activeJobId ?? preferredJobId);
  const processingPollCountsRef = useRef<Record<string, number>>({});

  const { data, isLoading } = useQuery({
    queryKey: ["clips", projectId, effectiveJobId, uploadOnly ? "upload-only" : "all", strictPreferredJob ? "strict" : "loose"],
    queryFn: async () => {
      console.log("[clipper][useClips] query", {
        projectId,
        preferredJobId,
        activeJobId: activeJobId ?? null,
        effectiveJobId: effectiveJobId ?? null,
      });
      if (strictPreferredJob && !effectiveJobId) {
        console.log("[clipper][useClips] strict mode: no job id, skip fetch");
        return {
          clips: [],
          sourceName: "",
          isDemo: false,
          latestJobStatus: null,
          latestJobError: null,
        };
      }
      const state = await fetchClipperState(projectId, effectiveJobId, {
        cacheBuster: Date.now(),
        uploadOnly,
      });
      const latestJob = state.latestJob;
      console.log("[clipper][useClips] latest job", {
        jobId: latestJob?.id ?? null,
        status: latestJob?.status ?? null,
        source_url: latestJob?.source_url ?? null,
        source_filename: latestJob?.source_filename ?? null,
      });
      const st = latestJob?.status;
      const currentJobId = latestJob?.id ?? effectiveJobId ?? null;
      if (currentJobId) {
        if (st === "processing") {
          const nextCount = (processingPollCountsRef.current[currentJobId] ?? 0) + 1;
          processingPollCountsRef.current[currentJobId] = nextCount;
        } else {
          processingPollCountsRef.current[currentJobId] = 0;
        }
      }
      if (st === "queued" || st === "processing") {
        console.log("[clipper] polling job status", { job_id: latestJob?.id ?? null, status: st });
      }
      let mappedClips: Clip[] = state.clips
        .filter((clip) => !effectiveJobId || clip.job_id === effectiveJobId)
        .map((clip, idx) => {
        // Prefer direct clip URL, but fall back to clip_exports.download_url for Vizard flows.
        // This keeps cards playable even when provider writes URL only to exports row.
        const exportDownloadUrl = state.latestExportsByClipId[clip.id]?.download_url ?? null;
        const playableUrl = clip.video_url ?? exportDownloadUrl;
        return {
          id: clip.id,
          job_id: clip.job_id,
          clip_index: idx,
          start_time: clip.start_time_sec,
          end_time: clip.end_time_sec,
          score: clip.score,
          caption: clip.caption ?? "",
          thumbnail_url: clip.thumbnail_url ?? "",
          video_url: playableUrl ?? null,
          status: clip.status === "ready" || clip.status === "exported" ? "ready" : "timestamps",
          /** Do not attach source YouTube id when we have a rendered MP4 — ensures <video src={video_url}> is used. */
          youtube_video_id: playableUrl ? null : (latestJob?.youtube_video_id ?? null),
        };
      });
      if ((latestJob?.status ?? null) === "completed" && mappedClips.length === 0 && effectiveJobId) {
        console.log("[clipper][useClips] completed with empty clips; immediate refetch for same job", {
          projectId,
          effectiveJobId,
        });
        const retryState = await fetchClipperState(projectId, effectiveJobId, {
          cacheBuster: Date.now(),
          uploadOnly,
        });
        const retryLatestJob = retryState.latestJob;
        mappedClips = retryState.clips
          .filter((clip) => !effectiveJobId || clip.job_id === effectiveJobId)
          .map((clip, idx) => {
          const exportDownloadUrl = retryState.latestExportsByClipId[clip.id]?.download_url ?? null;
          const playableUrl = clip.video_url ?? exportDownloadUrl;
          return {
            id: clip.id,
            job_id: clip.job_id,
            clip_index: idx,
            start_time: clip.start_time_sec,
            end_time: clip.end_time_sec,
            score: clip.score,
            caption: clip.caption ?? "",
            thumbnail_url: clip.thumbnail_url ?? "",
            video_url: playableUrl ?? null,
            status: clip.status === "ready" || clip.status === "exported" ? "ready" : "timestamps",
            youtube_video_id: playableUrl ? null : (retryLatestJob?.youtube_video_id ?? null),
          };
        });
      }
      const processingPollCount = currentJobId ? (processingPollCountsRef.current[currentJobId] ?? 0) : 0;
      if ((latestJob?.status ?? null) === "processing" && mappedClips.length === 0 && currentJobId && processingPollCount > 5) {
        const direct = await fetchVideoClipsByJobIdFresh(currentJobId, { cacheBuster: Date.now() });
        mappedClips = direct
          .filter((clip) => !effectiveJobId || clip.job_id === effectiveJobId)
          .map((clip, idx) => ({
          id: clip.id,
          job_id: clip.job_id,
          clip_index: idx,
          start_time: clip.start_time_sec,
          end_time: clip.end_time_sec,
          score: clip.score,
          caption: clip.caption ?? "",
          thumbnail_url: clip.thumbnail_url ?? "",
          video_url: clip.video_url ?? null,
          status: clip.status === "ready" || clip.status === "exported" ? "ready" : "timestamps",
          youtube_video_id: clip.video_url ? null : (latestJob?.youtube_video_id ?? null),
        }));
        console.log("[clipper][useClips] direct job clip fetch fallback", {
          jobId: currentJobId,
          processingPollCount,
          directClipCount: mappedClips.length,
        });
      }
      console.log("[clipper][useClips] mapped clips count", {
        mappedCount: mappedClips.length,
        activeJobId: activeJobId ?? null,
      });
      console.log("[clipper][useClips] poll result", {
        jobId: latestJob?.id ?? null,
        status: latestJob?.status ?? null,
        clipsLength: mappedClips.length,
      });
      console.log(
        "[clipper][useClips] clip rows returned",
        mappedClips.map((clip) => ({
          id: clip.id,
          job_id: clip.job_id,
          clip_index: clip.clip_index,
          video_url: clip.video_url ?? null,
          youtube_video_id: clip.youtube_video_id ?? null,
        })),
      );

      const sourceName = truncateTitle(
        latestJob?.source_filename?.trim() ||
          latestJob?.source_url?.trim() ||
          localStorage.getItem(`alize_clips_source_url_${projectId}`)?.trim() ||
          "",
      );

      if (mappedClips.length > 0) {
        console.log("[clipper] clips fetched", {
          project_id: projectId,
          job_id: latestJob?.id ?? null,
          clip_count: mappedClips.length,
          status: latestJob?.status ?? null,
        });
      }

      return {
        clips: mappedClips,
        sourceName,
        isDemo: false,
        latestJobStatus: latestJob?.status ?? null,
        latestJobError: latestJob?.error_message ?? null,
      };
    },
    refetchInterval: (q) => {
      if (strictPreferredJob && !effectiveJobId) return false;
      const d = q.state.data;
      const st = d?.latestJobStatus;
      const clipCount = d?.clips?.length ?? 0;
      if (effectiveJobId) {
        if (st === "failed") return false;
        if (st === "completed" && clipCount > 0) return false;
        return 2000;
      }
      if (st === "failed") return false;
      if (st === "completed" && clipCount > 0) return false;
      if (st === "queued" || st === "processing" || st === "completed") return 2000;
      return false;
    },
    refetchIntervalInBackground: true,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
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
    latestJobStatus: data?.latestJobStatus ?? null,
    latestJobError: data?.latestJobError ?? null,
  };
}
