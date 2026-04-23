import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useNavigate } from "react-router-dom";
import { LayoutDashboard } from "lucide-react";
import { PremiumArchetypeLayout } from "@/components/mvp/premium/PremiumArchetypeLayout";
import { PremiumNextStepSection } from "@/components/mvp/premium/PremiumNextStepSection";
import { TEMPLATE_HOOK_GENERATOR } from "@/lib/internalTemplates";
import { buildYouTubeShortsGrowthHookProductFrame } from "@/lib/mvp/productFraming";
import { premiumTheme } from "@/lib/mvp/premiumTheme";
import {
  generateYouTubeShortsFunnelHooks,
  hooksMatchCanonicalYouTubeShortsFunnel,
  refineHookText,
  YOUTUBE_SHORTS_FUNNEL_HOOK_COUNT,
  type RefinementKind,
} from "@/lib/hookGeneratorEngine";
import { detectNicheAndAudience } from "@/lib/ideaRouting";
import {
  emptyHookGeneratorState,
  getHookGeneratorState,
  getSanitizedIdeaForDisplay,
  saveHookGeneratorState,
  setIdeaContext,
  setProductFrame,
  type HookGeneratorProductState,
} from "@/lib/projectData";
import { trackTemplateEvent } from "@/lib/templateTracking";
import { trackEvent } from "@/lib/trackingEvents";
import { recordHookAngleSelected, recordRefinement } from "@/lib/learningStore";

/** Funnel: pick clip hook → preview → refine (shorter / stronger / emotional). */
const FUNNEL_REFINE_OPTIONS: { kind: RefinementKind; label: string }[] = [
  { kind: "shorter", label: "Make it shorter" },
  { kind: "aggressive", label: "Make it stronger" },
  { kind: "emotional", label: "Make it more emotional" },
];

/** Stored on output_refined events for analytics (matches internal metrics buckets). */
const REFINEMENT_EVENT_LABEL: Record<RefinementKind, "more_curiosity" | "more_aggressive" | "shorter" | "more_emotional"> = {
  curiosity: "more_curiosity",
  aggressive: "more_aggressive",
  shorter: "shorter",
  emotional: "more_emotional",
};

type Props = {
  projectId: string;
  /** When set (e.g. public page from Supabase), used to generate hooks if local project state is empty. */
  ideaSeed?: string;
  /** Hide founder dashboard shortcut (e.g. anonymous public viewers). */
  hideDashboardFab?: boolean;
};

type FunnelPhase = "pick" | "preview" | "refine" | "after_copy";

const HOOKS_IN_FUNNEL = YOUTUBE_SHORTS_FUNNEL_HOOK_COUNT;

function subscribeProjectIdea(projectId: string, onChange: () => void) {
  const h = (e: Event) => {
    const id = (e as CustomEvent<{ projectId?: string }>).detail?.projectId;
    if (id === undefined || id === projectId) onChange();
  };
  window.addEventListener("alize-project-data-updated", h);
  return () => window.removeEventListener("alize-project-data-updated", h);
}

export default function HookGeneratorMVP({ projectId, ideaSeed, hideDashboardFab }: Props) {
  const navigate = useNavigate();
  const [state, setState] = useState<HookGeneratorProductState>(() => getHookGeneratorState(projectId));
  const [funnelPhase, setFunnelPhase] = useState<FunnelPhase>("pick");
  const [ctaUnlocked, setCtaUnlocked] = useState(false);
  const [copyDone, setCopyDone] = useState(false);
  const [lastRefinementKind, setLastRefinementKind] = useState<RefinementKind | null>(null);

  const subscribe = useCallback((onChange: () => void) => subscribeProjectIdea(projectId, onChange), [projectId]);
  const ideaText = useSyncExternalStore(
    subscribe,
    () => getSanitizedIdeaForDisplay(projectId, ideaSeed),
    () => getSanitizedIdeaForDisplay(projectId, ideaSeed),
  );

  const productFrame = useMemo(
    () => buildYouTubeShortsGrowthHookProductFrame(ideaText, state.audience),
    [ideaText, state.audience],
  );

  useEffect(() => {
    setProductFrame(productFrame, projectId);
  }, [projectId, productFrame]);

  useEffect(() => {
    trackTemplateEvent("template_viewed", TEMPLATE_HOOK_GENERATOR.template_id, projectId);
  }, [projectId]);

  useEffect(() => {
    setFunnelPhase("pick");
    setCtaUnlocked(false);
    setLastRefinementKind(null);
  }, [projectId]);

  /** Seed or migrate to the canonical 5 Shorts clip hooks (matches preview + funnel count). Runs before funnel restore so localStorage matches selection. */
  useEffect(() => {
    const idea = ideaText;
    if (!idea || idea === "Loading...") return;
    const st = getHookGeneratorState(projectId);
    if (st.hooks.length > 0 && hooksMatchCanonicalYouTubeShortsFunnel(st.hooks)) return;

    const ctx = detectNicheAndAudience(idea);
    setIdeaContext(ctx.niche, ctx.audience, projectId);
    const hooks = generateYouTubeShortsFunnelHooks();

    let selectedHookId: string | undefined;
    let refinedHookText = "";
    let feedbackHelpful: boolean | null = null;
    if (st.hooks.length > 0 && st.selectedHookId) {
      const prevHook = st.hooks.find((h) => h.id === st.selectedHookId);
      if (prevHook) {
        const match = hooks.find((h) => h.text === prevHook.text);
        if (match) {
          selectedHookId = match.id;
          const refined = st.refinedHookText.trim();
          refinedHookText = refined && refined !== prevHook.text ? refined : match.text;
          feedbackHelpful = st.feedbackHelpful;
        }
      }
    }

    const next: HookGeneratorProductState = {
      ...emptyHookGeneratorState(),
      niche: ctx.niche,
      audience: ctx.audience,
      hooks,
      lastGeneratedAt: new Date().toISOString(),
      ...(selectedHookId
        ? { selectedHookId, refinedHookText, feedbackHelpful }
        : {}),
    };
    saveHookGeneratorState(next, projectId);
    trackTemplateEvent("template_generated", TEMPLATE_HOOK_GENERATOR.template_id, projectId);
    setState(next);
  }, [projectId, ideaText]);

  /** Restore funnel position when project already has a selection (refresh / return). */
  useEffect(() => {
    const st = getHookGeneratorState(projectId);
    const selId = st.selectedHookId;
    if (!selId) return;
    const sel = st.hooks.find((h) => h.id === selId);
    if (!sel) return;
    const refined = st.refinedHookText.trim() !== sel.text.trim();
    if (refined) {
      setFunnelPhase("refine");
      setCtaUnlocked(true);
      return;
    }
    setFunnelPhase("preview");
  }, [projectId]);

  const selectedHook = useMemo(() => {
    if (!state.selectedHookId) return null;
    return state.hooks.find((h) => h.id === state.selectedHookId) ?? null;
  }, [state.hooks, state.selectedHookId]);

  const displayText = useMemo(() => {
    if (state.refinedHookText.trim()) return state.refinedHookText.trim();
    return selectedHook?.text ?? "";
  }, [state.refinedHookText, selectedHook]);

  const visibleHooks = useMemo(() => state.hooks.slice(0, HOOKS_IN_FUNNEL), [state.hooks]);

  const persist = (next: HookGeneratorProductState) => {
    setState(next);
    saveHookGeneratorState(next, projectId);
  };

  const selectHook = (h: HookGeneratorProductState["hooks"][number]) => {
    const next: HookGeneratorProductState = {
      ...state,
      selectedHookId: h.id,
      refinedHookText: h.text,
      feedbackHelpful: null,
    };
    persist(next);
    setFunnelPhase("preview");
    setCtaUnlocked(false);
    setCopyDone(false);
    setLastRefinementKind(null);
    trackTemplateEvent("output_selected", TEMPLATE_HOOK_GENERATOR.template_id, projectId, h.angle);
    recordHookAngleSelected(h.angle);
  };

  const applyRefinement = (kind: RefinementKind) => {
    const base = state.refinedHookText.trim() || selectedHook?.text || "";
    if (!base) return;
    const refined = refineHookText(base, kind);
    const next = { ...state, refinedHookText: refined, feedbackHelpful: null };
    persist(next);
    setCtaUnlocked(true);
    setLastRefinementKind(kind);
    trackTemplateEvent("output_refined", TEMPLATE_HOOK_GENERATOR.template_id, projectId, REFINEMENT_EVENT_LABEL[kind]);
    recordRefinement(kind);
  };

  const submitFeedback = (helpful: boolean) => {
    const firstFeedback = state.feedbackHelpful === null;
    const next = { ...state, feedbackHelpful: helpful };
    persist(next);
    trackTemplateEvent("feedback_submitted", TEMPLATE_HOOK_GENERATOR.template_id, projectId, helpful ? "yes" : "no");
    void trackEvent("feedback_submitted", projectId, helpful ? "yes" : "no", {
      template_id: TEMPLATE_HOOK_GENERATOR.template_id,
      ...(state.selectedHookId ? { hook_id: state.selectedHookId } : {}),
    });
    if (firstFeedback) trackTemplateEvent("template_completed", TEMPLATE_HOOK_GENERATOR.template_id, projectId);
  };

  const finalizeUse = async () => {
    if (!selectedHook || !displayText.trim() || !ctaUnlocked) return;
    try {
      await navigator.clipboard.writeText(displayText.trim());
      setCopyDone(true);
      setFunnelPhase("after_copy");
      trackTemplateEvent("output_copied", TEMPLATE_HOOK_GENERATOR.template_id, projectId);
    } catch {
      /* ignore clipboard failures */
    }
  };

  const showHookList = funnelPhase !== "after_copy";
  const showPreviewBlock = Boolean(selectedHook && funnelPhase !== "pick" && funnelPhase !== "after_copy");
  const showContinue = funnelPhase === "preview";
  const showRefinements = funnelPhase === "refine";
  const showUseNow = funnelPhase === "refine" && ctaUnlocked;
  const showPostCopy = funnelPhase === "after_copy";
  const hasAfterText = Boolean(selectedHook && displayText.trim() && displayText.trim() !== selectedHook.text.trim());
  const whatChanged =
    lastRefinementKind === "shorter"
      ? "Tightened the hook so the opening reads like a clip beat, not filler."
      : lastRefinementKind === "aggressive"
        ? "Sharpened the line so it punches in the first second of the Short."
        : lastRefinementKind === "emotional"
          ? "Added weight so viewers feel the moment behind this clip."
          : hasAfterText
            ? "Tuned the hook to match the strongest moment in your clip."
            : "No improvements yet.";

  const leftPanel = (
    <>
      <div>
        <p className={premiumTheme.contextLabel}>Your growth plan</p>
        <p className={`mt-2 ${premiumTheme.contextBody} text-muted-foreground`}>
          Turn long videos into high performing YouTube Shorts — pick the hook that earns the stop.
        </p>
      </div>
      <div>
        <p className={premiumTheme.contextLabel}>Platform</p>
        <p className={`mt-2 ${premiumTheme.contextBody}`}>YouTube Shorts</p>
      </div>
      <div>
        <p className={premiumTheme.contextLabel}>Growth goal</p>
        <p className={`mt-2 ${premiumTheme.contextBody}`}>Creators turning long videos into Shorts</p>
      </div>
      <div>
        <p className={premiumTheme.contextLabel}>Content focus</p>
        <p className={`mt-2 ${premiumTheme.contextBody}`}>Long video to Shorts clips</p>
      </div>
      <div>
        <p className={premiumTheme.contextLabel}>Current step</p>
        <p className={`mt-2 ${premiumTheme.contextBody}`}>Create hook for your best clip</p>
      </div>
      <div>
        <p className={premiumTheme.contextLabel}>Your idea</p>
        <p className={`mt-2 ${premiumTheme.contextBody}`}>{ideaText}</p>
      </div>
      <div>
        <p className={premiumTheme.contextLabel}>This session</p>
        <p className={`mt-2 ${premiumTheme.contextBody}`}>
          Pick, improve, and copy one strong hook for your best clip.
        </p>
      </div>
      <div>
        <p className={premiumTheme.contextLabel}>Selected clip hook</p>
        <p className={`mt-2 ${premiumTheme.contextBody}`}>{selectedHook?.text || "Not selected yet"}</p>
      </div>
      <div>
        <p className={premiumTheme.contextLabel}>Original hook</p>
        <p className={`mt-2 ${premiumTheme.contextBody}`}>{selectedHook?.text || "Not selected yet"}</p>
      </div>
      <div>
        <p className={premiumTheme.contextLabel}>Improved hook</p>
        <p className={`mt-2 ${premiumTheme.contextBody}`}>{hasAfterText ? displayText : "No refined hook yet"}</p>
      </div>
      <div>
        <p className={premiumTheme.contextLabel}>Why this works better</p>
        <p className={`mt-2 ${premiumTheme.contextBody}`}>{whatChanged}</p>
      </div>
    </>
  );

  return (
    <>
      <PremiumArchetypeLayout preset="generator" frame={productFrame} left={leftPanel}>
      {showHookList ? (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">Step 1: Choose a hook for your best clip</h2>
          <p className="text-sm text-muted-foreground">
            Pick the hook that best matches the exact moment people will see first.
          </p>
          <ul className="space-y-4 max-h-[min(56vh,560px)] overflow-y-auto pr-1 -mx-1 px-1 pt-1" role="list">
          {visibleHooks.map((h) => {
            const isSel = state.selectedHookId === h.id;
            const faded = funnelPhase !== "pick" && !isSel;
            return (
              <li key={h.id} className={faded ? "opacity-30 pointer-events-none transition-opacity duration-300" : ""}>
                <div
                  className={`rounded-2xl border p-6 sm:p-7 transition-all ${
                    isSel
                      ? "border-foreground/60 bg-card shadow-[0_10px_30px_-14px_rgba(2,6,23,0.55)] ring-1 ring-foreground/20"
                      : "border-border/70 bg-card/90 shadow-[0_6px_20px_-18px_rgba(2,6,23,0.45)]"
                  }`}
                >
                  <p className="text-lg sm:text-xl text-foreground leading-[1.6] tracking-[0.01em]">{h.text}</p>
                  {funnelPhase === "pick" ? (
                    <div className="mt-5">
                      <button
                        type="button"
                        onClick={() => selectHook(h)}
                        className="px-4 py-2.5 rounded-full text-sm font-medium transition-colors border border-border bg-background/70 text-foreground hover:bg-secondary/80"
                      >
                        Select this hook
                      </button>
                    </div>
                  ) : null}
                </div>
              </li>
            );
          })}
          </ul>
        </section>
      ) : null}

      {showPreviewBlock && selectedHook ? (
        <section className="space-y-5">
          <h2 className="text-lg font-semibold text-foreground">Step 2: Preview hook on your best clip</h2>
          <div className="rounded-2xl border border-foreground/25 bg-card p-6 sm:p-7 shadow-[0_18px_40px_-20px_rgba(2,6,23,0.55)]">
            <p className="text-xl sm:text-2xl font-semibold text-foreground leading-[1.5] whitespace-pre-wrap">
              {displayText}
            </p>
            {state.refinedHookText.trim() !== selectedHook.text.trim() ? (
              <p className="mt-4 text-sm text-muted-foreground/70 line-through leading-relaxed">{selectedHook.text}</p>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground">
            Best when the hook feels tied to a real moment in the clip, not generic advice.
          </p>

          {showContinue ? (
            <button
              type="button"
              onClick={() => setFunnelPhase("refine")}
              className="w-full sm:w-auto px-5 py-3 rounded-full bg-foreground text-background text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Improve this hook for Shorts
            </button>
          ) : null}

          {showRefinements ? (
            <section className="space-y-2">
              <h2 className="text-lg font-semibold text-foreground">Step 3: Improve your hook for Shorts</h2>
              <p className="text-sm text-muted-foreground">Make it sharper before you post</p>
              <div className="flex flex-wrap gap-2.5">
                {FUNNEL_REFINE_OPTIONS.map(({ kind, label }) => (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => applyRefinement(kind)}
                    className="text-xs px-3.5 py-2 rounded-full border border-border bg-background hover:bg-secondary transition-colors font-medium text-foreground/85"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </section>
          ) : null}

          {showUseNow ? (
            <button
              type="button"
              onClick={finalizeUse}
              className="w-full sm:w-auto px-5 py-3 rounded-full bg-foreground text-background text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Use this now
            </button>
          ) : null}
        </section>
      ) : null}

      {showPostCopy && selectedHook ? (
        <section className={`space-y-4 ${premiumTheme.card} p-5 sm:p-6`}>
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-foreground">Step 4: Copied</h2>
            <p className="text-sm text-muted-foreground">Your clip hook is ready for this Short</p>
          </div>
          {state.feedbackHelpful === null ? (
            <>
              {copyDone ? (
                <p className="text-sm font-medium text-foreground">Copied to clipboard.</p>
              ) : null}
              <p className="text-sm text-muted-foreground">
                Next: Publish as a Short, track performance, and improve your next clip
              </p>
              <PremiumNextStepSection
                title="Turn this into a Short"
                subtitle="Choose what you’ll add next — tracking starts after your Short is live."
              >
                <div className="flex flex-wrap gap-2">
                  {["Short title", "On-screen text", "Description hook"].map((option) => (
                    <span
                      key={option}
                      className="text-xs px-2.5 py-1 rounded-full border border-border/80 bg-background text-foreground/90"
                    >
                      {option}
                    </span>
                  ))}
                </div>
              </PremiumNextStepSection>
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm text-muted-foreground">Was this helpful?</span>
                <button
                  type="button"
                  onClick={() => submitFeedback(true)}
                  className="text-sm px-4 py-2 rounded-full border border-border bg-background hover:bg-secondary transition-colors font-medium"
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => submitFeedback(false)}
                  className="text-sm px-4 py-2 rounded-full border border-border bg-background hover:bg-secondary transition-colors font-medium"
                >
                  No
                </button>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Thanks — we’ll use that to tune your next Short hook.</p>
          )}
        </section>
      ) : null}
      </PremiumArchetypeLayout>

      {hideDashboardFab ? null : (
        <div className="fixed bottom-5 right-5 z-10">
          <button
            type="button"
            onClick={() => navigate(`/founder/${projectId}`)}
            className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-foreground text-background shadow-lg hover:opacity-90 transition-opacity"
            aria-label="Home"
          >
            <LayoutDashboard className="h-5 w-5" />
          </button>
        </div>
      )}
    </>
  );
}
