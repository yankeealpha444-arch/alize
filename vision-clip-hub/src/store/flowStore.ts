import { useMemo, useSyncExternalStore } from "react";
import type { Clip } from "@/data/demoClips";
import type { VideoMvpClipSnapshot } from "../../../src/lib/videoMvpProject";
import {
  clearVideoMvpClipAndThumbnail,
  getVideoMvpProject,
} from "../../../src/lib/videoMvpProject";

export interface SelectedThumbnail {
  id: string;
  name: string;
  src: string;
  score: number;
}

export interface ActiveTest {
  clip: Clip;
  thumbnail: SelectedThumbnail | null;
  startedAt: number;
  visitors: number;
  copies: number;
  trackingUrl?: string;
  trackingStartedAt?: number;
}

interface FlowState {
  sourceInput: string;
  selectedClip: Clip | null;
  selectedClipLabel: string | null;
  selectedThumbnail: SelectedThumbnail | null;
  activeTest: ActiveTest | null;
  completedTests: ActiveTest[];
}

let state: FlowState = {
  sourceInput: "",
  selectedClip: null,
  selectedClipLabel: null,
  selectedThumbnail: null,
  activeTest: null,
  completedTests: [],
};

const listeners = new Set<() => void>();

/** Bumped on every emit so `useSyncExternalStore` sees a new snapshot (mutable `state` object alone is not reliable). */
let storeRevision = 0;

/** DevTools / DOM: read current revision after `emit` (same module as `useFlow`). */
export function getFlowStoreRevision(): number {
  return storeRevision;
}

function emit() {
  storeRevision += 1;
  listeners.forEach((l) => l());
}

function snapshotToClip(s: VideoMvpClipSnapshot): Clip {
  return {
    id: s.id,
    job_id: s.job_id,
    clip_index: s.clip_index,
    start_time: s.start_time,
    end_time: s.end_time,
    score: s.score,
    caption: s.caption,
    thumbnail_url: s.thumbnail_url,
    video_url: s.video_url,
    status: s.status,
    youtube_video_id: s.youtube_video_id ?? null,
  };
}

/** Load clip + thumbnail from `VideoMvpProject` localStorage into in-memory flow (reload / dashboard). */
export function syncFlowStoreFromVideoMvpProject(projectId: string): void {
  const p = getVideoMvpProject(projectId);
  if (!p) return;
  const clip = p.selected_clip_snapshot ? snapshotToClip(p.selected_clip_snapshot) : null;
  const label = !clip
    ? null
    : (p.selected_clip?.label?.trim() || clip.caption.split("·")[0]?.trim() || "Selected clip");
  let thumb: SelectedThumbnail | null = null;
  if (p.selected_thumbnail) {
    thumb = {
      id: p.selected_thumbnail.id,
      name: p.selected_thumbnail.name,
      src: p.selected_thumbnail.preview_url,
      score: p.selected_thumbnail.score,
    };
  }
  state = {
    ...state,
    selectedClip: clip,
    selectedClipLabel: label,
    selectedThumbnail: thumb,
  };
  emit();
}

export const flowStore = {
  get: () => state,
  subscribe: (l: () => void) => {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  setSource: (v: string) => {
    state = { ...state, sourceInput: v };
    emit();
  },
  selectClip: (clip: Clip, label?: string) => {
    if (import.meta.env.DEV) {
      console.log("[mvp-flow] flowStore.selectClip", { clipId: clip?.id, label });
    }
    state = { ...state, selectedClip: clip, selectedClipLabel: label ?? state.selectedClipLabel };
    emit();
  },
  selectThumbnail: (thumb: SelectedThumbnail) => {
    if (import.meta.env.DEV) {
      console.log("[mvp-flow] flowStore.selectThumbnail", { id: thumb.id, name: thumb.name });
    }
    state = { ...state, selectedThumbnail: thumb };
    emit();
  },
  startTest: () => {
    if (!state.selectedClip) return;
    const test: ActiveTest = {
      clip: state.selectedClip,
      thumbnail: state.selectedThumbnail,
      startedAt: Date.now(),
      visitors: 0,
      copies: 0,
    };
    state = { ...state, activeTest: test };
    emit();
  },
  startTracking: (url: string) => {
    if (!state.activeTest) {
      // allow tracking even if startTest wasn't called
      if (!state.selectedClip) return;
      state = {
        ...state,
        activeTest: {
          clip: state.selectedClip,
          thumbnail: state.selectedThumbnail,
          startedAt: Date.now(),
          visitors: 0,
          copies: 0,
          trackingUrl: url,
          trackingStartedAt: Date.now(),
        },
      };
    } else {
      state = {
        ...state,
        activeTest: {
          ...state.activeTest,
          trackingUrl: url,
          trackingStartedAt: Date.now(),
        },
      };
    }
    emit();
  },
  /** Clears persisted clip/thumbnail and in-memory selection (e.g. “Run another test” before tracking starts). */
  endTest: () => {
    try {
      const pid = localStorage.getItem("alize_projectId");
      if (pid) clearVideoMvpClipAndThumbnail(pid);
    } catch {
      /* ignore */
    }
    const finished = state.activeTest;
    state = {
      ...state,
      sourceInput: "",
      completedTests: finished ? [...state.completedTests, finished] : state.completedTests,
      activeTest: null,
      selectedClip: null,
      selectedClipLabel: null,
      selectedThumbnail: null,
    };
    emit();
  },
};

/**
 * `getSnapshot` must change when the store updates. We use `storeRevision` (primitive) because
 * `flowStore.get()` returns the same object identity pattern React may skip; revision always increments on `emit`.
 */
export function useFlow(): FlowState {
  const revision = useSyncExternalStore(
    flowStore.subscribe,
    () => storeRevision,
    () => storeRevision,
  );
  return useMemo(() => flowStore.get(), [revision]);
}
