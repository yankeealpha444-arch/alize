import type { MvpBuilderConfig } from "@/lib/mvp/types";
import type { ProductFrame } from "@/lib/mvp/productFraming";
import { assessIdeaContentSafety, sanitizeIdeaForPersistence } from "@/lib/mvp/ideaContentSafety";
import type { IdeaSafetyCategory } from "@/lib/mvp/ideaContentSafety";

export type { ProductFrame } from "@/lib/mvp/productFraming";
import { supabase } from "@/integrations/supabase/client";

/** Result of persisting an idea after content safety (see `setMvpIdea`). */
export type SetMvpIdeaResult =
  | { ideaUsed: string; blocked?: false }
  | { ideaUsed: string; blocked: true; message: string; category: IdeaSafetyCategory };

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

/** Hook Generator (single template) — persisted per project. */
export interface HookGeneratorProductState {
  niche: string;
  audience: string;
  hooks: Array<{ id: string; angle: string; text: string }>;
  selectedHookId: string | null;
  refinedHookText: string;
  feedbackHelpful: boolean | null;
  lastGeneratedAt: string | null;
}

/** Saved state for growth_tool user app (/app/:projectId). */
export interface GrowthProductState {
  channelName: string;
  platform: "youtube" | "tiktok" | "instagram" | "other";
  goal: "views" | "subscribers" | "monetization" | "engagement";
  contentIdeas: string[];
  weeklyPlan: Array<{ day: string; focus: string }>;
  experiments: string[];
  lastGeneratedAt: string | null;
  uploadType?: "link" | "file";
  videoLink?: string;
  uploadedFileName?: string;
  hookOptions?: Array<{
    id: string;
    startSec: number;
    endSec: number;
    style: "Pain point" | "Curiosity" | "Transformation" | "Urgency" | "Authority";
    hookLine: string;
    whyItWorks: string;
  }>;
  selectedHookId?: string | null;
  videoTitle?: string | null;
  videoAuthor?: string | null;
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
  /** Idea text stored with the project (for /app without relying on localStorage). */
  mvpIdea?: string;
  /** growth_tool: user workspace data */
  growthState?: GrowthProductState;
  /** Unified Hook Generator template state */
  hookGeneratorState?: HookGeneratorProductState;
  /** Internal: niche/audience derived from idea (not shown as explicit UI) */
  ideaContext?: { niche: string; audience: string };
  /** MVP Builder: which fixed template + label config */
  mvpBuilder?: MvpBuilderConfig;
  /** Archetype + product framing (Lovable-style product shell). */
  productFrame?: ProductFrame;
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
  mvpIdea: undefined,
  growthState: undefined,
  hookGeneratorState: undefined,
  ideaContext: undefined,
  mvpBuilder: undefined,
  productFrame: undefined,
};

function storageKey(projectId: string): string {
  return `${KEY_PREFIX}${projectId}`;
}

/** Normalize persisted idea fields when rules expand or legacy rows had unsafe text. */
function patchSanitizedIdeaFields(d: ProjectData): boolean {
  let changed = false;
  if (d.mvpIdea?.trim()) {
    const safe = sanitizeIdeaForPersistence(d.mvpIdea);
    if (safe && safe !== d.mvpIdea) {
      d.mvpIdea = safe;
      changed = true;
    }
  }
  if (d.mvpBuilder?.productName) {
    const pn = sanitizeIdeaForPersistence(d.mvpBuilder.productName);
    if (pn && pn !== d.mvpBuilder.productName) {
      d.mvpBuilder = { ...d.mvpBuilder, productName: pn };
      changed = true;
    }
  }
  return changed;
}

export function getProjectData(projectId: string = "default"): ProjectData {
  try {
    // Try project-specific key first, then legacy fallback
    let raw = localStorage.getItem(storageKey(projectId));
    if (!raw && projectId === "default") {
      raw = localStorage.getItem(LEGACY_KEY);
    }
    if (!raw) return { ...defaults, versions: [...defaults.versions] };
    const d: ProjectData = { ...defaults, ...JSON.parse(raw) };
    patchSanitizedIdeaFields(d);
    return d;
  } catch {
    return { ...defaults, versions: [...defaults.versions] };
  }
}

/**
 * Single source for preview / hook UI: canonical saved idea, then LS when it matches this project, then optional seed.
 * Always returns text safe for display (never raw blocked input).
 */
export function getSanitizedIdeaForDisplay(projectId: string, ideaSeed?: string): string {
  const fromProject = getProjectData(projectId).mvpIdea?.trim() || "";
  let legacy = "";
  let pidMatches = false;
  try {
    legacy = localStorage.getItem("alize_idea")?.trim() || "";
    pidMatches = localStorage.getItem("alize_projectId") === projectId;
  } catch {
    /* ignore */
  }
  const prop = ideaSeed?.trim() || "";
  const ignoreProp = prop === "Loading..." || prop === "";

  const raw = fromProject || (pidMatches ? legacy : "") || legacy || (!ignoreProp ? prop : "");
  if (!raw) return "No idea found yet";
  return sanitizeIdeaForPersistence(raw) || "No idea found yet";
}

export function saveProjectData(data: ProjectData, projectId: string = "default") {
  localStorage.setItem(storageKey(projectId), JSON.stringify(data));
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("alize-project-data-updated", { detail: { projectId } }));
  }
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

export function rollbackToVersion(version: number, projectId: string = "default"): boolean {
  const d = getProjectData(projectId);
  const target = d.versions.find((v) => v.version === version);
  if (!target?.snapshot) return false;
  d.mvpCustomizations = { ...target.snapshot };
  saveProjectData(d, projectId);
  addVersion(`Rollback to V${version}`, "Versions", projectId);
  return true;
}

export function emptyGrowthState(): GrowthProductState {
  return {
    channelName: "",
    platform: "youtube",
    goal: "views",
    contentIdeas: [],
    weeklyPlan: [],
    experiments: [],
    lastGeneratedAt: null,
    uploadType: "link",
    videoLink: "",
    uploadedFileName: "",
    hookOptions: [],
    selectedHookId: null,
    videoTitle: null,
    videoAuthor: null,
  };
}

export function getGrowthState(projectId: string): GrowthProductState {
  const d = getProjectData(projectId);
  return d.growthState ? { ...emptyGrowthState(), ...d.growthState } : emptyGrowthState();
}

export function saveGrowthState(state: GrowthProductState, projectId: string) {
  const d = getProjectData(projectId);
  d.growthState = state;
  saveProjectData(d, projectId);
}

export function setMvpIdea(idea: string, projectId: string): SetMvpIdeaResult {
  const trimmed = idea.trim();
  if (!trimmed) {
    return { ideaUsed: "", blocked: false };
  }

  const safety = assessIdeaContentSafety(trimmed);
  const persisted = safety.blocked ? safety.safeAlternative : trimmed;
  const d = getProjectData(projectId);
  const changed = d.mvpIdea !== persisted;
  if (changed) {
    d.mvpIdea = persisted;
    saveProjectData(d, projectId);
    void upsertProjectRecord(projectId, persisted);
  }
  if (safety.blocked) {
    console.warn("[projectData] Idea blocked for safety; stored alternative only.", safety.category);
    return {
      ideaUsed: persisted,
      blocked: true,
      message: safety.userMessage,
      category: safety.category,
    };
  }
  return { ideaUsed: persisted, blocked: false };
}

export function getProductFrame(projectId: string): ProductFrame | undefined {
  return getProjectData(projectId).productFrame;
}

export function setProductFrame(frame: ProductFrame, projectId: string) {
  const d = getProjectData(projectId);
  const pn = sanitizeIdeaForPersistence(frame.product_name);
  const op = sanitizeIdeaForPersistence(frame.one_line_promise);
  const tu = sanitizeIdeaForPersistence(frame.target_user);
  const co = sanitizeIdeaForPersistence(frame.core_outcome);
  const next: ProductFrame = {
    ...frame,
    product_name: pn || "Product",
    one_line_promise: op || "—",
    target_user: tu || "Your ideal customer",
    core_outcome: co || "—",
  };
  const prev = d.productFrame;
  if (
    prev &&
    prev.product_name === next.product_name &&
    prev.one_line_promise === next.one_line_promise &&
    prev.target_user === next.target_user &&
    prev.core_outcome === next.core_outcome &&
    prev.archetype === next.archetype
  ) {
    return;
  }
  d.productFrame = next;
  saveProjectData(d, projectId);
}

/**
 * Founder-flow Supabase sync (additive to localStorage):
 * keeps one canonical project row for cross-device public pages.
 *
 * Production writes: PostgREST `POST/PATCH` → `public.projects` (see migration
 * `supabase/migrations/20260414120000_projects_idea_safety.sql`). The DB trigger
 * re-sanitizes idea text, rejects null/empty ideas, sets `user_id`/`is_anonymous_draft`
 * from `auth.uid()`, and keeps `name` derived from sanitized `idea` only.
 * This function also runs `sanitizeIdeaForPersistence` so direct callers cannot bypass UI.
 */
export async function upsertProjectRecord(projectId: string, idea: string): Promise<void> {
  const pid = String(projectId || "").trim();
  const safeIdea = sanitizeIdeaForPersistence(String(idea ?? ""));
  if (!pid || !safeIdea) return;
  try {
    const sb = supabase as unknown as {
      from: (table: string) => {
        upsert: (
          row: Record<string, unknown>,
          opts: { onConflict: string }
        ) => Promise<{ error: { message?: string } | null }>;
      };
    };
    const { error } = await sb.from("projects").upsert(
      {
        id: pid,
        idea: safeIdea,
        name: safeIdea.slice(0, 80),
        status: "active",
      },
      { onConflict: "id" },
    );
    if (error) {
      console.error("[projectData] upsertProjectRecord failed:", error.message || error);
    }
  } catch (err) {
    console.error("[projectData] upsertProjectRecord exception:", err);
  }
}

export function emptyHookGeneratorState(): HookGeneratorProductState {
  return {
    niche: "",
    audience: "",
    hooks: [],
    selectedHookId: null,
    refinedHookText: "",
    feedbackHelpful: null,
    lastGeneratedAt: null,
  };
}

export function getHookGeneratorState(projectId: string): HookGeneratorProductState {
  const d = getProjectData(projectId);
  return d.hookGeneratorState ? { ...emptyHookGeneratorState(), ...d.hookGeneratorState } : emptyHookGeneratorState();
}

export function saveHookGeneratorState(state: HookGeneratorProductState, projectId: string) {
  const d = getProjectData(projectId);
  d.hookGeneratorState = state;
  saveProjectData(d, projectId);
}

export function setIdeaContext(niche: string, audience: string, projectId: string) {
  const d = getProjectData(projectId);
  d.ideaContext = {
    niche: sanitizeIdeaForPersistence(niche),
    audience: sanitizeIdeaForPersistence(audience),
  };
  saveProjectData(d, projectId);
}

export function saveMvpBuilderConfig(config: MvpBuilderConfig, projectId: string) {
  const d = getProjectData(projectId);
  const pn = sanitizeIdeaForPersistence(config.productName);
  d.mvpBuilder = {
    ...config,
    productName: pn || "My MVP",
  };
  saveProjectData(d, projectId);
}

export function getMvpBuilderConfig(projectId: string): MvpBuilderConfig | undefined {
  return getProjectData(projectId).mvpBuilder;
}
