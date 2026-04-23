/**
 * Internal template registry — not shown to end users as a picker.
 * Single active vertical + template for the current product direction.
 */

export const VERTICAL_YOUTUBE_SHORTS_HOOKS = "youtube_shorts_clip_hooks";

export const TEMPLATE_HOOK_GENERATOR = {
  template_id: "hook_generator_v1",
  template_name: "YouTube Shorts clip hooks",
  vertical: VERTICAL_YOUTUBE_SHORTS_HOOKS,
  offer: "Turn long videos into high performing Shorts — pick and refine the hook for your best clip",
  target_user: "creators turning long videos into youtube shorts",
  status: "active" as const,
} as const;

export type InternalTemplate = typeof TEMPLATE_HOOK_GENERATOR;
