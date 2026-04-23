import { TEMPLATE_HOOK_GENERATOR } from "@/lib/internalTemplates";

export type TemplateEventType =
  | "template_viewed"
  | "template_started"
  | "template_generated"
  | "output_selected"
  | "output_refined"
  | "output_copied"
  | "feedback_submitted"
  | "template_completed";

export interface TemplateEventRow {
  templateId: string;
  type: TemplateEventType;
  projectId?: string;
  label?: string;
  timestamp: string;
  sessionId: string;
}

const EVENTS_KEY = "alize_template_events";
const METRICS_KEY = "alize_template_metrics_v1";

function sessionId(): string {
  let sid = sessionStorage.getItem("alize_session");
  if (!sid) {
    sid = Math.random().toString(36).slice(2, 10);
    sessionStorage.setItem("alize_session", sid);
  }
  return sid;
}

export function trackTemplateEvent(
  type: TemplateEventType,
  templateId: string = TEMPLATE_HOOK_GENERATOR.template_id,
  projectId?: string,
  label?: string,
): void {
  try {
    const row: TemplateEventRow = {
      templateId,
      type,
      projectId,
      label,
      timestamp: new Date().toISOString(),
      sessionId: sessionId(),
    };
    const raw = localStorage.getItem(EVENTS_KEY);
    const list: TemplateEventRow[] = raw ? JSON.parse(raw) : [];
    list.push(row);
    localStorage.setItem(EVENTS_KEY, JSON.stringify(list.slice(-5000)));

    const mRaw = localStorage.getItem(METRICS_KEY);
    const m: Record<string, Record<string, number>> = mRaw ? JSON.parse(mRaw) : {};
    const tid = templateId;
    if (!m[tid]) m[tid] = {};
    m[tid][type] = (m[tid][type] ?? 0) + 1;
    localStorage.setItem(METRICS_KEY, JSON.stringify(m));

    window.dispatchEvent(new CustomEvent("alize-template-tracking-updated"));
  } catch {
    /* ignore */
  }
}

export function getTemplateEvents(): TemplateEventRow[] {
  try {
    return JSON.parse(localStorage.getItem(EVENTS_KEY) || "[]");
  } catch {
    return [];
  }
}

export function getTemplateMetrics(templateId: string = TEMPLATE_HOOK_GENERATOR.template_id): Record<string, number> {
  try {
    const m: Record<string, Record<string, number>> = JSON.parse(localStorage.getItem(METRICS_KEY) || "{}");
    return m[templateId] || {};
  } catch {
    return {};
  }
}

export function feedbackCounts(templateId: string = TEMPLATE_HOOK_GENERATOR.template_id): { yes: number; no: number } {
  const events = getTemplateEvents().filter((e) => e.templateId === templateId && e.type === "feedback_submitted");
  let yes = 0;
  let no = 0;
  for (const e of events) {
    if (e.label === "yes") yes++;
    else if (e.label === "no") no++;
  }
  return { yes, no };
}

/** Counts per refinement option from output_refined event labels (canonical + legacy kind names). */
export function refinementChoiceCounts(
  templateId: string = TEMPLATE_HOOK_GENERATOR.template_id,
): Record<"more_curiosity" | "more_aggressive" | "shorter" | "more_emotional", number> {
  const out = {
    more_curiosity: 0,
    more_aggressive: 0,
    shorter: 0,
    more_emotional: 0,
  };
  const legacy: Record<string, keyof typeof out> = {
    curiosity: "more_curiosity",
    aggressive: "more_aggressive",
    shorter: "shorter",
    emotional: "more_emotional",
    more_curiosity: "more_curiosity",
    more_aggressive: "more_aggressive",
    more_emotional: "more_emotional",
  };
  for (const e of getTemplateEvents()) {
    if (e.templateId !== templateId || e.type !== "output_refined" || !e.label) continue;
    const bucket = legacy[e.label];
    if (bucket) out[bucket]++;
  }
  return out;
}
