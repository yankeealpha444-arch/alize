import { supabase } from "@/integrations/supabase/client";

export type MvpEventType =
  | "page_view"
  | "input_submitted"
  | "button_clicked"
  | "result_generated"
  | "card_clicked"
  | "workflow_step_completed"
  | "video_uploaded"
  | "idea_entered"
  | "generate_clicked"
  | "variation_viewed"
  | "variation_selected"
  | "version_saved"
  | "message_pasted"
  | "improve_clicked"
  | "version_viewed"
  | "version_selected"
  | "message_copied";

const BUFFER_KEY = "alize_mvp_events_v1";

export type MvpEventRow = {
  event_type: MvpEventType;
  project_id: string;
  meta: Record<string, unknown> | null;
  created_at: string;
};

function loadBuffer(): MvpEventRow[] {
  try {
    return JSON.parse(localStorage.getItem(BUFFER_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveBuffer(rows: MvpEventRow[]): void {
  localStorage.setItem(BUFFER_KEY, JSON.stringify(rows.slice(-8000)));
}

/**
 * Tracks MVP behaviour: always persisted locally; best-effort Supabase if `mvp_events` table exists.
 */
export function trackMvpEvent(event: MvpEventType, projectId: string, meta?: Record<string, unknown>): void {
  const row: MvpEventRow = {
    event_type: event,
    project_id: projectId,
    meta: meta ?? null,
    created_at: new Date().toISOString(),
  };
  const buf = loadBuffer();
  buf.push(row);
  saveBuffer(buf);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("alize-mvp-tracking-updated"));
  }

  void (async () => {
    try {
      const sb = supabase as unknown as { from: (t: string) => { insert: (r: unknown) => Promise<{ error: { message: string } | null }> } };
      const { error } = await sb.from("mvp_events").insert({
        event_type: row.event_type,
        project_id: row.project_id,
        meta: row.meta,
        created_at: row.created_at,
      });
      if (error) console.debug("[mvp_events]", error.message);
    } catch {
      /* table may not exist yet */
    }
  })();
}

export function getMvpEventsForProject(projectId: string): MvpEventRow[] {
  return loadBuffer().filter((e) => e.project_id === projectId);
}

const EVENT_COUNTS_ZERO: Record<MvpEventType, number> = {
  page_view: 0,
  input_submitted: 0,
  button_clicked: 0,
  result_generated: 0,
  card_clicked: 0,
  workflow_step_completed: 0,
  video_uploaded: 0,
  idea_entered: 0,
  generate_clicked: 0,
  variation_viewed: 0,
  variation_selected: 0,
  version_saved: 0,
  message_pasted: 0,
  improve_clicked: 0,
  version_viewed: 0,
  version_selected: 0,
  message_copied: 0,
};

export function countMvpEventsByType(projectId: string): Record<MvpEventType, number> {
  const counts = { ...EVENT_COUNTS_ZERO };
  for (const e of getMvpEventsForProject(projectId)) {
    counts[e.event_type] = (counts[e.event_type] ?? 0) + 1;
  }
  return counts;
}

export type MvpValidationStatus = "No Data" | "Testing" | "Some Interest" | "Strong Interest" | "Validated";

export function getMvpValidationStatus(projectId: string): MvpValidationStatus {
  const c = countMvpEventsByType(projectId);
  const engagement =
    c.button_clicked +
    c.card_clicked +
    c.result_generated +
    c.workflow_step_completed +
    c.generate_clicked +
    c.variation_selected +
    c.version_saved +
    c.message_pasted +
    c.improve_clicked +
    c.version_viewed +
    c.version_selected +
    c.message_copied;
  if (c.page_view === 0 && engagement === 0) return "No Data";
  if (engagement < 2) return "Testing";
  if (engagement < 8) return "Some Interest";
  if (engagement < 20) return "Strong Interest";
  return "Validated";
}
