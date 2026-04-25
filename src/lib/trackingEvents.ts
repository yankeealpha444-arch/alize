import { supabase } from "@/integrations/supabase/client";

export type TrackingEventType =
  | "session_started"
  | "page_view"
  | "button_click"
  | "survey_completed"
  | "email_entered"
  | "account_created"
  | "file_uploaded"
  | "process_clicked"
  | "result_downloaded"
  | "feedback_submitted"
  | "chat_message"
  | "share"
  | "preorder"
  | "return_user"
  | "pricing_viewed"
  | "demo_viewed"
  | "item_viewed"
  | "item_clicked"
  | "save_clicked"
  | "buy_clicked"
  | "plan_generated"
  | "idea_clicked"
  | "experiment_clicked"
  | "video_uploaded"
  | "video_link_added"
  | "hooks_generated"
  | "hook_selected"
  | "hook_copied"
  | "hook_summary_downloaded"
  | "clip_selected"
  | "clip_copied"
  | "clip_result"
  | "ai_ceo_recommendation_viewed"
  | "ai_ceo_clip_selected"
  | "ai_ceo_clip_copied"
  | "ai_ceo_clip_result"
  | "play_clicked"
  | "use_clicked"
  | "download_clicked"
  | "thumbnail_selected"
  | "thumbnail_confirmed"
  | "upload_started"
  | "job_created"
  | "recommendation_viewed"
  | "ai_variant_recommended"
  | "next_thumbnail_generated"
  | "scale_candidate_flagged"
  | "result_feedback"
  | "ai_follow"
  | "completed_flow"
  | "distribute_clicked"
  | "competition_generated"
  | "competition_used"
  | "competition_clicked"
  | "link_submitted"
  | "processing_started"
  | "clips_generated"
  | "clip_played"
  | "clip_viewed"
  | "clip_downloaded"
  | "generation_failed"
  | "generation_started"
  | "clip_feedback_good"
  | "clip_feedback_bad"
  | "continue_to_results"
  | "results_started"
  | "outcome_selected"
  | "results_submitted"
  | "results_skipped"
  | "guidance_viewed"
  | "test_another_clip"
  | "try_another_video"
  | "pattern_learned"
  | "pattern_applied"
  | "upload_success"
  | "upload_failed"
  | "preview_rendered"
  | "ui_health_checked"
  | "cta_clicked"
  | "copy_clicked";

export interface TrackingEvent {
  type: TrackingEventType;
  label?: string;
  timestamp: string;
  sessionId: string;
}

const TRACKING_KEY_PREFIX = "alize_tracking_";

function metadataForEventsInsert(
  label: string | undefined,
  sessionId: string,
  extraMeta?: Record<string, unknown>,
): Record<string, unknown> {
  const raw: Record<string, unknown> = {
    ...(label !== undefined ? { label } : {}),
    sessionId,
    ...(extraMeta && typeof extraMeta === "object" ? extraMeta : {}),
  };

  try {
    const json = JSON.stringify(raw, (_k, v) => {
      if (typeof v === "bigint") return v.toString();
      if (Number.isNaN(v as number)) return null;
      return v;
    });
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return {
      label: label ?? null,
      sessionId,
      note: "metadata_serialization_fallback",
    };
  }
}

const TRACKED_EVENT_NAMES: ReadonlySet<string> = new Set([
  "page_view",
  "button_click",
  "survey_completed",
  "email_entered",
  "feedback_submitted",
  "share",
  "clip_selected",
  "clip_copied",
  "clip_result",
  "ai_ceo_recommendation_viewed",
  "ai_ceo_clip_selected",
  "ai_ceo_clip_copied",
  "play_clicked",
  "use_clicked",
  "download_clicked",
  "thumbnail_selected",
  "thumbnail_confirmed",
  "upload_started",
  "job_created",
  "recommendation_viewed",
  "ai_variant_recommended",
  "next_thumbnail_generated",
  "scale_candidate_flagged",
  "result_feedback",
  "ai_follow",
  "completed_flow",
  "distribute_clicked",
  "competition_generated",
  "competition_used",
  "competition_clicked",
  "link_submitted",
  "processing_started",
  "clips_generated",
  "clip_played",
  "clip_viewed",
  "clip_downloaded",
  "generation_failed",
  "generation_started",
  "clip_feedback_good",
  "clip_feedback_bad",
  "continue_to_results",
  "results_started",
  "outcome_selected",
  "results_submitted",
  "results_skipped",
  "guidance_viewed",
  "test_another_clip",
  "try_another_video",
  "pattern_learned",
  "pattern_applied",
  "upload_success",
  "upload_failed",
  "preview_rendered",
  "ui_health_checked",
  "cta_clicked",
  "copy_clicked",
  "ai_ceo_clip_result",
]);

function getSessionId(): string {
  let sid = sessionStorage.getItem("alize_session");
  if (!sid) {
    sid = Math.random().toString(36).slice(2, 10);
    sessionStorage.setItem("alize_session", sid);
  }
  return sid;
}

type ProjectIdResolution = {
  numericProjectId: number | null;
  projectIdText: string;
  usedUuidFallback: boolean;
};

function resolveProjectId(projectId: string | number): ProjectIdResolution | null {
  const projectIdText = String(projectId).trim();
  if (!projectIdText) return null;
  if (typeof projectId === "number") {
    return {
      numericProjectId: Number.isFinite(projectId) ? projectId : null,
      projectIdText,
      usedUuidFallback: !Number.isFinite(projectId),
    };
  }
  const numericProjectId = Number(projectIdText);
  if (Number.isFinite(numericProjectId) && projectIdText === String(numericProjectId)) {
    return { numericProjectId, projectIdText, usedUuidFallback: false };
  }
  return { numericProjectId: null, projectIdText, usedUuidFallback: true };
}

/**
 * Persists to localStorage and best-effort Supabase `public.events`.
 */
export async function trackEvent(
  type: TrackingEventType,
  projectId: string | number = "default",
  label?: string,
  extraMeta?: Record<string, unknown>,
) {
  try {
    const event: TrackingEvent = {
      type,
      label,
      timestamp: new Date().toISOString(),
      sessionId: getSessionId(),
    };

    const key = `${TRACKING_KEY_PREFIX}${String(projectId)}`;
    const existing: TrackingEvent[] = JSON.parse(localStorage.getItem(key) || "[]");
    existing.push(event);
    localStorage.setItem(key, JSON.stringify(existing));

    const projectResolution = resolveProjectId(projectId);

    if (projectResolution === null) {
      console.error("Invalid projectId for events insert", { projectId, type, label, extraMeta });
      return;
    }

    const sb = supabase as unknown as {
      from: (table: string) => {
        insert: (
          row: Record<string, unknown>
        ) => Promise<{ data?: unknown; error: { message?: string } | null }>;
      };
    };

    const pagePath =
      typeof window !== "undefined" && window.location
        ? `${window.location.pathname}${window.location.search}`
        : null;
    const eventMetadata = metadataForEventsInsert(label, event.sessionId, {
      ...(extraMeta && typeof extraMeta === "object" ? extraMeta : {}),
      projectId: projectResolution.projectIdText,
    });
    const eventMeta = {
      ...eventMetadata,
      projectId: projectResolution.projectIdText,
    };
    const insertRow = {
      project_id: projectResolution.numericProjectId,
      output_id: null,
      session_id: event.sessionId,
      visitor_id: event.sessionId,
      event_type: type,
      event_name: type,
      page_path: pagePath,
      element_key: label ?? null,
      event_value: label ?? null,
      meta: eventMeta,
      occurred_at: event.timestamp,
      type,
      page: pagePath,
      metadata: eventMetadata,
    };

    console.log("[trackEvent] inserting event", type, {
      resolvedProjectId: projectResolution.numericProjectId,
      usedUuidFallback: projectResolution.usedUuidFallback,
      originalProjectId: projectResolution.projectIdText,
    });
    console.log("[trackEvent] supabase insert payload", insertRow);

    const response = await sb.from("events").insert(insertRow);
    console.log("[trackEvent] supabase insert response data", response.data ?? null);
    console.log("[trackEvent] supabase insert response error", response.error ?? null);

    if (response.error) {
      console.error("trackEvent supabase insert error:", {
        message: response.error.message,
        code: (response.error as { code?: string }).code,
        details: (response.error as { details?: string }).details,
        hint: (response.error as { hint?: string }).hint,
        raw: response.error,
      });
    }

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("alize-tracking-updated", { detail: { projectId: projectResolution.projectIdText } })
      );
      window.dispatchEvent(
        new CustomEvent("alize-mvp-tracking-updated", { detail: { projectId: projectResolution.projectIdText } })
      );
    }
  } catch (err) {
    console.error("trackEvent error:", err);
  }
}

export function getTrackingEvents(projectId: string | number = "default"): TrackingEvent[] {
  try {
    return JSON.parse(localStorage.getItem(`${TRACKING_KEY_PREFIX}${String(projectId)}`) || "[]");
  } catch {
    return [];
  }
}

export async function getSupabaseTrackingEvents(
  projectId: string | number = "default"
): Promise<TrackingEvent[]> {
  try {
    const projectResolution = resolveProjectId(projectId);
    if (projectResolution === null) return [];

    const sb = supabase as unknown as {
      from: (table: string) => {
        select: (
          cols: string
        ) => {
          eq: (col: string, value: string | number) => Promise<{
            data: Array<Record<string, unknown>> | null;
            error: { message?: string } | null;
          }>;
        };
      };
    };

    let data: Array<Record<string, unknown>> | null = null;
    let error: { message?: string } | null = null;
    if (projectResolution.numericProjectId !== null) {
      const res = await sb
        .from("events")
        .select("event_name, event_type, metadata, meta, session_id, created_at, occurred_at")
        .eq("project_id", projectResolution.numericProjectId);
      data = res.data;
      error = res.error;
    } else {
      const sbAny = supabase as unknown as {
        from: (table: string) => {
          select: (cols: string) => {
            contains: (
              col: string,
              value: Record<string, unknown>
            ) => Promise<{
              data: Array<Record<string, unknown>> | null;
              error: { message?: string } | null;
            }>;
          };
        };
      };
      const [metadataRes, metaRes] = await Promise.all([
        sbAny
          .from("events")
          .select("event_name, event_type, metadata, meta, session_id, created_at, occurred_at")
          .contains("metadata", { projectId: projectResolution.projectIdText }),
        sbAny
          .from("events")
          .select("event_name, event_type, metadata, meta, session_id, created_at, occurred_at")
          .contains("meta", { projectId: projectResolution.projectIdText }),
      ]);
      if (metadataRes.error) {
        error = metadataRes.error;
      } else if (metaRes.error) {
        error = metaRes.error;
      } else {
        const merged = [...(metadataRes.data ?? []), ...(metaRes.data ?? [])];
        const seen = new Set<string>();
        data = merged.filter((row) => {
          const key = JSON.stringify([
            row.event_name ?? row.event_type ?? "",
            row.session_id ?? "",
            row.occurred_at ?? row.created_at ?? "",
            JSON.stringify(row.metadata ?? row.meta ?? {}),
          ]);
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      }
    }

    if (error || !data) return [];

    const rows: TrackingEvent[] = [];
    for (const r of data) {
      const eventName = String(r.event_name ?? r.event_type ?? "");
      if (!TRACKED_EVENT_NAMES.has(eventName)) continue;

      const metadata = (r.metadata ?? r.meta ?? {}) as Record<string, unknown>;
      rows.push({
        type: eventName as TrackingEventType,
        label: typeof metadata.label === "string" ? metadata.label : undefined,
        timestamp:
          typeof r.occurred_at === "string"
            ? r.occurred_at
            : typeof r.created_at === "string"
              ? r.created_at
              : new Date().toISOString(),
        sessionId:
          typeof r.session_id === "string"
            ? r.session_id
            : typeof metadata.sessionId === "string"
              ? metadata.sessionId
              : "supabase",
      });
    }

    return rows;
  } catch {
    return [];
  }
}

export interface FunnelMetrics {
  visitors: number;
  surveyCompleted: number;
  emailEntered: number;
  accountCreated: number;
  usedProduct: number;
  returnUsers: number;
  paid: number;
}

export function computeFunnel(projectId: string | number = "default"): FunnelMetrics {
  const events = getTrackingEvents(projectId);
  const sessions = new Set(events.map((e) => e.sessionId));

  return {
    visitors: sessions.size || 1,
    surveyCompleted: events.filter((e) => e.type === "survey_completed").length,
    emailEntered: events.filter((e) => e.type === "email_entered").length,
    accountCreated: events.filter((e) => e.type === "account_created").length,
    usedProduct: events.filter(
      (e) =>
        e.type === "demo_viewed" ||
        e.type === "process_clicked" ||
        e.type === "item_clicked" ||
        e.type === "item_viewed" ||
        e.type === "plan_generated" ||
        e.type === "idea_clicked" ||
        e.type === "experiment_clicked" ||
        e.type === "video_uploaded" ||
        e.type === "video_link_added" ||
        e.type === "hooks_generated" ||
        e.type === "hook_selected" ||
        e.type === "hook_copied" ||
        e.type === "hook_summary_downloaded"
    ).length,
    returnUsers: events.filter((e) => e.type === "return_user").length,
    paid: events.filter((e) => e.type === "preorder").length,
  };
}