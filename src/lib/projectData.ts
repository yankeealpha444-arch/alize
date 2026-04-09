// Persistent project data layer using localStorage
// All founder actions save here; dashboard reads from here
// Now supports multiple projects via projectId-scoped keys

const KEY_PREFIX = "alize_project_";
const LEGACY_KEY = "alize_project_data";

export interface SurveyResponse {
  answers: Record<number, string>;
  timestamp: string;
}

export interface EmailCapture {
  email: string;
  timestamp: string;
}

export interface FeedbackEntry {
  emoji?: string;
  rating?: number;
  comment?: string;
  timestamp: string;
}

export interface MvpSnapshot {
  headline: string;
  subtitle: string;
  ctaText: string;
  pricingCopy: string;
  showTestimonials: boolean;
  heroTone: string;
}

export interface VersionEntry {
  version: number;
  changes: string;
  date: string;
  source: string;
  snapshot?: MvpSnapshot;
}

export interface MvpCustomizations {
  headline: string;
  subtitle: string;
  ctaText: string;
  heroTone: string;
  pricingCopy: string;
  showTestimonials: boolean;
}

export interface ProjectData {
  surveys: SurveyResponse[];
  emails: EmailCapture[];
  feedback: FeedbackEntry[];
  versions: VersionEntry[];
  mvpCustomizations: MvpCustomizations;
  publishedAt: string | null;
  /** User-initiated share / outreach actions (Get Users page). */
  shareOutreachCount?: number;
}

const defaults: ProjectData = {
  surveys: [],
  emails: [],
  feedback: [],
  versions: [
    { version: 1, changes: "Initial MVP generated", date: new Date().toISOString().slice(0, 10), source: "System" },
  ],
  mvpCustomizations: {
    headline: "",
    subtitle: "",
    ctaText: "",
    heroTone: "",
    pricingCopy: "",
    showTestimonials: false,
  },
  publishedAt: null,
  shareOutreachCount: 0,
};

function storageKey(projectId: string): string {
  return `${KEY_PREFIX}${projectId}`;
}

export function getProjectData(projectId: string = "default"): ProjectData {
  try {
    // Try project-specific key first, then legacy fallback
    let raw = localStorage.getItem(storageKey(projectId));
    if (!raw && projectId === "default") {
      raw = localStorage.getItem(LEGACY_KEY);
    }
    if (!raw) return { ...defaults, versions: [...defaults.versions] };
    return { ...defaults, ...JSON.parse(raw) };
  } catch {
    return { ...defaults, versions: [...defaults.versions] };
  }
}

export function saveProjectData(data: ProjectData, projectId: string = "default") {
  localStorage.setItem(storageKey(projectId), JSON.stringify(data));
}

export function addSurveyResponse(answers: Record<number, string>, projectId: string = "default") {
  const d = getProjectData(projectId);
  d.surveys.push({ answers, timestamp: new Date().toISOString() });
  saveProjectData(d, projectId);
}

export function addEmailCapture(email: string, projectId: string = "default") {
  const d = getProjectData(projectId);
  if (d.emails.some((e) => e.email === email)) return;
  d.emails.push({ email, timestamp: new Date().toISOString() });
  saveProjectData(d, projectId);
}

export function addFeedback(entry: Omit<FeedbackEntry, "timestamp">, projectId: string = "default") {
  const d = getProjectData(projectId);
  d.feedback.push({ ...entry, timestamp: new Date().toISOString() });
  saveProjectData(d, projectId);
}

export function addVersion(changes: string, source: string, projectId: string = "default") {
  const d = getProjectData(projectId);
  const nextV = d.versions.length > 0 ? Math.max(...d.versions.map((v) => v.version)) + 1 : 1;
  const snapshot: MvpSnapshot = { ...d.mvpCustomizations };
  d.versions.push({ version: nextV, changes, date: new Date().toISOString().slice(0, 10), source, snapshot });
  saveProjectData(d, projectId);
}

export interface VersionDiff {
  section: string;
  field: string;
  fieldKey: string;
  before: string;
  after: string;
  type: "changed" | "added" | "removed";
}

const fieldMeta: Record<string, { label: string; section: string }> = {
  headline: { label: "Headline", section: "Hero" },
  subtitle: { label: "Subtitle", section: "Hero" },
  ctaText: { label: "CTA Button", section: "Hero" },
  pricingCopy: { label: "Pricing Copy", section: "Pricing" },
  heroTone: { label: "Hero Tone", section: "Hero" },
  showTestimonials: { label: "Testimonials", section: "Social Proof" },
};

export function computeVersionDiffs(projectId: string = "default"): { diffs: VersionDiff[]; fromVersion: number; toVersion: number } {
  const d = getProjectData(projectId);
  const versions = d.versions;
  if (versions.length < 1) return { diffs: [], fromVersion: 0, toVersion: 0 };

  const currentSnapshot = d.mvpCustomizations;
  const lastPublished = [...versions].reverse().find(v => v.snapshot);
  const previousSnapshot: MvpSnapshot = lastPublished?.snapshot || {
    headline: "", subtitle: "", ctaText: "", pricingCopy: "", showTestimonials: false, heroTone: "",
  };

  const fromVersion = versions[versions.length - 1].version;
  const toVersion = fromVersion + 1;
  const diffs: VersionDiff[] = [];

  for (const [key, meta] of Object.entries(fieldMeta)) {
    const prev = String((previousSnapshot as any)[key] || "");
    const curr = String((currentSnapshot as any)[key] || "");
    if (prev !== curr) {
      let type: VersionDiff["type"] = "changed";
      if (!prev && curr) type = "added";
      else if (prev && !curr) type = "removed";
      diffs.push({
        section: meta.section,
        field: meta.label,
        fieldKey: key,
        before: prev || "(default)",
        after: curr || "(default)",
        type,
      });
    }
  }

  return { diffs, fromVersion, toVersion };
}

export function setPublished(projectId: string = "default") {
  const d = getProjectData(projectId);
  d.publishedAt = new Date().toISOString();
  saveProjectData(d, projectId);
}

export function incrementShareOutreach(projectId: string = "default", delta: number = 1) {
  const d = getProjectData(projectId);
  d.shareOutreachCount = (d.shareOutreachCount ?? 0) + delta;
  saveProjectData(d, projectId);
}

export function updateMvpCustomizations(updates: Partial<MvpCustomizations>, projectId: string = "default") {
  const d = getProjectData(projectId);
  d.mvpCustomizations = { ...d.mvpCustomizations, ...updates };
  saveProjectData(d, projectId);
}

export function getMvpCustomizations(projectId: string = "default"): MvpCustomizations {
  return getProjectData(projectId).mvpCustomizations;
}
