import { useEffect, useMemo, useState } from "react";
import { Eye, MousePointerClick, Film, Image as ImageIcon, BarChart3 } from "lucide-react";
import { getFlowStoreRevision, useFlow } from "@/store/flowStore";
import { formatTime } from "@/data/demoClips";
import { ensureVideoMvpProjectId, getVideoMvpProject } from "../../../src/lib/videoMvpProject";
import { normalizeYoutubePosterUrlForImg } from "../../../src/lib/mvp/thumbnailPosterSource";

export default function MiniDashboardPreview() {
  const { selectedClip, selectedClipLabel, selectedThumbnail } = useFlow();
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const f = () => setTick((t) => t + 1);
    window.addEventListener("alize-video-mvp-project-updated", f);
    return () => window.removeEventListener("alize-video-mvp-project-updated", f);
  }, []);

  const vp = useMemo(() => getVideoMvpProject(ensureVideoMvpProjectId()), [tick]);
  const manual = vp?.manual_performance_metrics;

  /** Same store + disk: flow is canonical; if hydrate lags, fall back to persisted project row. */
  const thumbResolved = useMemo(() => {
    if (selectedThumbnail?.id) return selectedThumbnail;
    const p = vp?.selected_thumbnail;
    if (!p?.id) return null;
    const src = normalizeYoutubePosterUrlForImg(p.preview_url || "");
    return {
      id: p.id,
      name: p.name,
      src: src || p.preview_url,
      score: p.score,
    };
  }, [selectedThumbnail, vp?.selected_thumbnail]);

  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log("[mvp-thumb-pipeline]", {
        step: "dashboard-preview",
        flowThumbId: selectedThumbnail?.id,
        flowThumbName: selectedThumbnail?.name,
        diskThumbId: vp?.selected_thumbnail?.id,
        diskThumbName: vp?.selected_thumbnail?.name,
        effectiveThumbId: thumbResolved?.id,
        effectiveThumbName: thumbResolved?.name,
      });
    }
  }, [
    selectedThumbnail?.id,
    selectedThumbnail?.name,
    vp?.selected_thumbnail?.id,
    thumbResolved?.id,
    thumbResolved?.name,
  ]);

  const clipRange =
    selectedClip != null
      ? `${formatTime(selectedClip.start_time)}–${formatTime(selectedClip.end_time)}`
      : "";
  const clipTitle =
    selectedClipLabel && clipRange
      ? `${selectedClipLabel.trim()} · ${clipRange}`
      : (selectedClipLabel && selectedClipLabel.trim()) ||
        selectedClip?.caption?.slice(0, 48) ||
        "—";
  const thumbTitle = thumbResolved?.name ?? "—";

  const viewsDisplay = manual != null ? manual.views.toLocaleString() : "—";
  const ctrDisplay = "—";

  const metrics: Array<{
    icon: typeof Eye;
    label: string;
    value: string;
    delta: string;
    imageSrc?: string;
  }> = [
    { icon: Eye, label: "Views", value: viewsDisplay, delta: manual != null ? "From your entries" : "After you track" },
    { icon: MousePointerClick, label: "Click-through rate", value: ctrDisplay, delta: "Studio only for now" },
    {
      icon: Film,
      label: "Clip",
      value: clipTitle,
      delta: selectedClip ? `Priority ${selectedClip.score}` : "Pick a clip",
    },
    {
      icon: ImageIcon,
      label: "Thumbnail",
      value: thumbTitle,
      delta: thumbResolved ? `Priority ${thumbResolved.score}` : "Pick a thumbnail",
      imageSrc: thumbResolved?.src,
    },
  ];

  return (
    <section
      className="mt-6 rounded-2xl border border-border/40 bg-card p-5 sm:p-6"
      data-mvp-widget="dashboard-preview"
      data-mvp-flow-revision={getFlowStoreRevision()}
    >
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <BarChart3 className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground truncate">
            Dashboard preview
          </span>
        </div>
        <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {manual != null ? "Saved" : "Preview"}
        </span>
      </div>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {metrics.map(({ icon: Icon, label, value, delta, imageSrc }) => (
          <div key={label} className="rounded-lg border border-border/40 bg-background p-3 min-w-0">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span className="text-[10px] font-medium uppercase tracking-wider truncate">{label}</span>
            </div>
            {imageSrc ? (
              <>
                <div className="mt-2 aspect-video w-full max-h-20 overflow-hidden rounded-md border border-border/50 bg-muted">
                  <img src={imageSrc} alt="" className="h-full w-full object-cover" loading="lazy" />
                </div>
                <p className="mt-1.5 font-display text-base font-bold text-foreground truncate" title={value}>
                  {value}
                </p>
              </>
            ) : (
              <p className="mt-2 font-display text-lg font-bold text-foreground truncate" title={value}>
                {value}
              </p>
            )}
            <p className="mt-0.5 text-[11px] text-muted-foreground line-clamp-2">{delta}</p>
          </div>
        ))}
      </div>

      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
        Open <span className="font-medium text-foreground">Go to dashboard</span> after you post to see the full thumbnail
        test card and next actions. Numbers here update when you save performance on the step above.
      </p>
    </section>
  );
}
