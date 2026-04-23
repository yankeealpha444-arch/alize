/**
 * Minimal learning signals from selections and refinements (local only).
 */

const KEY = "alize_hook_learning_v1";

type LearningAgg = {
  selectionsByAngle: Record<string, number>;
  refinementsByKind: Record<string, number>;
};

function load(): LearningAgg {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{"selectionsByAngle":{},"refinementsByKind":{}}');
  } catch {
    return { selectionsByAngle: {}, refinementsByKind: {} };
  }
}

function save(data: LearningAgg): void {
  localStorage.setItem(KEY, JSON.stringify(data));
}

export function recordHookAngleSelected(angle: string): void {
  const d = load();
  d.selectionsByAngle[angle] = (d.selectionsByAngle[angle] ?? 0) + 1;
  save(d);
}

export function recordRefinement(kind: string): void {
  const d = load();
  d.refinementsByKind[kind] = (d.refinementsByKind[kind] ?? 0) + 1;
  save(d);
}

export function getLearningSnapshot(): LearningAgg {
  return load();
}
