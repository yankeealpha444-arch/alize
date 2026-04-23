import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link2 } from "lucide-react";
import { useClips } from "@/hooks/useClips";
import { formatTime } from "@/data/demoClips";
import AlizeLogo from "@/components/AlizeLogo";
import { flowStore } from "@/store/flowStore";
import { ensureVideoMvpProjectId } from "../../../src/lib/videoMvpProject";
import { parseYoutubeVideoId } from "../../../src/lib/mvp/youtubeIngest";

function buildYoutubeEmbedSrc(videoId: string, startTime: number, endTime: number): string {
  return `https://www.youtube.com/embed/${videoId}?start=${Math.floor(startTime)}&end=${Math.ceil(endTime)}&rel=0&modestbranding=1`;
}

export default function Index() {
  const queryClient = useQueryClient();
  const { clips, isLoading } = useClips();
  const [link, setLink] = useState(flowStore.get().sourceInput ?? "");
  const [message, setMessage] = useState("");

  const handleGenerate = async () => {
    const trimmed = link.trim();
    if (!trimmed) {
      setMessage("Paste a video link to generate clips");
      return;
    }
    setMessage("");
    flowStore.setSource(trimmed);
    const pid = ensureVideoMvpProjectId();
    localStorage.setItem(`alize_clips_source_url_${pid}`, trimmed);
    await queryClient.invalidateQueries({ queryKey: ["clips"] });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/40 px-4 py-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <AlizeLogo />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Paste a video link to generate clips instantly
          </h1>
          <p className="mt-2 text-muted-foreground">Works with video links. Upload coming soon.</p>
        </div>

        <section className="mt-6 max-w-2xl rounded-2xl border border-border/60 bg-card p-5 sm:p-6">
          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Link2 className="h-3.5 w-3.5" />
              Video link
            </span>
            <input
              type="url"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="Paste YouTube or public video link"
              className="w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-foreground focus:outline-none"
            />
          </label>

          <button
            type="button"
            onClick={() => void handleGenerate()}
            className="mt-4 inline-flex w-full items-center justify-center rounded-md bg-foreground px-4 py-3 text-sm font-semibold text-background transition-transform hover:scale-[1.01] active:scale-100"
          >
            Generate Clips
          </button>

          {message ? <p className="mt-3 text-sm text-foreground">{message}</p> : null}
        </section>

        <section className="mt-8">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Generating clips...</p>
          ) : clips.length === 0 ? (
            <p className="text-sm text-muted-foreground">No clips yet. Paste a video link to get started.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {clips.map((clip, idx) => {
                const directUrl = clip.video_url?.trim() ?? "";
                const ytId = clip.youtube_video_id?.trim() || parseYoutubeVideoId(directUrl) || "";
                const isYoutube = Boolean(ytId);
                const canDownload = Boolean(directUrl) && !isYoutube;
                const label = `Clip ${idx + 1}`;
                const embedSrc = isYoutube
                  ? buildYoutubeEmbedSrc(ytId, clip.start_time, clip.end_time)
                  : "";
                console.log("[clip url]", clip.video_url);

                return (
                  <article key={clip.id} className="rounded-xl border border-border/60 bg-card p-3">
                    <p className="text-sm font-semibold">{label}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatTime(clip.start_time)} - {formatTime(clip.end_time)}
                    </p>

                    <div className="mt-3 aspect-video overflow-hidden rounded-lg border border-border/60 bg-black">
                      {isYoutube ? (
                        <iframe
                          title={`${label} preview`}
                          src={embedSrc}
                          className="h-full w-full border-0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          allowFullScreen
                        />
                      ) : directUrl ? (
                        <video src={directUrl} controls className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center bg-muted text-xs text-muted-foreground">
                          No playable source for this clip yet
                        </div>
                      )}
                    </div>

                    <div className="mt-3 flex gap-2">
                      {canDownload ? (
                        <a
                          href={directUrl}
                          download
                          className="inline-flex items-center rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-secondary"
                        >
                          Download
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground">Download unavailable for this clip source</span>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link2 } from "lucide-react";
import { useClips } from "@/hooks/useClips";
import { formatTime } from "@/data/demoClips";
import AlizeLogo from "@/components/AlizeLogo";
import { flowStore } from "@/store/flowStore";
import { ensureVideoMvpProjectId } from "../../../src/lib/videoMvpProject";
import { parseYoutubeVideoId } from "../../../src/lib/mvp/youtubeIngest";

function buildYoutubeEmbedSrc(videoId: string, startTime: number, endTime: number): string {
  return `https://www.youtube.com/embed/${videoId}?start=${Math.floor(startTime)}&end=${Math.ceil(endTime)}&rel=0&modestbranding=1`;
}

export default function Index() {
  const queryClient = useQueryClient();
  const { clips, isLoading } = useClips();
  const [link, setLink] = useState(flowStore.get().sourceInput ?? "");
  const [message, setMessage] = useState("");

  const handleGenerate = async () => {
    const trimmed = link.trim();
    if (!trimmed) {
      setMessage("Paste a video link to generate clips");
      return;
    }
    setMessage("");
    flowStore.setSource(trimmed);
    const pid = ensureVideoMvpProjectId();
    localStorage.setItem(`alize_clips_source_url_${pid}`, trimmed);
    await queryClient.invalidateQueries({ queryKey: ["clips"] });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/40 px-4 py-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <AlizeLogo />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Paste a video link to generate clips instantly
          </h1>
          <p className="mt-2 text-muted-foreground">Works with video links. Upload coming soon.</p>
        </div>

        <section className="mt-6 max-w-2xl rounded-2xl border border-border/60 bg-card p-5 sm:p-6">
          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Link2 className="h-3.5 w-3.5" />
              Video link
            </span>
            <input
              type="url"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="Paste YouTube or public video link"
              className="w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-foreground focus:outline-none"
            />
          </label>

          <button
            type="button"
            onClick={() => void handleGenerate()}
            className="mt-4 inline-flex w-full items-center justify-center rounded-md bg-foreground px-4 py-3 text-sm font-semibold text-background transition-transform hover:scale-[1.01] active:scale-100"
          >
            Generate Clips
          </button>

          {message ? <p className="mt-3 text-sm text-foreground">{message}</p> : null}
        </section>

        <section className="mt-8">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Generating clips...</p>
          ) : clips.length === 0 ? (
            <p className="text-sm text-muted-foreground">No clips yet. Paste a video link to get started.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {clips.map((clip, idx) => {
                const directUrl = clip.video_url?.trim() ?? "";
                const ytId = clip.youtube_video_id?.trim() || parseYoutubeVideoId(directUrl) || "";
                const isYoutube = Boolean(ytId);
                const canDownload = Boolean(directUrl) && !isYoutube;
                const label = `Clip ${idx + 1}`;
                const embedSrc = isYoutube
                  ? buildYoutubeEmbedSrc(ytId, clip.start_time, clip.end_time)
                  : "";
                console.log("[clip url]", clip.video_url);

                return (
                  <article key={clip.id} className="rounded-xl border border-border/60 bg-card p-3">
                    <p className="text-sm font-semibold">{label}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatTime(clip.start_time)} - {formatTime(clip.end_time)}
                    </p>

                    <div className="mt-3 aspect-video overflow-hidden rounded-lg border border-border/60 bg-black">
                      {isYoutube ? (
                        <iframe
                          title={`${label} preview`}
                          src={embedSrc}
                          className="h-full w-full border-0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          allowFullScreen
                        />
                      ) : directUrl ? (
                        <video src={directUrl} controls className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center bg-muted text-xs text-muted-foreground">
                          No playable source for this clip yet
                        </div>
                      )}
                    </div>

                    <div className="mt-3 flex gap-2">
                      {canDownload ? (
                        <a
                          href={directUrl}
                          download
                          className="inline-flex items-center rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-secondary"
                        >
                          Download
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground">Download unavailable for this clip source</span>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
import {
  useState,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import { Link2, Copy, Play, Check, Sparkles, X, ArrowRight, BarChart3, Image as ImageIcon } from "lucide-react";
import { useClips } from "@/hooks/useClips";
import { clipDurationSeconds, formatClipLengthLabel, formatTime, type Clip } from "@/data/demoClips";
import AlizeLogo from "@/components/AlizeLogo";
import NextStepGuide, { type Stage } from "@/components/NextStepGuide";
import { Button } from "@/components/ui/button";
import ThumbnailSelector, { type ThumbnailItem } from "../../../src/components/ThumbnailSelector";
import { type ThumbnailOption } from "@/components/ThumbnailPicker";
import LoopExplainer from "@/components/LoopExplainer";
import ReadyToPost from "@/components/ReadyToPost";
import MiniDashboardPreview from "@/components/MiniDashboardPreview";
import {
  flowStore,
  getFlowStoreRevision,
  syncFlowStoreFromVideoMvpProject,
  useFlow,
} from "@/store/flowStore";
import {
  ensureVideoMvpProjectId,
  persistVideoMvpClipSelection,
  persistVideoMvpThumbnailSelection,
  patchVideoMvpProject,
  clearVideoMvpClipAndThumbnail,
  getVideoMvpProject,
} from "../../../src/lib/videoMvpProject";
import { getMvpFlowState, patchMvpFlowState } from "../../../src/lib/mvpFlowState";
import { parseYoutubeVideoId } from "../../../src/lib/mvp/youtubeIngest";
import {
  normalizeYoutubePosterUrlForImg,
  posterUrlForYoutubeOrEmpty,
} from "../../../src/lib/mvp/thumbnailPosterSource";
import { trackEvent } from "../../../src/lib/trackingEvents";

const LABELS = ["Hook clip", "Mid payoff", "Closing takeaway"] as const;

const CEO_CLIP_YES_CHIPS = ["Strong hook", "Good timing", "Clear topic", "High energy", "Other"] as const;
const CEO_CLIP_NOTYET_CHIPS = ["Post it first", "Try backup clip", "Improve hook"] as const;

function emitClipOutcome(
  result: "good" | "bad" | "unknown",
  extra?: { chip?: string },
) {
  const pid = numericProjectId(ensureVideoMvpProjectId());
  const clipId = flowStore.get().selectedClip?.id;
  const meta: Record<string, unknown> = {
    clip_result: result,
    ...(clipId ? { clipId } : {}),
    ...(extra?.chip ? { chip: extra.chip } : {}),
  };
  void trackEvent("clip_result", pid, result, meta);
  void trackEvent("ai_ceo_clip_result", pid, result, meta);
}

const SCORE_TONE = [
  "bg-foreground text-background",
  "bg-foreground/15 text-foreground",
  "bg-muted text-muted-foreground",
];

const PURPOSE = [
  "First segment to test",
  "Middle segment to test",
  "Late segment to test",
];

const CTA_COPY = [
  "Use this clip",
  "Use this clip",
  "Use this clip",
];

type ThumbnailAngleId = "shock" | "warning" | "results";

const STEP3_THUMB_ORDER: ThumbnailAngleId[] = ["shock", "warning", "results"];

const STEP3_THUMB_COPY: Record<
  ThumbnailAngleId,
  Pick<ThumbnailItem, "label" | "description" | "thumbnailTextExample" | "score" | "variant">
> = {
  shock: {
    label: "Shock",
    description: "Bold, high-energy headline framing",
    thumbnailTextExample: "THIS BLEW UP",
    score: 91,
    variant: "shock",
  },
  warning: {
    label: "Warning",
    description: "Curiosity / caution framing",
    thumbnailTextExample: "DON\u0027T DO THIS",
    score: 84,
    variant: "warning",
  },
  results: {
    label: "Results",
    description: "Progress or outcome framing",
    thumbnailTextExample: "0 TO 10K VIEWS",
    score: 79,
    variant: "results",
  },
};

function numericProjectId(rawProjectId: unknown): number {
  const parsed = Number(rawProjectId);
  const projectId = Number.isFinite(parsed) ? parsed : 186;
  console.log("TRACK EVENT DEBUG", { projectId });
  return projectId;
}

function templateToThumbnailOption(t: ThumbnailItem): ThumbnailOption {
  const src = typeof t.imageUrl === "string" ? t.imageUrl : String(t.imageUrl);
  return {
    id: t.id,
    name: t.label,
    src,
    score: t.score,
    uplift: "—",
    reason: t.description,
  };
}

function thumbnailOptionFromFlowThumb(t: {
  id: string;
  name: string;
  src: string;
  score: number;
}): ThumbnailOption {
  return {
    id: t.id,
    name: t.name,
    src: t.src,
    score: t.score,
    uplift: "—",
    reason: "Selected for this test",
  };
}

function persistClipAndSyncFlow(pid: string, clip: Clip, label: string): void {
  if (import.meta.env.DEV) {
    console.log("[mvp-flow] persistClipAndSyncFlow → persistVideoMvpClipSelection", { pid, clipId: clip.id, label });
  }
  const saved = persistVideoMvpClipSelection(pid, clip, label);
  if (import.meta.env.DEV) {
    console.log("[mvp-flow] persist clip result", { saved: Boolean(saved) });
  }
  syncFlowStoreFromVideoMvpProject(pid);
  flowStore.selectClip(clip, label);
}

function persistThumbnailAndSyncFlow(
  pid: string,
  thumb: { id: string; name: string; preview_url: string; score: number },
): void {
  const normalizedSrc = normalizeYoutubePosterUrlForImg(thumb.preview_url);
  const selected = {
    id: thumb.id,
    name: thumb.name,
    src: normalizedSrc || thumb.preview_url,
    score: thumb.score,
  };
  flowStore.selectThumbnail(selected);
  const saved = persistVideoMvpThumbnailSelection(pid, {
    ...thumb,
    preview_url: normalizedSrc || thumb.preview_url,
  });
  if (import.meta.env.DEV && !saved) {
    console.warn("[mvp-thumb-pipeline] persistVideoMvpThumbnailSelection returned null", { pid });
  }
  syncFlowStoreFromVideoMvpProject(pid);
  flowStore.selectThumbnail(selected);
  if (import.meta.env.DEV) {
    const s = flowStore.get().selectedThumbnail;
    console.log("[mvp-thumb-pipeline]", {
      step: "after-persist-thumbnail",
      pid,
      saved: Boolean(saved),
      flowThumbId: s?.id,
      flowThumbName: s?.name,
      flowThumbSrcLen: s?.src?.length ?? 0,
    });
  }
}

const RANK_COLORS = [
  "text-foreground",
  "text-foreground/70",
  "text-foreground/50",
];

type OutcomePhase = "idle" | "primary" | "reasons" | "next" | "done";

function AiCeoClipOutcomeBlock({
  phase,
  onPickYes,
  onPickNotYet,
  onHaventPosted,
  onYesReason,
  onNotYetStep,
}: {
  phase: "primary" | "reasons" | "next";
  onPickYes: () => void;
  onPickNotYet: () => void;
  onHaventPosted: () => void;
  onYesReason: (chip: string) => void;
  onNotYetStep: (chip: string) => void;
}) {
  const chipBtn =
    "rounded border border-border/60 bg-background px-2 py-1 text-[11px] leading-tight hover:bg-muted/50";
  return (
    <div className="mt-3 rounded border border-border/50 px-2.5 py-2 text-[11px] text-foreground">
      {phase === "primary" ? (
        <>
          <p className="mb-1.5 font-medium leading-snug">Was this the right clip choice?</p>
          <div className="flex flex-wrap gap-1.5">
            <button type="button" className={chipBtn} onClick={onPickYes}>
              Yes
            </button>
            <button type="button" className={chipBtn} onClick={onPickNotYet}>
              Not yet
            </button>
            <button type="button" className={chipBtn} onClick={onHaventPosted}>
              Haven&apos;t posted
            </button>
          </div>
        </>
      ) : null}
      {phase === "reasons" ? (
        <>
          <p className="mb-1.5 text-[10px] text-muted-foreground">What worked?</p>
          <div className="flex flex-wrap gap-1.5">
            {CEO_CLIP_YES_CHIPS.map((chip) => (
              <button key={chip} type="button" className={chipBtn} onClick={() => onYesReason(chip)}>
                {chip}
              </button>
            ))}
          </div>
        </>
      ) : null}
      {phase === "next" ? (
        <>
          <p className="mb-1.5 text-[10px] text-muted-foreground">What next?</p>
          <div className="flex flex-wrap gap-1.5">
            {CEO_CLIP_NOTYET_CHIPS.map((chip) => (
              <button key={chip} type="button" className={chipBtn} onClick={() => onNotYetStep(chip)}>
                {chip}
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

export default function Index() {
  const navigate = useNavigate();
  const { clips, sourceName, isLoading } = useClips();
  const [copied, setCopied] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [posted, setPosted] = useState(false);
  const flow = useFlow();
  const comparisonRef = useRef<HTMLDivElement | null>(null);
  const thumbnailRef = useRef<HTMLDivElement | null>(null);
  const readyToPostRef = useRef<HTMLDivElement | null>(null);
  const recommendationViewedTracked = useRef(false);

  const [outcomeClipId, setOutcomeClipId] = useState<string | null>(null);
  const [outcomePhase, setOutcomePhase] = useState<OutcomePhase>("idle");
  const [generatedThumbsById, setGeneratedThumbsById] = useState<Partial<Record<ThumbnailAngleId, string>>>({});

  const topClips = useMemo(
    () => [...clips].sort((a, b) => b.score - a.score).slice(0, 3),
    [clips]
  );
  const bestClip = topClips[0];
  const selectedClipFromFlow = flow.selectedClip;

  const flowSource = useSyncExternalStore(
    flowStore.subscribe,
    () => flowStore.get().sourceInput,
    () => "",
  );

  const ytVideoIdForThumbnail = useMemo(() => {
    const fromFlow = parseYoutubeVideoId(flowSource.trim());
    if (fromFlow) return fromFlow;

    try {
      const pid = ensureVideoMvpProjectId();
      const persisted = localStorage.getItem(`alize_clips_source_url_${pid}`)?.trim() ?? "";
      const fromPersisted = parseYoutubeVideoId(persisted);
      if (fromPersisted) return fromPersisted;
    } catch {
      /* ignore */
    }

    const fromName = parseYoutubeVideoId(sourceName.trim());
    if (fromName) return fromName;

    const idFromClip =
      bestClip?.youtube_video_id?.trim() ||
      clips.find((c) => Boolean(c.youtube_video_id?.trim()))?.youtube_video_id?.trim() ||
      "";
    return idFromClip || "";
  }, [flowSource, sourceName, bestClip, clips]);

  const youtubePosterUrl = posterUrlForYoutubeOrEmpty(ytVideoIdForThumbnail);
  const clipForThumbnailPreview = selectedClipFromFlow ?? bestClip ?? clips[0] ?? null;
  const resolvedSourceVideoUrl = useMemo(() => {
    const fromFlow = flowSource.trim();
    if (fromFlow) return fromFlow;

    const pid = ensureVideoMvpProjectId();

    const fromLocalStorage = localStorage.getItem(`alize_clips_source_url_${pid}`)?.trim() ?? "";
    if (fromLocalStorage) return fromLocalStorage;

    const project = getVideoMvpProject(pid);

    const fromProjectYoutubeUrl =
      typeof project?.youtube_url === "string" ? project.youtube_url.trim() : "";
    if (fromProjectYoutubeUrl) return fromProjectYoutubeUrl;

    const fromClipVideoUrl =
      selectedClipFromFlow?.video_url?.trim() ||
      bestClip?.video_url?.trim() ||
      clips.find((c) => c.video_url?.trim())?.video_url?.trim() ||
      "";
    if (fromClipVideoUrl) return fromClipVideoUrl;

    const fromSourceName = sourceName.trim();
    if (parseYoutubeVideoId(fromSourceName)) return fromSourceName;

    return "";
  }, [flowSource, sourceName, selectedClipFromFlow, bestClip, clips]);
  const displayClips = clips;
  const selectedClipResolved: Clip | null = selectedClipFromFlow || null;
  const hasAnySourceVideo = Boolean(resolvedSourceVideoUrl.trim());

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    console.log("SOURCE VIDEO NOW", resolvedSourceVideoUrl);
  }, [resolvedSourceVideoUrl]);
  useEffect(() => {
    // Link-only MVP: skip remote thumbnail generation and render deterministic placeholders.
    setGeneratedThumbsById({});
  }, [resolvedSourceVideoUrl, selectedClipResolved?.id]);

  const thumbnailTemplates = useMemo((): ThumbnailItem[] => {
    // `generatedThumbsById` values are URL strings; use ordered keys (not Object.values) so id ↔ url stay aligned.
    const finalThumbnails = STEP3_THUMB_ORDER.map((angleId, index) => {
      const raw = generatedThumbsById?.[angleId];
      const item: Record<string, unknown> =
        raw === undefined || raw === null
          ? {}
          : typeof raw === "string"
            ? { id: angleId, imageUrl: raw }
            : { id: angleId, ...(raw as Record<string, unknown>) };

      return {
        id: (item.id as string | undefined) ?? angleId ?? `thumb-${index}`,
        name: (item.name as string | undefined) ?? (item.label as string | undefined) ?? (item.angle as string | undefined) ?? `Thumbnail ${index + 1}`,
        title: (item.title as string | undefined) ?? (item.name as string | undefined) ?? (item.label as string | undefined) ?? `Thumbnail ${index + 1}`,
        angle: (item.angle as string | undefined) ?? (item.name as string | undefined) ?? (item.label as string | undefined) ?? `Option ${index + 1}`,
        priority: (item.priority as number | undefined) ?? (item.score as number | undefined) ?? 0,
        imageUrl:
          (item.imageUrl as string | undefined) ||
          (item.thumbnailUrl as string | undefined) ||
          (item.previewUrl as string | undefined) ||
          (item.output_url as string | undefined) ||
          (item.url as string | undefined) ||
          "",
        raw: item,
      };
    });

    if (import.meta.env.DEV) {
      console.log("FINAL THUMBS FIXED", finalThumbnails.map((t) => t.imageUrl));
    }

    return STEP3_THUMB_ORDER.map((angleId, index) => {
      const ft = finalThumbnails[index]!;
      const copy = STEP3_THUMB_COPY[angleId];
      return {
        id: angleId,
        ...copy,
        imageUrl: (ft.imageUrl ?? "").trim(),
      };
    });
  }, [generatedThumbsById]);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const t0 = thumbnailTemplates[0];
    console.log("[mvp-thumb-pipeline]", {
      step: "templates-built",
      ytVideoIdForThumbnail,
      templatesLen: thumbnailTemplates.length,
      thumb0imageUrl: t0?.imageUrl,
      eachImageUrl: thumbnailTemplates.map((t) => ({ id: t.id, imageUrl: t.imageUrl })),
      previewClipId: clipForThumbnailPreview?.id,
      previewClipThumbnailUrl: clipForThumbnailPreview?.thumbnail_url,
      previewClipYoutubeVideoId: clipForThumbnailPreview?.youtube_video_id,
      flowSelectedThumbId: flow.selectedThumbnail?.id,
      flowSelectedThumbName: flow.selectedThumbnail?.name,
      resolvedSourceVideoUrl,
    });
  }, [
    ytVideoIdForThumbnail,
    thumbnailTemplates,
    clipForThumbnailPreview,
    flow.selectedThumbnail?.id,
    flow.selectedThumbnail?.name,
    resolvedSourceVideoUrl,
  ]);

  const selectedClipLabelResolved = flow.selectedClipLabel ?? (selectedClipResolved ? LABELS[0] : null);
  const hasClipSelection = Boolean(flow.selectedClip?.id);
  const selectedThumbResolved = flow.selectedThumbnail
    ? thumbnailOptionFromFlowThumb(flow.selectedThumbnail)
    : null;
  const persistedThumb = useMemo(() => {
    const pid = ensureVideoMvpProjectId();
    return getVideoMvpProject(pid)?.selected_thumbnail ?? null;
  }, [flow.selectedThumbnail?.id, flow.selectedThumbnail?.name]);
  const hasThumbnailSelection = Boolean(flow.selectedThumbnail?.id || persistedThumb?.id);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    console.log("[mvp-thumb-pipeline]", {
      step: "render-condition-eval",
      hasClipSelection,
      hasThumbnailSelection,
      generatedThumbKeys: Object.keys(generatedThumbsById || {}),
      generatedThumbsById,
      thumbnailTemplatesLen: thumbnailTemplates.length,
      isUsingPosterFallback:
        !(generatedThumbsById?.shock || generatedThumbsById?.warning || generatedThumbsById?.results),
    });
  }, [hasClipSelection, hasThumbnailSelection, generatedThumbsById, thumbnailTemplates.length]);

  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log("[mvp-flow] Step 3 gate hasClipSelection =", hasClipSelection, {
        selectedClipId: flow.selectedClip?.id,
        selectedLabel: flow.selectedClipLabel,
        step4Unlock: hasClipSelection && hasThumbnailSelection,
        flowThumbId: flow.selectedThumbnail?.id,
        persistedThumbId: persistedThumb?.id,
      });
    }
  }, [
    hasClipSelection,
    hasThumbnailSelection,
    flow.selectedClip?.id,
    flow.selectedClipLabel,
    flow.selectedThumbnail?.id,
    persistedThumb?.id,
  ]);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  useEffect(() => {
    if (clips.length === 0) return;
    const pid = ensureVideoMvpProjectId();
    syncFlowStoreFromVideoMvpProject(pid);
  }, [clips.length]);

  useEffect(() => {
    if (!bestClip) return;
    if (flow.selectedClip?.id) return;
    const pid = ensureVideoMvpProjectId();
    persistClipAndSyncFlow(pid, bestClip, LABELS[0]);
  }, [bestClip, flow.selectedClip?.id]);

  useEffect(() => {
    if (!bestClip || clips.length === 0) return;
    if (recommendationViewedTracked.current) return;
    recommendationViewedTracked.current = true;
    const projectId = numericProjectId(ensureVideoMvpProjectId());
    void trackEvent("ai_ceo_recommendation_viewed", projectId, bestClip.id, {
      recommendedClipId: bestClip.id,
    });
  }, [bestClip, clips.length]);

  const stage: Stage = useMemo(() => {
    if (!clips || clips.length === 0) return "no-upload";
    if (posted) return "feedback";
    if (confirmed) return "confirmed";
    if (hasThumbnailSelection) return "thumbnail-selected";
    if (hasClipSelection) return "clip-selected";
    return "clips-ready";
  }, [clips, posted, confirmed, hasThumbnailSelection, hasClipSelection]);

  const selectedClipRow =
    (selectedClipResolved
      ? displayClips.find((c) => c.id === selectedClipResolved.id)
      : null) ||
    selectedClipResolved ||
    null;
  const clipTimeLabelForStep4 = selectedClipRow
    ? `${formatTime(selectedClipRow.start_time)}–${formatTime(selectedClipRow.end_time)}`
    : "";

  const handleChangeThumbnail = () => {
    const pid = ensureVideoMvpProjectId();
    patchVideoMvpProject(pid, {
      selected_thumbnail: null,
      youtube_url: null,
      manual_performance_metrics: null,
      thumbnail_performance_tier: null,
      feedback: null,
      status: "draft",
    });
    syncFlowStoreFromVideoMvpProject(pid);
    setTimeout(() => thumbnailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 150);
  };

  const handleRunAnotherTest = () => {
    const pid = ensureVideoMvpProjectId();
    flowStore.setSource("");
    clearVideoMvpClipAndThumbnail(pid);
    syncFlowStoreFromVideoMvpProject(pid);
    setOutcomeClipId(null);
    setOutcomePhase("idle");
    setTimeout(() => comparisonRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 150);
  };

  const handleCopy = async (clip: Clip, label: string) => {
    if (import.meta.env.DEV) {
      console.log("[mvp-flow] handleCopy (Use this clip path)", { clipId: clip.id, label });
    }
    const rawProjectId = ensureVideoMvpProjectId();
    const numericPid = numericProjectId(rawProjectId);
    void trackEvent("clip_selected", numericPid, label, { clipId: clip.id, label });
    void trackEvent("ai_ceo_clip_selected", numericPid, label, { clipId: clip.id, label });
    try {
      await navigator.clipboard.writeText(
        `${clip.caption} (${formatTime(clip.start_time)}–${formatTime(clip.end_time)})`
      );
      setCopied(true);
    } catch {
      // ignore
    }
    persistClipAndSyncFlow(rawProjectId, clip, label);
    void trackEvent("clip_copied", numericPid, label, { clipId: clip.id, label });
    void trackEvent("ai_ceo_clip_copied", numericPid, label, { clipId: clip.id, label });
    const prev = getMvpFlowState();
    patchMvpFlowState({ copyCount: prev.copyCount + 1 });
    setOutcomeClipId(clip.id);
    setOutcomePhase("primary");
    setTimeout(() => {
      thumbnailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 150);
  };

  const handleThumbnailSelect = (thumb: ThumbnailOption) => {
    if (import.meta.env.DEV) {
      const before = flowStore.get().selectedThumbnail;
      console.log("[mvp-thumb-pipeline]", {
        step: "handleThumbnailSelect-confirm",
        beforeFlowThumbId: before?.id,
        beforeFlowThumbName: before?.name,
        thumbId: thumb.id,
        thumbName: thumb.name,
        previewUrlLen: String(thumb.src ?? "").length,
      });
    }
    const src = normalizeYoutubePosterUrlForImg(
      typeof thumb.src === "string" ? thumb.src : String(thumb.src),
    );
    const pid = ensureVideoMvpProjectId();
    persistThumbnailAndSyncFlow(pid, {
      id: thumb.id,
      name: thumb.name,
      preview_url: src,
      score: thumb.score,
    });
    if (import.meta.env.DEV) {
      const after = flowStore.get().selectedThumbnail;
      const persisted = getVideoMvpProject(pid)?.selected_thumbnail ?? null;
      console.log("[mvp-thumb-pipeline]", {
        step: "after-handleThumbnailSelect-confirm",
        afterFlowThumbId: after?.id,
        afterFlowThumbName: after?.name,
        persistedThumbId: persisted?.id,
        persistedThumbName: persisted?.name,
      });
    }
    setTimeout(() => {
      readyToPostRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 200);
  };

  const handleGoToDashboard = () => {
    const pid = ensureVideoMvpProjectId();
    const clipId = selectedClipResolved?.id;
    if (clipId) {
      const clip = clips.find((c) => c.id === clipId) ?? selectedClipResolved ?? null;
      if (clip) {
        const idx = topClips.findIndex((c) => c.id === clip.id);
        const label = idx >= 0 ? LABELS[idx] ?? "Selected clip" : (selectedClipLabelResolved ?? "Selected clip");
        persistClipAndSyncFlow(pid, clip, label);
      }
    }
    if (selectedThumbResolved) {
      const src =
        typeof selectedThumbResolved.src === "string" ? selectedThumbResolved.src : String(selectedThumbResolved.src);
      persistThumbnailAndSyncFlow(pid, {
        id: selectedThumbResolved.id,
        name: selectedThumbResolved.name,
        preview_url: src,
        score: selectedThumbResolved.score,
      });
    }
    navigate("/dashboard");
  };

  const handleNextStep = () => {
    switch (stage) {
      case "no-upload":
        navigate("/");
        break;
      case "clips-ready":
        if (bestClip) {
          const pid = ensureVideoMvpProjectId();
          persistClipAndSyncFlow(pid, bestClip, LABELS[0]);
          comparisonRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }
        break;
      case "clip-selected":
        thumbnailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        break;
      case "thumbnail-selected": {
        const chosen =
          (selectedClipResolved ? clips.find((c) => c.id === selectedClipResolved.id) : null) ??
          selectedClipResolved ??
          bestClip;
        if (chosen) {
          const pid = ensureVideoMvpProjectId();
          const idx = topClips.findIndex((c) => c.id === chosen.id);
          const label = idx >= 0 ? LABELS[idx] ?? "Selected clip" : "Selected clip";
          persistClipAndSyncFlow(pid, chosen, label);
        }
        navigate("/preview");
        setConfirmed(true);
        break;
      }
      case "confirmed":
        setPosted(true);
        navigate("/dashboard");
        break;
      case "feedback":
        setConfirmed(false);
        setPosted(false);
        break;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <span className="text-muted-foreground text-sm animate-pulse">Loading…</span>
      </div>
    );
  }

  if (!clips.length && !hasAnySourceVideo) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
        <p className="text-center text-sm text-foreground max-w-md">Paste a video link to generate clips</p>
      </div>
    );
  }

  if (!clips.length && hasAnySourceVideo) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
        <p className="text-center text-sm text-muted-foreground max-w-md">
          Source detected. Preparing clips from your video now...
        </p>
      </div>
    );
  }

  if (!bestClip) return null;

  return (
    <div
      className="min-h-screen bg-background"
      data-mvp-route="clip-selection-hub-index"
      data-mvp-flow-revision={getFlowStoreRevision()}
    >
      <header className="border-b border-border/40 px-4 py-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl flex items-center justify-between gap-3">
          <AlizeLogo />
          <div className="flex items-center gap-2 text-xs text-muted-foreground min-w-0 max-w-[min(100%,28rem)] sm:max-w-none">
            <Link2 className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate max-w-[240px]">{sourceName || "YouTube video"}</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <NextStepGuide stage={stage} onAction={handleNextStep} />
        </div>

        <div className="mb-8 max-w-2xl">
          <div className="mb-2 inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
            <Play className="h-3.5 w-3.5" />
            Step 2 — Pick your first test clip
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Pick your first test clip
          </h1>
          <p className="mt-2 text-muted-foreground">
            Three fixed windows from this video (hook, middle, closing). Preview uses the same YouTube embed with
            the time range shown.
          </p>
        </div>

        <div ref={comparisonRef} className="grid gap-4 grid-cols-2 lg:grid-cols-4 items-start scroll-mt-4">
          <OriginalCard sourceName={sourceName} posterUrl={youtubePosterUrl || null} />

          {displayClips.slice(0, 3).map((clip, idx) => {
            console.log("[clip url]", clip.video_url);
            const showOutcome =
              outcomeClipId === clip.id &&
              flow.selectedClip?.id === outcomeClipId &&
              outcomePhase !== "done" &&
              outcomePhase !== "idle";
            const outcomeBelow: ReactNode =
              showOutcome && (outcomePhase === "primary" || outcomePhase === "reasons" || outcomePhase === "next") ? (
                <AiCeoClipOutcomeBlock
                  phase={outcomePhase}
                  onPickYes={() => setOutcomePhase("reasons")}
                  onPickNotYet={() => setOutcomePhase("next")}
                  onHaventPosted={() => {
                    emitClipOutcome("unknown");
                    setOutcomePhase("done");
                  }}
                  onYesReason={(chip) => {
                    emitClipOutcome("good", { chip });
                    setOutcomePhase("done");
                  }}
                  onNotYetStep={(chip) => {
                    emitClipOutcome("bad", { chip });
                    setOutcomePhase("done");
                  }}
                />
              ) : null;

            return (
              <ClipColumn
                key={clip.id}
                clip={clip}
                rank={idx + 1}
                label={LABELS[idx] ?? `Option ${idx + 1}`}
                purpose={PURPOSE[idx] ?? ""}
                ctaLabel={CTA_COPY[idx] ?? "Copy"}
                rankColor={RANK_COLORS[idx] ?? "text-muted-foreground"}
                scoreTone={SCORE_TONE[idx] ?? "bg-muted text-muted-foreground"}
                isBest={idx === 0}
                isSelected={flow.selectedClip?.id === clip.id}
                isPlaying={playingId === clip.id}
                copied={copied && flow.selectedClip?.id === clip.id}
                onPlay={() => setPlayingId(clip.id)}
                onStop={() => setPlayingId(null)}
                onCopy={() => {
                  if (import.meta.env.DEV) {
                    console.log("[mvp-flow] ClipColumn button onClick (label: Use this clip)", {
                      clipId: clip.id,
                      label: LABELS[idx],
                    });
                  }
                  void handleCopy(clip, LABELS[idx] ?? `Option ${idx + 1}`);
                }}
                belowCta={outcomeBelow}
              />
            );
          })}
        </div>

        <p className="mt-10 text-center text-[11px] text-muted-foreground/70">
          Priority scores are for sorting only—not a guarantee of performance.
        </p>

        {hasClipSelection && selectedClipRow && selectedClipLabelResolved ? (
          <p
            className="mt-6 rounded-lg border border-foreground/20 bg-muted/30 px-4 py-3 text-sm text-foreground"
            role="status"
          >
            <span className="font-semibold">Selected clip:</span> {selectedClipLabelResolved} · {clipTimeLabelForStep4}
          </p>
        ) : null}

        <div
          ref={thumbnailRef}
          className="mt-16 border-t border-border/40 pt-10 scroll-mt-4"
          data-mvp-step="3-thumbnail"
          data-mvp-flow-revision={getFlowStoreRevision()}
        >
          <div className="mb-6 max-w-2xl">
            <div className="mb-2 inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
              <ImageIcon className="h-3.5 w-3.5" />
              Step 3 — Pick your thumbnail angle
            </div>
            <h2 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Pick your thumbnail angle
            </h2>
            <p className="mt-2 text-muted-foreground">
              Text-first angles with your real video still behind them—pick one to test first.
            </p>
          </div>
          {!hasClipSelection ? (
            <div
              className="mb-6 rounded-lg border border-amber-500/35 bg-amber-500/[0.07] px-4 py-3 text-sm text-foreground"
              role="status"
            >
              Pick a clip to continue
            </div>
          ) : null}
          {import.meta.env.DEV
            ? (() => {
                console.log("THUMB HANDOFF URLS", thumbnailTemplates.map((t) => ({
                  id: t.id,
                  imageUrl: t.imageUrl,
                  label: t.label,
                })));
                console.log("[thumb-handoff]", {
                  thumbnails: thumbnailTemplates.map((t) => ({
                    id: t.id,
                    imageUrl: t.imageUrl,
                    label: t.label,
                  })),
                });
                return null;
              })()
            : null}
          <ThumbnailSelector
            key={flow.selectedClip?.id ?? "no-clip"}
            thumbnails={thumbnailTemplates}
            recommendedId="shock"
            aiHint="Suggested first test: Shock — you can change angle anytime."
            initialSelectedId={flow.selectedThumbnail?.id ?? null}
            initialConfirmed={hasThumbnailSelection}
            disabled={!hasClipSelection}
            onSelect={(item) => handleThumbnailSelect(templateToThumbnailOption(item))}
            onContinue={() => readyToPostRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
          />
          {hasThumbnailSelection && selectedThumbResolved ? (
            <div className="mt-8 flex flex-col gap-3 rounded-lg border border-border/50 bg-muted/20 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <p className="text-sm text-foreground" role="status">
                <span className="font-semibold">Selected thumbnail:</span> {selectedThumbResolved.name}
              </p>
              <Button
                type="button"
                variant="default"
                className="shrink-0"
                onClick={() =>
                  readyToPostRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
                }
              >
                Continue
              </Button>
            </div>
          ) : null}
        </div>

        <div ref={readyToPostRef} className="scroll-mt-4">
          {hasClipSelection && selectedThumbResolved ? (
            <ReadyToPost
              clip={selectedClipRow ?? bestClip}
              thumbnail={selectedThumbResolved}
              clipTimeLabel={clipTimeLabelForStep4}
              clipRankLabel={selectedClipLabelResolved ?? undefined}
              onChangeThumbnail={handleChangeThumbnail}
              onRunAnotherTest={handleRunAnotherTest}
            />
          ) : hasClipSelection ? (
            <section className="mt-16 rounded-2xl border border-dashed border-border/60 bg-muted/20 p-6 sm:p-8">
              <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                Step 4 — Post and track performance
              </p>
              <p className="mt-2 text-base font-semibold text-foreground">Pick a thumbnail to continue</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Choose and confirm a thumbnail in Step 3 to unlock posting, your link, and performance tracking.
              </p>
            </section>
          ) : null}
        </div>

        <section className="mt-14 overflow-hidden rounded-2xl border border-foreground/15 bg-foreground text-background shadow-2xl shadow-black/30">
          <div className="p-6 sm:p-10">
            <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-widest text-background/60">
              <BarChart3 className="h-3.5 w-3.5" />
              Next — Your dashboard
            </div>

            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
              Your dashboard
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-background/70 sm:text-base">
              After you post, add views, likes, and comments here so you can compare this run to the next one.
            </p>

            <button
              type="button"
              onClick={handleGoToDashboard}
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-md bg-background px-6 py-3 text-base font-semibold text-foreground transition-transform hover:scale-[1.02] active:scale-100"
            >
              Go to dashboard
              <ArrowRight className="h-4 w-4" />
            </button>

            <p className="mt-3 text-xs text-background/60">
              You can post now and return once your video is live, or paste your video link to start tracking.
            </p>
          </div>
        </section>

        <MiniDashboardPreview />
        <LoopExplainer />
      </main>
    </div>
  );
}

function OriginalCard({
  sourceName,
  posterUrl,
}: {
  sourceName: string;
  posterUrl?: string | null;
}) {
  const poster = posterUrl?.trim();
  return (
    <div className="flex flex-col">
      <div className="mb-2 flex items-center justify-between text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
        <span>Source video</span>
      </div>
      <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-border/40 bg-muted">
        {poster ? (
          <img
            src={poster}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
            width={1024}
            height={576}
          />
        ) : (
          <div className="flex h-full min-h-[120px] w-full items-center justify-center px-3 text-center text-[11px] text-muted-foreground">
            YouTube still loads when the link is valid
          </div>
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-background/30 pointer-events-none">
          <span className="rounded-md bg-background/80 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-foreground backdrop-blur-sm">
            Source
          </span>
        </div>
      </div>
      <div className="mt-3 space-y-1">
        <p className="text-sm font-medium text-foreground truncate">{sourceName}</p>
        <p className="text-xs text-muted-foreground">Same video as all three clips</p>
      </div>
    </div>
  );
}

interface ClipColumnProps {
  clip: Clip;
  rank: number;
  label: string;
  purpose: string;
  ctaLabel: string;
  rankColor: string;
  scoreTone: string;
  isBest: boolean;
  isSelected: boolean;
  isPlaying: boolean;
  copied: boolean;
  onPlay: () => void;
  onStop: () => void;
  onCopy: () => void;
  belowCta?: ReactNode;
}

function ClipColumn({
  clip,
  rank,
  label,
  purpose,
  ctaLabel,
  rankColor,
  scoreTone,
  isBest,
  isSelected,
  isPlaying,
  copied,
  onPlay,
  onStop,
  onCopy,
  belowCta,
}: ClipColumnProps) {
  const ytId = clip.youtube_video_id ?? parseYoutubeVideoId(clip.video_url ?? "");
  const useYtEmbed = Boolean(ytId);
  const posterSrc =
    clip.thumbnail_url?.trim() ||
    (ytId ? posterUrlForYoutubeOrEmpty(ytId) : undefined);
  const directVideoUrl = typeof clip.video_url === "string" ? clip.video_url.trim() : "";
  const canPlayDirectVideo = Boolean(directVideoUrl && !useYtEmbed);
  const showTimestampOnly = !useYtEmbed && !canPlayDirectVideo;
  const embedSrc =
    useYtEmbed && isPlaying
      ? `https://www.youtube.com/embed/${ytId}?start=${Math.floor(clip.start_time)}&end=${Math.ceil(clip.end_time)}&rel=0&modestbranding=1`
      : null;

  const lengthSec = clipDurationSeconds(clip.start_time, clip.end_time);
  const lengthLabel = formatClipLengthLabel(lengthSec);

  return (
    <div className={`flex flex-col ${isBest ? "lg:-mt-2" : ""}`}>
      <div className="mb-2 flex items-center justify-between text-[11px] font-medium uppercase tracking-widest">
        <span className={isBest ? "text-foreground" : "text-muted-foreground"}>
          {label}
        </span>
        <span className="flex flex-wrap items-center justify-end gap-1">
          {isBest && (
            <span className="inline-flex items-center gap-1 rounded-full bg-foreground px-2 py-0.5 text-[10px] font-bold text-background">
              <Sparkles className="h-2.5 w-2.5" />
              Suggested first
            </span>
          )}
          {isSelected && (
            <span className="inline-flex items-center rounded-full border border-foreground/40 bg-background px-2 py-0.5 text-[10px] font-semibold text-foreground">
              Your pick
            </span>
          )}
        </span>
      </div>

      <div
        className={`relative aspect-video w-full overflow-hidden rounded-lg bg-muted transition-all ${
          isBest
            ? "ring-2 ring-foreground shadow-2xl shadow-black/50"
            : isSelected
              ? "ring-2 ring-foreground/40 shadow-md"
              : "border border-border/40 hover:border-border/70"
        }`}
      >
        {isPlaying && useYtEmbed && embedSrc ? (
          <>
            <iframe
              title={`YouTube preview — ${label}`}
              src={embedSrc}
              className="absolute inset-0 h-full w-full border-0 bg-black"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
            <button
              type="button"
              onClick={onStop}
              aria-label="Close player"
              className="absolute right-1.5 top-1.5 z-10 inline-flex h-6 w-6 items-center justify-center rounded-full bg-background/90 text-foreground hover:bg-background"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </>
        ) : canPlayDirectVideo ? (
          <video src={directVideoUrl} controls className="h-full w-full bg-black object-cover" />
        ) : (
          <>
            {posterSrc ? (
              <img
                src={posterSrc}
                alt=""
                className="h-full w-full object-cover"
                loading="lazy"
                width={1024}
                height={576}
              />
            ) : (
              <div className="h-full w-full bg-muted" />
            )}

            <div className="absolute left-2 top-2 flex items-center gap-1">
              <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold shadow-sm ${scoreTone}`}>
                {clip.score}
              </span>
              <span className={`rounded-md bg-background/90 px-1.5 py-0.5 text-[10px] font-semibold backdrop-blur-sm ${rankColor}`}>
                #{rank} of 3
              </span>
            </div>

            <div className="absolute right-2 top-2 flex flex-col items-end gap-1">
              <span className="rounded-md bg-background/85 px-1.5 py-0.5 text-[10px] font-medium text-foreground backdrop-blur-sm">
                {formatTime(clip.start_time)}–{formatTime(clip.end_time)}
              </span>
              <span
                className="rounded-md bg-foreground px-1.5 py-0.5 text-[10px] font-bold text-background backdrop-blur-sm"
                title="Clip length = end_time − start_time"
              >
                {lengthLabel}
              </span>
            </div>

            <button
              type="button"
              onClick={onPlay}
              disabled={showTimestampOnly}
              aria-label={!showTimestampOnly ? `Play preview for ${label}` : "No preview yet"}
              className="group absolute inset-0 flex items-center justify-center bg-black/10 transition-colors hover:bg-black/30 disabled:cursor-default disabled:hover:bg-black/10"
            >
              {!showTimestampOnly ? (
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-background/90 shadow-lg backdrop-blur-sm transition-transform group-hover:scale-110">
                  <Play className="h-5 w-5 fill-foreground text-foreground ml-0.5" />
                </span>
              ) : (
                <span className="rounded-md bg-background/85 px-2 py-1 text-[10px] font-medium text-foreground/70 backdrop-blur-sm">
                  Timestamps only
                </span>
              )}
            </button>
          </>
        )}
      </div>

      <p className="mt-2 text-[11px] text-muted-foreground">
        <span className="font-semibold text-foreground">Length {lengthLabel}</span>
        <span className="mx-1.5 text-muted-foreground/50">·</span>
        <span className="font-mono tabular-nums text-foreground/90">
          {formatTime(clip.start_time)}–{formatTime(clip.end_time)}
        </span>
      </p>

      <div className="mt-2 flex items-baseline justify-between gap-2">
        <p className={`text-xs font-semibold ${rankColor}`}>{purpose}</p>
        <p className={`text-[11px] font-medium text-muted-foreground`}>Slot {rank} of 3</p>
      </div>

      <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-foreground/80">
        {clip.caption}
      </p>

      {isBest ? (
        <div className="mt-4 space-y-2.5">
          <p className="text-xs leading-relaxed text-muted-foreground">
            <span className="font-semibold text-foreground">Suggested first test:</span>{" "}
            use this window or pick another slot—same video, different segment.
          </p>
          <button
            type="button"
            data-testid={`mvp-use-this-clip-${clip.id}`}
            data-mvp-action="use-this-clip"
            onClick={onCopy}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-foreground px-4 py-2.5 text-sm font-semibold text-background transition-transform hover:scale-[1.02] active:scale-100"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4" />
                Copied — paste it now
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                {ctaLabel}
              </>
            )}
          </button>
          {belowCta}
        </div>
      ) : (
        <div className="mt-4">
          <button
            type="button"
            data-testid={`mvp-use-this-clip-${clip.id}`}
            data-mvp-action="use-this-clip"
            onClick={onCopy}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-border/60 bg-transparent px-3 py-2 text-xs font-medium text-foreground/80 transition-colors hover:border-foreground/60 hover:text-foreground"
          >
            <Copy className="h-3.5 w-3.5" />
            {ctaLabel}
          </button>
          {belowCta}
        </div>
      )}
    </div>
  );
}