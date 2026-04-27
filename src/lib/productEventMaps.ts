export const clipperEventMap = {
  visit: "session_started",
  intent: "link_submitted",
  activation: "clips_generated",
  engagement: "clip_played",
  value: "clip_downloaded",
  // retention is derived in InternalMetrics from returning session detection
} as const;
