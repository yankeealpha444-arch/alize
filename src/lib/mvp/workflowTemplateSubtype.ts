import type { MvpBuilderConfig } from "@/lib/mvp/types";
import { getIdeaTextForToolTemplate } from "@/lib/mvp/toolTemplateSubtype";

export type WorkflowSubtypeId = "scheduler_workflow" | "publishing_workflow" | "generic_workflow";

export type WorkflowInputStep = {
  id: 1 | 2;
  title: string;
  mainLabel: string;
  mainPlaceholder: string;
  optionalLabel?: string;
  optionalPlaceholder?: string;
};

export type WorkflowReviewStep = {
  id: 3;
  title: string;
};

export type WorkflowUiConfig = {
  subtype: WorkflowSubtypeId;
  title: string;
  subtitle: string;
  step1: WorkflowInputStep;
  step2: WorkflowInputStep;
  step3: WorkflowReviewStep;
  continueLabel: string;
  finalPrimaryLabel: string;
  reviewSummaryLabel1: string;
  reviewSummaryLabel2: string;
  reviewSummaryLabelOptional?: string;
  doneHeadline: string;
  emptyStateTitle: string;
  emptyStateText: string;
};

const SCHEDULER: WorkflowUiConfig = {
  subtype: "scheduler_workflow",
  title: "Post Scheduler",
  subtitle: "Plan and schedule your next post",
  step1: {
    id: 1,
    title: "Create post",
    mainLabel: "What are you posting?",
    mainPlaceholder: "Describe the post or paste a draft…",
    optionalLabel: "Add caption or notes",
    optionalPlaceholder: "Caption, hashtags, or reminders…",
  },
  step2: {
    id: 2,
    title: "Choose time",
    mainLabel: "When should it go live?",
    mainPlaceholder: "e.g. Tuesday 9am, tomorrow evening, next Monday…",
  },
  step3: { id: 3, title: "Confirm schedule" },
  continueLabel: "Continue",
  finalPrimaryLabel: "Schedule Post",
  reviewSummaryLabel1: "Post",
  reviewSummaryLabel2: "Time",
  reviewSummaryLabelOptional: "Caption or notes",
  doneHeadline: "You’re set",
  emptyStateTitle: "No posts scheduled yet",
  emptyStateText: "Create your first post to start building consistency.",
};

const PUBLISHING: WorkflowUiConfig = {
  subtype: "publishing_workflow",
  title: "Content Publisher",
  subtitle: "Prepare and publish your next piece of content",
  step1: {
    id: 1,
    title: "Add your content",
    mainLabel: "What are you publishing?",
    mainPlaceholder: "Paste your draft, outline, or link…",
    optionalLabel: "Title or headline",
    optionalPlaceholder: "Working title or headline…",
  },
  step2: {
    id: 2,
    title: "Set where it goes",
    mainLabel: "Channel or audience",
    mainPlaceholder: "Where it will appear and who it’s for…",
  },
  step3: { id: 3, title: "Review before you publish" },
  continueLabel: "Continue",
  finalPrimaryLabel: "Publish",
  reviewSummaryLabel1: "Content",
  reviewSummaryLabel2: "Destination",
  reviewSummaryLabelOptional: "Title",
  doneHeadline: "Ready to go live",
  emptyStateTitle: "Nothing queued yet",
  emptyStateText: "Add your first piece of content to see it here.",
};

const GENERIC: WorkflowUiConfig = {
  subtype: "generic_workflow",
  title: "Your plan",
  subtitle: "Three short answers to lock what you’re testing next",
  step1: {
    id: 1,
    title: "Pick your focus",
    mainLabel: "What do you want to happen?",
    mainPlaceholder: "The outcome or change you care about…",
  },
  step2: {
    id: 2,
    title: "Set the boundaries",
    mainLabel: "What limits or context matter?",
    mainPlaceholder: "Time, format, audience, or scope…",
  },
  step3: { id: 3, title: "Check it" },
  continueLabel: "Continue",
  finalPrimaryLabel: "Finish",
  reviewSummaryLabel1: "Focus",
  reviewSummaryLabel2: "Boundaries",
  doneHeadline: "Saved",
  emptyStateTitle: "Nothing captured yet",
  emptyStateText: "Walk through the three steps to save what you’re testing.",
};

const RULES: { id: Exclude<WorkflowSubtypeId, "generic_workflow">; keywords: string[] }[] = [
  {
    id: "scheduler_workflow",
    keywords: [
      "schedule",
      "scheduler",
      "calendar",
      "plan post",
      "posting time",
      "post scheduler",
    ],
  },
  {
    id: "publishing_workflow",
    keywords: ["publish", "posting flow", "upload and post", "distribute content"],
  },
];

function normalizeText(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

function matchesKeywords(haystack: string, keywords: string[]): boolean {
  const n = normalizeText(haystack);
  if (!n) return false;
  return keywords.some((kw) => n.includes(kw.toLowerCase()));
}

export function detectWorkflowSubtype(productName: string, ideaText: string): WorkflowSubtypeId {
  const combined = `${productName} ${ideaText}`;
  for (const rule of RULES) {
    if (matchesKeywords(combined, rule.keywords)) return rule.id;
  }
  return "generic_workflow";
}

export function getWorkflowUiConfig(subtype: WorkflowSubtypeId): WorkflowUiConfig {
  if (subtype === "scheduler_workflow") return SCHEDULER;
  if (subtype === "publishing_workflow") return PUBLISHING;
  return GENERIC;
}

export function resolveWorkflowTemplateUi(config: MvpBuilderConfig, projectId: string): WorkflowUiConfig {
  const idea = getIdeaTextForToolTemplate(projectId);
  const subtype = detectWorkflowSubtype(config.productName, idea);
  return getWorkflowUiConfig(subtype);
}
