// Validation funnel tracking system
// Stores events per project in localStorage for dashboard consumption

export type TrackingEventType =
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
  | "demo_viewed";

export interface TrackingEvent {
  type: TrackingEventType;
  label?: string;
  timestamp: string;
  sessionId: string;
}

const TRACKING_KEY_PREFIX = "alize_tracking_";

function getSessionId(): string {
  let sid = sessionStorage.getItem("alize_session");
  if (!sid) {
    sid = Math.random().toString(36).slice(2, 10);
    sessionStorage.setItem("alize_session", sid);
  }
  return sid;
}

export function trackEvent(type: TrackingEventType, projectId: string = "default", label?: string) {
  try {
    const key = `${TRACKING_KEY_PREFIX}${projectId}`;
    const existing: TrackingEvent[] = JSON.parse(localStorage.getItem(key) || "[]");
    existing.push({
      type,
      label,
      timestamp: new Date().toISOString(),
      sessionId: getSessionId(),
    });
    localStorage.setItem(key, JSON.stringify(existing));
  } catch { /* ignore */ }
}

export function getTrackingEvents(projectId: string = "default"): TrackingEvent[] {
  try {
    return JSON.parse(localStorage.getItem(`${TRACKING_KEY_PREFIX}${projectId}`) || "[]");
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

export function computeFunnel(projectId: string = "default"): FunnelMetrics {
  const events = getTrackingEvents(projectId);
  const sessions = new Set(events.map(e => e.sessionId));
  
  return {
    visitors: sessions.size || 1,
    surveyCompleted: events.filter(e => e.type === "survey_completed").length,
    emailEntered: events.filter(e => e.type === "email_entered").length,
    accountCreated: events.filter(e => e.type === "account_created").length,
    usedProduct: events.filter(e => e.type === "demo_viewed" || e.type === "process_clicked").length,
    returnUsers: events.filter(e => e.type === "return_user").length,
    paid: events.filter(e => e.type === "preorder").length,
  };
}
