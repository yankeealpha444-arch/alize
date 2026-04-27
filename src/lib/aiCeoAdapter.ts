import type { TrackingEvent } from "@/lib/trackingEvents";
import type { CanonicalEventType, ProductEventMap } from "@/lib/aiCeoEventSchema";

// This layer allows any product (Shopify, SaaS, tools)
// to plug into AI CEO by mapping its events to:
// visit -> intent -> activation -> engagement -> value -> retention
export function mapEventsToCanonical(events: TrackingEvent[], map: ProductEventMap) {
  const counts: Record<CanonicalEventType, number> = {
    visit: 0,
    intent: 0,
    activation: 0,
    engagement: 0,
    value: 0,
    retention: 0,
  };

  const canonicalKeys: CanonicalEventType[] = [
    "visit",
    "intent",
    "activation",
    "engagement",
    "value",
    "retention",
  ];

  events.forEach((e) => {
    canonicalKeys.forEach((key) => {
      const mappedEvent = map[key];
      if (mappedEvent && e.type === mappedEvent) {
        counts[key]++;
      }
    });
  });

  return counts;
}
