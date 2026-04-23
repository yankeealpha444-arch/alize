import type { ToolSubtypeUiConfig } from "@/lib/mvp/types";

/** Product-specific text-tool surface (subtype stays `text_tool`). */
export type TextToolProductIntent =
  | "cold_dm_tool"
  | "subject_line_tool"
  | "headline_tool"
  | "hook_tool"
  | "variants_tool"
  | "thread_tool"
  | "post_tool"
  | "caption_tool"
  | "generic";

export type TextRewriteCard = {
  /** Short label shown on the card (e.g. “More personal”). */
  angle: string;
  text: string;
};

function normalize(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Detects copy/layout intent from idea + product name.
 * `cold_dm_tool` is checked first. Does not affect `text_tool` subtype classification.
 */
export function detectTextToolProductIntent(productName: string, ideaText: string): TextToolProductIntent {
  const h = normalize(`${productName} ${ideaText}`);
  if (!h) return "generic";

  if (/\bcold\s+dm\b/.test(h) || (/\bcold\b/.test(h) && /\bdm\b/.test(h))) return "cold_dm_tool";
  if (/\boutreach\b/.test(h) && /\b(cold|dm)\b/.test(h)) return "cold_dm_tool";

  if (
    /\bsubject\s+lines?\b/.test(h) ||
    /\bemail\s+subject\s+lines?\b/.test(h) ||
    (/\bemail\b/.test(h) && /\bsubject\b/.test(h) && /\b(line|lines|improv|generat|open)\b/i.test(h))
  ) {
    return "subject_line_tool";
  }

  if (/\bheadline\b/.test(h) && /\b(generat|improv|rewrit|tool|variant)\b/i.test(h)) return "headline_tool";
  if (/\bhook\b/.test(h) && /\b(generat|improv|tool|variant|rewrit)\b/i.test(h)) return "hook_tool";

  if (
    /\bgenerate\s+variations\b/.test(h) ||
    /\bcopy\s+variants\b/.test(h) ||
    /\b3\s+improved\s+versions\b/.test(h) ||
    /\bimprover\s+tool\b/.test(h)
  ) {
    return "variants_tool";
  }

  if (/\brewrite\s+post\b/.test(h) || /\bpost\s+rewrit/.test(h)) return "post_tool";

  if (/\bsubject\b/.test(h)) return "subject_line_tool";
  if (/\bemail\b/.test(h)) return "subject_line_tool";
  if (/\blinkedin\b/.test(h)) return "post_tool";
  if (/\bcaption\b/.test(h)) return "caption_tool";
  if (/\bthread\b/.test(h)) return "thread_tool";
  return "generic";
}

/** Default text_tool labels (generic rewriting — avoids “post” when a specific intent matches). */
export const TEXT_TOOL_DEFAULT_UI: ToolSubtypeUiConfig = {
  guidingLine: "",
  surfaceTitle: "Post Rewriter",
  surfaceSubtitle: "Improve your post before publishing",
  headerDetail: "Get clearer, stronger versions you can compare quickly",
  inputLabel: "Paste your post",
  primaryAction: "Generate versions",
  resultTitle: "Improved versions",
  saveSecondary: "Copy",
  trySecondary: "Reset",
  inputPlaceholder: "Paste your draft here...",
  emptyResultHint: "",
  emptyRunMessage: "Paste your draft, then generate versions.",
  nextStepsBullets: [
    "Paste a real post you’d ship—length and tone matter.",
    "Compare rewritten versions and pick what reads clearest.",
    "Run again with tweaks until you’re ready to publish.",
  ],
};

const COLD_DM_UI: Partial<ToolSubtypeUiConfig> = {
  surfaceTitle: "Cold DM Message Improver",
  surfaceSubtitle: "Improve cold outreach so more people reply",
  headerDetail: "Three distinct angles—more personal, more direct, more curiosity-driven",
  inputLabel: "Paste your message",
  inputPlaceholder: "Paste your cold DM draft here…",
  primaryAction: "Calculate message",
  resultTitle: "Results",
  saveSecondary: "Copy",
  trySecondary: "Reset",
  emptyResultHint: "",
  emptyRunMessage: "Paste a message, then calculate.",
  nextStepsBullets: [
    "Paste a real DM you’d actually send—tone and length matter.",
    "Tap a version to mark it best, then copy or iterate.",
    "Try new variations until the ask feels natural.",
  ],
};

const SUBJECT_LINE_UI: Partial<ToolSubtypeUiConfig> = {
  surfaceTitle: "Email Subject Line Improver",
  surfaceSubtitle: "Enter a subject line and get three improved versions",
  headerDetail: "Three options tuned for clarity and open rate",
  inputLabel: "Subject line",
  inputPlaceholder: "Enter your subject line",
  primaryAction: "Improve subject line",
  resultTitle: "Improved versions",
  emptyResultHint: "",
  emptyRunMessage: "Enter your subject line, then tap Improve subject line.",
  nextStepsBullets: [
    "Try a subject you’d actually send—length and specificity matter.",
    "Compare the three versions and pick what earns the open.",
    "Reset and iterate until it matches your campaign voice.",
  ],
};

const HEADLINE_UI: Partial<ToolSubtypeUiConfig> = {
  surfaceTitle: "Headline generator",
  surfaceSubtitle: "Turn a rough headline into stronger options",
  inputLabel: "Headline or idea",
  inputPlaceholder: "Paste your headline or topic…",
  primaryAction: "Generate headlines",
  resultTitle: "Headline options",
  emptyRunMessage: "Add a headline or topic, then generate.",
};

const HOOK_UI: Partial<ToolSubtypeUiConfig> = {
  surfaceTitle: "Hook generator",
  surfaceSubtitle: "Three hook options for your content",
  inputLabel: "Topic or draft hook",
  inputPlaceholder: "What is the content about?",
  primaryAction: "Generate hooks",
  resultTitle: "Hook options",
  emptyRunMessage: "Add a topic or draft, then generate hooks.",
};

const VARIANTS_UI: Partial<ToolSubtypeUiConfig> = {
  surfaceTitle: "Copy variants",
  surfaceSubtitle: "Three improved versions from your input",
  inputLabel: "Your text",
  inputPlaceholder: "Paste what you want to improve…",
  primaryAction: "Generate versions",
  resultTitle: "Variants",
  emptyRunMessage: "Paste your text, then generate versions.",
};

const THREAD_UI: Partial<ToolSubtypeUiConfig> = {
  surfaceTitle: "Thread Optimizer",
  surfaceSubtitle: "Turn one idea into a thread people read to the end",
  headerDetail: "Get stronger hooks and beats you can compare quickly",
  inputLabel: "Paste your thread or outline",
  inputPlaceholder: "Paste your draft or bullet outline...",
  primaryAction: "Calculate thread",
  resultTitle: "Results",
  emptyResultHint: "",
  emptyRunMessage: "Add your thread or outline, then calculate.",
  nextStepsBullets: [
    "Use a thread you’d really post—structure matters.",
    "Compare versions and pick the clearest flow.",
    "Tweak and run again until it feels ready.",
  ],
};

const POST_TOOL_UI: Partial<ToolSubtypeUiConfig> = {
  surfaceTitle: "LinkedIn Post Improver",
  surfaceSubtitle: "Sharpen your post before it hits the feed",
  headerDetail: "Get clearer, stronger versions you can compare quickly",
  inputLabel: "Paste your post",
  inputPlaceholder: "Paste your draft here...",
  primaryAction: "Calculate post",
  resultTitle: "Results",
  emptyResultHint: "",
  emptyRunMessage: "Paste your draft, then calculate.",
  nextStepsBullets: [
    "Paste a post you’d actually publish on LinkedIn.",
    "Compare versions and pick what reads best in the feed.",
    "Refine until the hook and CTA feel right.",
  ],
};

const CAPTION_UI: Partial<ToolSubtypeUiConfig> = {
  surfaceTitle: "Caption Rewriter",
  surfaceSubtitle: "Get captions that earn stops and saves",
  headerDetail: "Compare a few strong options before you publish",
  inputLabel: "Paste your caption",
  inputPlaceholder: "Paste your caption draft...",
  primaryAction: "Calculate caption",
  resultTitle: "Results",
  emptyResultHint: "",
  emptyRunMessage: "Paste your caption, then calculate.",
  nextStepsBullets: [
    "Start with a caption you’d really use on the post.",
    "Compare options and pick what matches your brand voice.",
    "Run again with tweaks until it feels scroll-stopping.",
  ],
};

const INTENT_PARTIAL: Record<Exclude<TextToolProductIntent, "generic">, Partial<ToolSubtypeUiConfig>> = {
  cold_dm_tool: COLD_DM_UI,
  subject_line_tool: SUBJECT_LINE_UI,
  headline_tool: HEADLINE_UI,
  hook_tool: HOOK_UI,
  variants_tool: VARIANTS_UI,
  thread_tool: THREAD_UI,
  post_tool: POST_TOOL_UI,
  caption_tool: CAPTION_UI,
};

export function resolveTextToolUi(productName: string, ideaText: string): ToolSubtypeUiConfig {
  const intent = detectTextToolProductIntent(productName, ideaText);
  if (intent === "generic") return TEXT_TOOL_DEFAULT_UI;
  return { ...TEXT_TOOL_DEFAULT_UI, ...INTENT_PARTIAL[intent] };
}

/** Sentence-style capitalization for preview subject lines. */
function displaySubjectLine(s: string): string {
  const t = s.trim().replace(/\s+/g, " ");
  if (!t) return "";
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/**
 * Preview-only subject line variants: three meaningfully different lines (not the input echoed with labels).
 * Strategies: direct / curiosity (often question) / urgency or benefit.
 */
export function buildSubjectLinePreviewVariants(draft: string): TextRewriteCard[] {
  const raw = draft.trim().replace(/\s+/g, " ");
  if (!raw.length) {
    return [
      { angle: "Clear & direct", text: "Enter a subject line to preview three improved versions." },
      { angle: "Curiosity-driven", text: "We’ll show a question-style subject line here." },
      { angle: "Urgency or benefit", text: "We’ll show a time-sensitive subject line here." },
    ];
  }

  const max = 200;
  const base = raw.length > max ? `${raw.slice(0, max)}…` : raw;
  const display = displaySubjectLine(base);
  const lower = base.toLowerCase();

  const timeHm = base.match(/\b(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?|am|pm)\b/i);
  let timeSpoken = "";
  if (timeHm) {
    const ampm = /a/i.test(timeHm[3] ?? "") ? "am" : "pm";
    timeSpoken = timeHm[2] ? `${timeHm[1]}:${timeHm[2]}${ampm}` : `${timeHm[1]}${ampm}`;
  }

  const hasTomorrow = /\btomorrow\b/i.test(base);
  const hasToday = /\btoday\b/i.test(base);
  const dayWord = hasTomorrow ? "tomorrow" : hasToday ? "today" : "";
  const hasMeeting = /\b(meeting|call|sync|standup|chat|interview|demo)\b/i.test(base);

  // --- 1) Clear / direct ---
  let clear: string;
  if (/^(re|fw|fwd)\s*:/i.test(base)) {
    clear = `FYI — ${base.replace(/^(re|fw|fwd)\s*:\s*/i, "").trim()}`;
  } else if (/^reminder\b/i.test(lower)) {
    clear = `Heads-up: ${display.replace(/^reminder\s*:?\s*/i, "")}`;
  } else {
    clear = `Quick reminder: ${display}`;
  }

  // --- 2) Curiosity-driven (usually a question) ---
  let curiosity: string;
  if (hasMeeting && dayWord && timeSpoken) {
    curiosity = `Are you ready for ${dayWord}'s ${timeSpoken} ${(/meeting/i.test(base) ? "meeting" : "call")}?`;
  } else if (hasMeeting && dayWord) {
    curiosity = `Still on for ${dayWord}'s ${/\bmeeting\b/i.test(base) ? "meeting" : "call"}?`;
  } else if (hasMeeting && timeSpoken) {
    curiosity = `Can you make the ${timeSpoken} ${/\b(call|sync)\b/i.test(base) ? "call" : "meeting"}?`;
  } else if (!/[?!]/.test(base) && base.length <= 90) {
    curiosity = `Quick question — are we still doing “${display}”?`;
  } else {
    curiosity = `Worth a look: what if we reframed “${display.slice(0, 72)}${display.length > 72 ? "…" : ""}”?`;
  }

  // --- 3) Urgency or benefit ---
  let urgency: string;
  if (hasMeeting && hasTomorrow && timeSpoken) {
    urgency = `Don't miss tomorrow's meeting at ${timeSpoken}`;
  } else if (hasMeeting && dayWord) {
    urgency = `Save your spot — ${dayWord}'s ${/\bmeeting\b/i.test(base) ? "meeting" : "session"} is coming up`;
  } else if (/\b(discount|offer|sale|launch|invite|rsvp)\b/i.test(lower)) {
    urgency = `Last chance — ${display}`;
  } else if (/\bdeadline|due|expires?\b/i.test(lower)) {
    urgency = `Time-sensitive: ${display}`;
  } else {
    urgency = `Don't miss this: ${display}`;
  }

  const variants = [clear, curiosity, urgency];
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
  const origN = norm(base);

  // De-duplicate and avoid echoing the raw input as the entire line
  const out: string[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < variants.length; i++) {
    let v = variants[i];
    let n = norm(v);
    let k = 0;
    while (
      (seen.has(n) || n === origN || v.length < 4) &&
      k < 8
    ) {
      if (i === 0) v = `Heads-up: ${display}`;
      else if (i === 1) v = `Curious — is “${display.slice(0, 48)}${display.length > 48 ? "…" : ""}” still the plan?`;
      else v = `Action needed: ${display}`;
      n = norm(v);
      k++;
    }
    seen.add(n);
    out.push(v);
  }

  return [
    { angle: "Clear & direct", text: out[0] ?? clear },
    { angle: "Curiosity-driven", text: out[1] ?? curiosity },
    { angle: "Urgency or benefit", text: out[2] ?? urgency },
  ];
}

/** Simulated multi-version output for the text tool preview. */
export function mockTextRewriteVersions(intent: TextToolProductIntent, draft: string): TextRewriteCard[] {
  const core = draft.length > 320 ? `${draft.slice(0, 320)}…` : draft;

  if (intent === "headline_tool") {
    return [
      { angle: "Direct", text: `${core}\n\n— Leads with the clearest benefit in fewer words.` },
      { angle: "Curiosity", text: `${core}\n\n— Adds a specific detail that earns the click without fluff.` },
      { angle: "Proof-led", text: `${core}\n\n— Anchors on outcome or credibility for scanners.` },
    ];
  }

  if (intent === "hook_tool") {
    return [
      { angle: "Pattern interrupt", text: `${core}\n\n— Opens with contrast or surprise, then pays it off fast.` },
      { angle: "Relatable", text: `${core}\n\n— Names a tension your audience already feels.` },
      { angle: "Promise", text: `${core}\n\n— States a crisp outcome in the first line.` },
    ];
  }

  if (intent === "subject_line_tool") {
    return buildSubjectLinePreviewVariants(core);
  }

  if (intent === "cold_dm_tool") {
    return [
      {
        angle: "More personal",
        text: `${core}\n\n— Reworked to reference something specific about them and soften the ask so it feels one-to-one.`,
      },
      {
        angle: "More direct",
        text: `${core}\n\n— Short opener, one clear question, no filler—respects their time.`,
      },
      {
        angle: "Curiosity-driven",
        text: `${core}\n\n— Leads with a tight hook that makes replying feel easy and low-effort.`,
      },
    ];
  }

  return [
    {
      angle: "Clearer",
      text: `${core}\n\n— Tightened for skimming: same meaning, less noise.`,
    },
    {
      angle: "Stronger",
      text: `${core}\n\n— Sharper opening and a clearer close.`,
    },
    {
      angle: "Tighter",
      text: `${core}\n\n— More specific wording; less filler.`,
    },
  ];
}
