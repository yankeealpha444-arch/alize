export type CanonicalEventType =
  | "visit"
  | "intent"
  | "activation"
  | "engagement"
  | "value"
  | "retention";

export type ProductEventMap = {
  visit: string;
  intent: string;
  activation: string;
  engagement: string;
  value: string;
  retention?: string;
};
