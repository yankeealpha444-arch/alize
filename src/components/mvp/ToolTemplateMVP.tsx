import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import type { MvpBuilderConfig, ToolSubtypeUiConfig } from "@/lib/mvp/types";
import {
  detectToolSubtype,
  getIdeaTextForToolTemplate,
  isImageToolMode,
  resolveToolTemplateUi,
} from "@/lib/mvp/toolTemplateSubtype";
import {
  detectTextToolProductIntent,
  mockTextRewriteVersions,
  type TextRewriteCard,
} from "@/lib/mvp/textToolProductUi";
import { countMvpEventsByType, getMvpEventsForProject, trackMvpEvent } from "@/lib/mvp/mvpEventTracking";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DEDICATED_CALC_ROOT,
  DedicatedCalculatorActions,
  DedicatedCalculatorHeader,
  DedicatedInputsHeading,
  DedicatedResultsBlock,
} from "@/components/pipeline/dedicatedCalculatorChrome";
import { cn } from "@/lib/utils";

type Props = {
  projectId: string;
  config: MvpBuilderConfig;
  /** When set (e.g. multi-tool segment), subtype/UI resolve from this text instead of the project idea. */
  ideaTextOverride?: string;
};

/** Simulated “after” look — distinct from variation cards. */
const AFTER_FILTER = "brightness(1.06) contrast(1.1) saturate(1.18)";

const VARIATION_FILTERS = [
  "brightness(1.04) contrast(1.12) saturate(1.1) hue-rotate(-3deg)",
  "brightness(1.08) contrast(1.06) saturate(1.14) sepia(0.06)",
  "brightness(1.02) contrast(1.14) saturate(1.08) hue-rotate(5deg)",
];

function defaultInsights(ui: ToolSubtypeUiConfig): [string, string] {
  const b = ui.nextStepsBullets;
  return [
    b?.[0] ?? "Compare the output to what you want to ship.",
    b?.[1] ?? "Adjust inputs and calculate again to refine.",
  ];
}

/** TOOL_TEMPLATE — aligned with dedicated calculator chrome: inputs → calculate + reset → results + insights. */
export default function ToolTemplateMVP({ projectId, config, ideaTextOverride }: Props) {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<string | null>(null);
  /** text_tool: structured version cards */
  const [rewriteVersions, setRewriteVersions] = useState<TextRewriteCard[] | null>(null);
  const [selectedVersionIndex, setSelectedVersionIndex] = useState<number | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageRunDone, setImageRunDone] = useState(false);
  const [thumbFiles, setThumbFiles] = useState<File[]>([]);
  const [thumbUrls, setThumbUrls] = useState<string[]>([]);
  const [thumbRunDone, setThumbRunDone] = useState(false);
  const [hybridRunDone, setHybridRunDone] = useState(false);
  const [, setBump] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const thumbInputRef = useRef<HTMLInputElement>(null);
  const hybridThumbInputRef = useRef<HTMLInputElement>(null);

  const ideaForSubtype = ideaTextOverride ?? getIdeaTextForToolTemplate(projectId);
  const toolSubtype = useMemo(
    () => detectToolSubtype(config.productName, ideaForSubtype),
    [config.productName, ideaForSubtype],
  );
  const titleThumbnailHybrid = toolSubtype === "title_thumbnail_test_tool";
  const thumbnailCompare = toolSubtype === "thumbnail_compare_tool";
  const imageMode = useMemo(
    () =>
      !titleThumbnailHybrid &&
      !thumbnailCompare &&
      isImageToolMode(config.productName, ideaForSubtype),
    [titleThumbnailHybrid, thumbnailCompare, config.productName, ideaForSubtype],
  );

  const textRewriteMode = useMemo(
    () => toolSubtype === "text_tool" && !titleThumbnailHybrid && !thumbnailCompare && !imageMode,
    [toolSubtype, titleThumbnailHybrid, thumbnailCompare, imageMode],
  );

  const textToolIntent = useMemo(
    () => detectTextToolProductIntent(config.productName, ideaForSubtype),
    [config.productName, ideaForSubtype],
  );

  const ui = useMemo(
    () => resolveToolTemplateUi(config, projectId, ideaTextOverride),
    [config.productName, config.templateId, config.decidedAt, projectId, ideaForSubtype, ideaTextOverride],
  );

  useEffect(() => {
    if (!imageFile) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(imageFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  useEffect(() => {
    const urls = thumbFiles.map((f) => URL.createObjectURL(f));
    setThumbUrls(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [thumbFiles]);

  useEffect(() => {
    trackMvpEvent("page_view", projectId, {
      template: "TOOL_TEMPLATE",
      image_mode: imageMode,
      tool_subtype: toolSubtype,
      text_tool_intent: textToolIntent,
    });
  }, [projectId, imageMode, toolSubtype, textToolIntent]);

  useEffect(() => {
    if (!rewriteVersions?.length) return;
    rewriteVersions.forEach((_, i) => {
      trackMvpEvent("version_viewed", projectId, { version_index: i + 1, text_tool_intent: textToolIntent });
    });
  }, [rewriteVersions, projectId, textToolIntent]);

  useEffect(() => {
    const fn = () => setBump((n) => n + 1);
    window.addEventListener("alize-mvp-tracking-updated", fn);
    return () => window.removeEventListener("alize-mvp-tracking-updated", fn);
  }, []);

  const refreshMetrics = () => setBump((n) => n + 1);
  const counts = countMvpEventsByType(projectId);
  const events = getMvpEventsForProject(projectId);
  const savesCount = events.filter(
    (e) =>
      (e.event_type === "button_clicked" && (e.meta as { action?: string } | null)?.action === "save_result") ||
      e.event_type === "message_copied",
  ).length;

  const pickImageFile = (file: File | undefined) => {
    if (!file || !file.type.startsWith("image/")) return;
    setImageFile(file);
    setImageRunDone(false);
  };

  const addThumbnailFiles = (files: File[]) => {
    const imgs = files.filter((f) => f.type.startsWith("image/"));
    setThumbFiles((prev) => {
      const next = [...prev];
      for (const f of imgs) {
        if (next.length >= 3) break;
        next.push(f);
      }
      return next;
    });
    setThumbRunDone(false);
    setHybridRunDone(false);
  };

  const run = () => {
    if (titleThumbnailHybrid) {
      if (!input.trim() || thumbFiles.length === 0) return;
      trackMvpEvent("input_submitted", projectId, {
        title_thumbnail_hybrid: true,
        title_len: input.trim().length,
        thumb_count: thumbFiles.length,
      });
      setHybridRunDone(true);
      trackMvpEvent("result_generated", projectId, {
        title_thumbnail_hybrid: true,
        thumb_count: thumbFiles.length,
      });
      refreshMetrics();
      return;
    }
    if (thumbnailCompare) {
      if (thumbFiles.length === 0) return;
      trackMvpEvent("input_submitted", projectId, {
        thumbnail_compare: true,
        count: thumbFiles.length,
      });
      setThumbRunDone(true);
      trackMvpEvent("result_generated", projectId, { thumbnail_compare: true, count: thumbFiles.length });
      refreshMetrics();
      return;
    }
    if (imageMode) {
      if (!imageFile) return;
      trackMvpEvent("input_submitted", projectId, {
        image_mode: true,
        name: imageFile.name,
        size: imageFile.size,
      });
      setImageRunDone(true);
      trackMvpEvent("result_generated", projectId, { image_mode: true, bytes: imageFile.size });
      refreshMetrics();
      return;
    }

    if (textRewriteMode) {
      const trimmed = input.trim();
      trackMvpEvent("improve_clicked", projectId, { length: input.length, text_tool_intent: textToolIntent });
      trackMvpEvent("input_submitted", projectId, { length: input.length, text_rewrite: true, text_tool_intent: textToolIntent });
      if (!trimmed) {
        setRewriteVersions(null);
        setSelectedVersionIndex(null);
        trackMvpEvent("result_generated", projectId, { bytes: 0, text_rewrite: true, empty: true });
        refreshMetrics();
        return;
      }
      setSelectedVersionIndex(null);
      const cards = mockTextRewriteVersions(textToolIntent, trimmed);
      setRewriteVersions(cards);
      trackMvpEvent("result_generated", projectId, {
        bytes: trimmed.length,
        text_rewrite: true,
        versions: cards.length,
        text_tool_intent: textToolIntent,
      });
      refreshMetrics();
      return;
    }

    trackMvpEvent("input_submitted", projectId, { length: input.length });
    const trimmed = input.trim();
    const mock = trimmed
      ? `${ui.resultTitle}\n—\n${trimmed.slice(0, 200)}${trimmed.length > 200 ? "…" : ""}`
      : ui.emptyRunMessage;
    setResult(mock);
    trackMvpEvent("result_generated", projectId, { bytes: mock.length });
    refreshMetrics();
  };

  const outputReady = titleThumbnailHybrid
    ? hybridRunDone
    : thumbnailCompare
      ? thumbRunDone
      : imageMode
        ? imageRunDone
        : textRewriteMode
          ? rewriteVersions !== null && rewriteVersions.length > 0
          : result !== null;

  const handleTryAgain = () => {
    setResult(null);
    setRewriteVersions(null);
    setSelectedVersionIndex(null);
    setImageRunDone(false);
    setImageFile(null);
    setThumbFiles([]);
    setThumbRunDone(false);
    setHybridRunDone(false);
    setInput("");
    trackMvpEvent("button_clicked", projectId, {
      action: "try_again",
      image_mode: imageMode,
      thumbnail_compare: thumbnailCompare,
      title_thumbnail_hybrid: titleThumbnailHybrid,
      text_rewrite: textRewriteMode,
    });
    refreshMetrics();
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    pickImageFile(e.dataTransfer.files?.[0]);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const onThumbDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addThumbnailFiles(Array.from(e.dataTransfer.files ?? []));
  };

  const onHybridThumbDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addThumbnailFiles(Array.from(e.dataTransfer.files ?? []));
  };

  const headerTitle = ui.surfaceTitle ?? config.productName;
  const headerSubtitle = [ui.surfaceSubtitle, ui.guidingLine, ui.headerDetail].filter(Boolean).join(" — ") || ui.guidingLine;

  const resultsSection = useMemo(() => {
    if (!outputReady) return null;

    if (titleThumbnailHybrid) {
      return (
        <>
          <DedicatedResultsBlock
            primaryLabel="Title"
            primaryValue={input.trim().slice(0, 96) + (input.trim().length > 96 ? "…" : "") || "—"}
            secondaryLabel="Thumbnails"
            secondaryValue={String(thumbUrls.length)}
            insights={defaultInsights(ui)}
          />
          <section className="space-y-4" aria-live="polite">
            <p className="text-lg font-semibold text-foreground text-center leading-snug px-2">{input.trim()}</p>
            <div className="grid grid-cols-3 gap-3">
              {thumbUrls.map((u, i) => (
                <div key={u + i} className="space-y-2 rounded-lg border border-border bg-background p-2 shadow-sm">
                  <p className="text-[10px] text-center font-medium text-muted-foreground">Combo {i + 1}</p>
                  <img src={u} alt="" className="w-full aspect-video object-cover rounded-md border border-border" />
                </div>
              ))}
            </div>
          </section>
        </>
      );
    }
    if (thumbnailCompare) {
      return (
        <>
          <DedicatedResultsBlock
            primaryLabel="Thumbnails compared"
            primaryValue={String(thumbUrls.length)}
            secondaryLabel="Layout"
            secondaryValue="Grid"
            insights={defaultInsights(ui)}
          />
          <section className="space-y-3" aria-live="polite">
            <div className="grid grid-cols-3 gap-3">
              {thumbUrls.map((u, i) => (
                <img key={u + i} src={u} alt="" className="w-full aspect-square object-cover rounded-lg border border-border" />
              ))}
            </div>
          </section>
        </>
      );
    }
    if (imageMode && previewUrl) {
      return (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">Before</p>
              <img src={previewUrl} alt="" className="w-full aspect-video object-cover rounded-lg border border-border" />
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">After</p>
              <img
                src={previewUrl}
                alt=""
                style={{ filter: AFTER_FILTER }}
                className="w-full aspect-video object-cover rounded-lg border border-border"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Variations</p>
            <div className="grid grid-cols-3 gap-2">
              {VARIATION_FILTERS.map((fl, i) => (
                <div key={i} className="space-y-1">
                  <img
                    src={previewUrl}
                    alt=""
                    style={{ filter: fl }}
                    className="w-full aspect-square object-cover rounded-lg border border-border"
                  />
                  <p className="text-[10px] text-center text-muted-foreground">Option {i + 1}</p>
                </div>
              ))}
            </div>
          </div>
          <DedicatedResultsBlock
            primaryLabel="Status"
            primaryValue="Processed"
            secondaryLabel="Variations"
            secondaryValue="3"
            insights={[
              "Review before / after and the three styled options.",
              "Reset to try a different image.",
            ]}
          />
        </>
      );
    }
    if (textRewriteMode && rewriteVersions?.length) {
      const v0 = rewriteVersions[0];
      const v1 = rewriteVersions[1] ?? v0;
      return (
        <>
          <DedicatedResultsBlock
            primaryLabel="Versions"
            primaryValue={String(rewriteVersions.length)}
            secondaryLabel="Selected"
            secondaryValue={selectedVersionIndex !== null ? `Version ${selectedVersionIndex + 1}` : "—"}
            insights={[
              `${v0.angle}: open a card below to compare angles.`,
              `${v1.angle}: pick the clearest fit, then copy or reset.`,
            ]}
          />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {rewriteVersions.map((card, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  setSelectedVersionIndex(i);
                  trackMvpEvent("version_selected", projectId, {
                    version_index: i + 1,
                    angle: card.angle,
                    text_tool_intent: textToolIntent,
                  });
                }}
                className={cn(
                  "rounded-lg border bg-background p-4 shadow-sm flex flex-col gap-2 text-left min-h-[140px] transition-colors",
                  "hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  selectedVersionIndex === i ? "border-primary ring-2 ring-primary/30" : "border-border",
                )}
              >
                <p className="text-xs font-semibold text-primary uppercase tracking-wide">{card.angle}</p>
                <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed text-left">{card.text}</p>
                <span className="text-[10px] text-muted-foreground mt-auto pt-1">Select best version</span>
              </button>
            ))}
          </div>
        </>
      );
    }
    if (result) {
      const head = result.split("\n")[0] ?? result;
      const rest = result.includes("\n") ? result.slice(result.indexOf("\n") + 1).trim() : "";
      return (
        <DedicatedResultsBlock
          primaryLabel="Preview"
          primaryValue={<span className="text-xl sm:text-2xl font-bold break-words whitespace-pre-wrap">{head}</span>}
          secondaryLabel="Detail"
          secondaryValue={
            rest ? (
              <span className="text-lg font-semibold tabular-nums whitespace-pre-wrap break-words">{rest.slice(0, 400)}</span>
            ) : (
              `${result.length} characters`
            )
          }
          insights={defaultInsights(ui)}
        />
      );
    }
    return null;
  }, [
    outputReady,
    titleThumbnailHybrid,
    thumbnailCompare,
    imageMode,
    textRewriteMode,
    input,
    thumbUrls.length,
    previewUrl,
    rewriteVersions,
    selectedVersionIndex,
    result,
    ui,
    projectId,
    textToolIntent,
  ]);

  const calculateDisabled =
    titleThumbnailHybrid
      ? !input.trim() || thumbFiles.length === 0
      : thumbnailCompare
        ? thumbFiles.length === 0
        : imageMode
          ? !imageFile
          : false;

  return (
    <div className={DEDICATED_CALC_ROOT}>
      <DedicatedCalculatorHeader kicker="Preview" title={headerTitle} description={headerSubtitle} />

      <div className="space-y-4">
        <DedicatedInputsHeading />
        <div className="flex flex-col gap-6 max-w-xl mx-auto w-full">
          {titleThumbnailHybrid ? (
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-foreground" htmlFor={`tool-hybrid-title-${projectId}`}>
                  {ui.textInputLabel ?? "Video Title"}
                </label>
                <textarea
                  id={`tool-hybrid-title-${projectId}`}
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    setHybridRunDone(false);
                  }}
                  placeholder={ui.textInputPlaceholder ?? ""}
                  rows={3}
                  className={cn(
                    "w-full min-h-[88px] rounded-xl border border-border bg-background px-4 py-3 text-base",
                    "placeholder:text-muted-foreground/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  )}
                />
              </div>
              <div className="space-y-3">
                <label className="block text-sm font-medium text-foreground" htmlFor={`tool-hybrid-thumbs-${projectId}`}>
                  {ui.imageUploadLabel ?? ui.inputLabel}
                </label>
                <input
                  ref={hybridThumbInputRef}
                  id={`tool-hybrid-thumbs-${projectId}`}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/*"
                  multiple
                  className="sr-only"
                  onChange={(e) => {
                    addThumbnailFiles(Array.from(e.target.files ?? []));
                    e.target.value = "";
                  }}
                />
                <div
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") hybridThumbInputRef.current?.click();
                  }}
                  onClick={() => hybridThumbInputRef.current?.click()}
                  onDragOver={onDragOver}
                  onDrop={onHybridThumbDrop}
                  className={cn(
                    "rounded-xl border-2 border-dashed border-border bg-muted/10 py-8 px-6 transition-colors min-h-[160px] flex flex-col items-center justify-center gap-2",
                    "cursor-pointer hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    thumbFiles.length > 0 && "border-solid",
                  )}
                >
                  <p className="text-sm text-muted-foreground leading-relaxed max-w-md mx-auto text-center">{ui.uploadHelper}</p>
                  <p className="text-sm font-medium text-foreground tabular-nums">
                    {thumbFiles.length}/3 uploaded
                  </p>
                  {ui.uploadAcceptedText ? (
                    <p className="text-xs text-muted-foreground">{ui.uploadAcceptedText}</p>
                  ) : null}
                  {thumbUrls.length > 0 ? (
                    <div className="flex flex-wrap justify-center gap-2 pt-2 w-full">
                      {thumbUrls.map((u, i) => (
                        <img key={u + i} src={u} alt="" className="h-16 w-16 object-cover rounded-lg border border-border" />
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ) : thumbnailCompare ? (
            <div className="space-y-4">
              <label className="block text-sm font-medium text-foreground" htmlFor={`tool-thumbs-${projectId}`}>
                {ui.inputLabel}
              </label>
              <input
                ref={thumbInputRef}
                id={`tool-thumbs-${projectId}`}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/*"
                multiple
                className="sr-only"
                onChange={(e) => {
                  addThumbnailFiles(Array.from(e.target.files ?? []));
                  e.target.value = "";
                }}
              />
              <div
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") thumbInputRef.current?.click();
                }}
                onClick={() => thumbInputRef.current?.click()}
                onDragOver={onDragOver}
                onDrop={onThumbDrop}
                className={cn(
                  "rounded-xl border-2 border-dashed border-border bg-muted/10 py-10 px-6 transition-colors min-h-[200px] flex flex-col items-center justify-center gap-3",
                  "cursor-pointer hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  thumbFiles.length > 0 && "border-solid",
                )}
              >
                <p className="text-sm text-muted-foreground leading-relaxed max-w-md mx-auto text-center">{ui.uploadHelper}</p>
                <p className="text-sm font-medium text-foreground tabular-nums">
                  {thumbFiles.length}/3 uploaded
                </p>
                {ui.uploadAcceptedText ? (
                  <p className="text-xs text-muted-foreground">{ui.uploadAcceptedText}</p>
                ) : null}
                {thumbUrls.length > 0 ? (
                  <div className="flex flex-wrap justify-center gap-2 pt-2 w-full">
                    {thumbUrls.map((u, i) => (
                      <img key={u + i} src={u} alt="" className="h-20 w-20 object-cover rounded-lg border border-border" />
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          ) : imageMode ? (
            <div className="space-y-4">
              <label className="block text-sm font-medium text-foreground" htmlFor={`tool-file-${projectId}`}>
                {ui.inputLabel}
              </label>
              <input
                ref={fileInputRef}
                id={`tool-file-${projectId}`}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => pickImageFile(e.target.files?.[0])}
              />
              <div
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click();
                }}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={onDragOver}
                onDrop={onDrop}
                className={cn(
                  "rounded-xl border-2 border-dashed border-border bg-muted/10 py-10 px-6 transition-colors min-h-[200px] flex flex-col items-center justify-center",
                  "cursor-pointer hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  previewUrl && "border-solid",
                )}
              >
                {previewUrl ? (
                  <div className="space-y-4 w-full">
                    <img src={previewUrl} alt="" className="max-h-56 w-full object-contain rounded-lg mx-auto" />
                    <p className="text-sm text-muted-foreground text-center">Replace image</p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground leading-relaxed max-w-md mx-auto text-center">{ui.inputPlaceholder}</p>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <label className="block text-sm font-medium text-foreground" htmlFor={`tool-in-${projectId}`}>
                {ui.inputLabel}
              </label>
              <textarea
                id={`tool-in-${projectId}`}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  if (textRewriteMode) {
                    setRewriteVersions(null);
                    setSelectedVersionIndex(null);
                  }
                }}
                onPaste={() => {
                  if (textRewriteMode) {
                    trackMvpEvent("message_pasted", projectId, { text_tool_intent: textToolIntent });
                  }
                }}
                placeholder={ui.inputPlaceholder}
                rows={6}
                className={cn(
                  "w-full min-h-[168px] rounded-xl border border-border bg-background px-4 py-4 text-base",
                  "placeholder:text-muted-foreground/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                )}
              />
            </div>
          )}
        </div>
      </div>

      <DedicatedCalculatorActions
        calculateLabel={ui.primaryAction}
        onCalculate={run}
        onReset={handleTryAgain}
        disabled={calculateDisabled}
      />

      {resultsSection}

      <div className="grid grid-cols-3 gap-3">
        {(
          [
            { label: "Uses", value: counts.page_view },
            { label: "Runs", value: counts.result_generated },
            { label: "Saves", value: savesCount },
          ] as const
        ).map((row) => (
          <div
            key={row.label}
            className="rounded-2xl border border-border bg-card px-4 py-3 text-center shadow-sm"
          >
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{row.label}</p>
            <p className="text-xl font-semibold tabular-nums text-foreground mt-1">{row.value}</p>
          </div>
        ))}
      </div>

      <Card className="rounded-2xl border-border shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Dashboard</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm text-muted-foreground">
            <Link to={`/founder/${projectId}`} className="text-primary font-medium underline-offset-4 hover:underline">
              Open dashboard
            </Link>{" "}
            for project activity.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
