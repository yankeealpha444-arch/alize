import { ArrowRight, Sparkles } from "lucide-react";

export type Stage =
  | "no-upload"
  | "clips-ready"
  | "clip-selected"
  | "thumbnail-selected"
  | "confirmed"
  | "feedback";

interface StageConfig {
  eyebrow: string;
  title: string;
  cta: string;
}

const STAGE_MAP: Record<Stage, StageConfig> = {
  "no-upload": {
    eyebrow: "Step 1 of 5",
    title: "Paste a YouTube link on the previous step to load your video",
    cta: "Go to paste link",
  },
  "clips-ready": {
    eyebrow: "Step 2 of 5",
    title: "Pick your first test clip from this video",
    cta: "Use suggested clip",
  },
  "clip-selected": {
    eyebrow: "Step 3 of 5",
    title: "Pick your thumbnail angle",
    cta: "Choose thumbnail",
  },
  "thumbnail-selected": {
    eyebrow: "Step 4 of 5",
    title: "Start with this version and track results",
    cta: "Continue",
  },
  confirmed: {
    eyebrow: "Step 5 of 5",
    title: "Post, then paste your live link and add metrics",
    cta: "I posted it",
  },
  feedback: {
    eyebrow: "What's next",
    title: "Run another test with a new link or keep iterating",
    cta: "New test",
  },
};

interface NextStepGuideProps {
  stage: Stage;
  onAction: () => void;
  actionDisabled?: boolean;
}

export default function NextStepGuide({ stage, onAction, actionDisabled }: NextStepGuideProps) {
  const { eyebrow, title, cta } = STAGE_MAP[stage];

  return (
    <section
      aria-label="Your next step"
      className="rounded-xl border border-border/60 bg-foreground text-background px-5 py-4 sm:px-6 sm:py-5"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-background/60">
            <Sparkles className="h-3 w-3" />
            <span>Your Next Step</span>
            <span className="text-background/30">•</span>
            <span>{eyebrow}</span>
          </div>
          <p className="mt-1.5 font-display text-lg font-semibold leading-snug sm:text-xl">
            {title}
          </p>
        </div>
        <button
          type="button"
          onClick={onAction}
          disabled={actionDisabled}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md bg-background px-4 py-2.5 text-sm font-semibold text-foreground transition-transform hover:scale-[1.02] active:scale-100 disabled:opacity-50 disabled:hover:scale-100"
        >
          {cta}
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </section>
  );
}
