export type TestStatus = "idle" | "running" | "complete";

export type SelectedClip = {
  label: string;
  score: number;
  multiplier: string;
  range: string;
  description: string;
};

export type MvpFlowState = {
  selectedClip: SelectedClip | null;
  copyCount: number;
  testStatus: TestStatus;
  visitors: number;
  /** Matches `localStorage.alize_projectId` and `/founder/:projectId` for this flow */
  mvpFlowProjectId: string | null;
  selectedThumbnailUrl: string | null;
};

const KEY = "alize_mvp_flow_state";

const DEFAULT_STATE: MvpFlowState = {
  selectedClip: null,
  copyCount: 0,
  testStatus: "idle",
  visitors: 0,
  mvpFlowProjectId: null,
  selectedThumbnailUrl: null,
};

/** Create or reuse a project id for founder routes and clip flow. */
export function ensureAlizeProjectId(): string {
  try {
    let id = localStorage.getItem("alize_projectId");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("alize_projectId", id);
    }
    return id;
  } catch {
    return "default";
  }
}

export function getMvpFlowState(): MvpFlowState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw) as Partial<MvpFlowState>;
    return {
      selectedClip: parsed.selectedClip ?? null,
      copyCount: typeof parsed.copyCount === "number" ? parsed.copyCount : 0,
      testStatus:
        parsed.testStatus === "running" || parsed.testStatus === "complete"
          ? parsed.testStatus
          : "idle",
      visitors: typeof parsed.visitors === "number" ? parsed.visitors : 0,
      mvpFlowProjectId: typeof parsed.mvpFlowProjectId === "string" ? parsed.mvpFlowProjectId : null,
      selectedThumbnailUrl: typeof parsed.selectedThumbnailUrl === "string" ? parsed.selectedThumbnailUrl : null,
    };
  } catch {
    return DEFAULT_STATE;
  }
}

export function setMvpFlowState(next: MvpFlowState) {
  localStorage.setItem(KEY, JSON.stringify(next));
}

export function patchMvpFlowState(patch: Partial<MvpFlowState>): MvpFlowState {
  const next = { ...getMvpFlowState(), ...patch };
  setMvpFlowState(next);
  return next;
}

