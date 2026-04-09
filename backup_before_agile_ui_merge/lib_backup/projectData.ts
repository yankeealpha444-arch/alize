export type MvpCustomizations = {
  headline: string;
  subtitle: string;
  ctaText: string;
  pricingCopy: string;
  showTestimonials: boolean;
};

const DEFAULT_CUSTOMIZATIONS: MvpCustomizations = {
  headline: "",
  subtitle: "",
  ctaText: "",
  pricingCopy: "",
  showTestimonials: false,
};

function key(projectId: string) {
  return `alize_mvp_customizations:${projectId || "default"}`;
}

export function getMvpCustomizations(projectId = "default"): MvpCustomizations {
  try {
    const raw = localStorage.getItem(key(projectId));
    if (!raw) return { ...DEFAULT_CUSTOMIZATIONS };
    const parsed = JSON.parse(raw) as Partial<MvpCustomizations>;
    return { ...DEFAULT_CUSTOMIZATIONS, ...parsed };
  } catch {
    return { ...DEFAULT_CUSTOMIZATIONS };
  }
}

export function updateMvpCustomizations(update: Partial<MvpCustomizations>, projectId = "default") {
  const current = getMvpCustomizations(projectId);
  const next = { ...current, ...update };
  localStorage.setItem(key(projectId), JSON.stringify(next));
}

// The reference app records versions, feedback, and emails. We keep no-crash stubs
// so Builder-style UI works even without the full data layer.
export function addVersion(_message: string, _source: string, _projectId = "default") {}
export function addEmailCapture(_email: string, _projectId = "default") {}
export function addFeedback(_payload: unknown, _projectId = "default") {}

