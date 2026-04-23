import type { ComponentType } from "react";
import type { ToolRenderVariant } from "@/lib/mvp/mvpClassification";
import HookGeneratorMVP from "@/components/HookGeneratorMVP";
import VideoClipperMVP from "@/components/mvp/VideoClipperMVP";

export type MvpPluginId = "video_mvp" | "hook_generator";

/** Founder preview experience plugins — `toolRenderVariant` selects which entry to render. */
export type MvpExperiencePlugin = {
  id: MvpPluginId;
  render: ComponentType<{ projectId: string }>;
  /** Documented route prefixes for this MVP (app routing unchanged; metadata for tooling). */
  routes: readonly string[];
};

export const MVP_PLUGINS: Record<MvpPluginId, MvpExperiencePlugin> = {
  video_mvp: {
    id: "video_mvp",
    render: VideoClipperMVP,
    routes: ["/video", "/clips", "/dashboard"],
  },
  hook_generator: {
    id: "hook_generator",
    render: HookGeneratorMVP,
    routes: ["/preview/:projectId"],
  },
};

export function getMvpPluginForToolRenderVariant(v: ToolRenderVariant): MvpExperiencePlugin {
  if (v === "video_clipper") return MVP_PLUGINS.video_mvp;
  return MVP_PLUGINS.hook_generator;
}
