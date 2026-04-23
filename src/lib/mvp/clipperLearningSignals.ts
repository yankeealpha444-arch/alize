export type LearningSignalAction = "play_clicked" | "use_clicked" | "thumbnail_selected" | "thumbnail_confirmed";
export type LearningSignal = {
  clip_id: string;
  thumbnail_variant: "A" | "B" | "C" | null;
  action_type: LearningSignalAction;
  timestamp: number;
};

export function signalsKey(projectId: string) {
  return `alize_clipper_signals_${projectId}`;
}

export function loadSignals(projectId: string): LearningSignal[] {
  try {
    const raw = localStorage.getItem(signalsKey(projectId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((s) => s as Partial<LearningSignal>)
      .filter((s) => typeof s.clip_id === "string" && typeof s.action_type === "string" && typeof s.timestamp === "number")
      .map((s) => ({
        clip_id: String(s.clip_id),
        action_type: s.action_type as LearningSignalAction,
        thumbnail_variant: (s.thumbnail_variant as "A" | "B" | "C" | null) ?? null,
        timestamp: Number(s.timestamp),
      }));
  } catch {
    return [];
  }
}

export function saveSignals(projectId: string, signals: LearningSignal[]) {
  const capped = signals.slice(-500);
  localStorage.setItem(signalsKey(projectId), JSON.stringify(capped));
}
