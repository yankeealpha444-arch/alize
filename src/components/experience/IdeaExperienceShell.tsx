import { useSegmentAwareMvpClassification } from "@/hooks/useSegmentAwareMvpClassification";
import { getMvpPluginForToolRenderVariant } from "@/lib/mvp/mvpPlugins";

type Props = { projectId: string };

/**
 * Founder preview: Hook Generator by default; AI Video Clipper when the idea is a clipping product.
 */
export default function IdeaExperienceShell({ projectId }: Props) {
  const c = useSegmentAwareMvpClassification(projectId);
  const plugin = getMvpPluginForToolRenderVariant(c.toolRenderVariant);
  const Cmp = plugin.render;
  return <Cmp key={projectId} projectId={projectId} />;
}
