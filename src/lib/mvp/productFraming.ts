/**
 * Internal MVP archetype + product framing — classify ideas, then render product-shaped UI.
 * Future MVPs: call detectArchetypeFromIdea / build*ProductFrame, persist via setProductFrame,
 * wrap with `PremiumArchetypeLayout` (see `components/mvp/premium/`) or legacy `MvpProductShell`.
 */

export type MvpArchetype = "dashboard" | "tool" | "marketplace" | "generator" | "assistant";

export type ProductFrame = {
  product_name: string;
  one_line_promise: string;
  target_user: string;
  core_outcome: string;
  archetype: MvpArchetype;
};

const DASHBOARD_HINTS = /\b(metrics|analytics|growth|tracking|dashboard|kpi|report|insights)\b/i;
const MARKETPLACE_HINTS = /\b(listings|search|compare|directory|enquiry|marketplace|buy|sell|vendor|listing)\b/i;
const TOOL_HINTS = /\b(calculator|converter|estimator|compute|calculate)\b/i;
const GENERATOR_HINTS = /\b(generate|create|write|hooks?|captions?|ideas?|draft|headline)\b/i;
const ASSISTANT_HINTS = /\b(step\s*by\s*step|plan|workflow|coach|helper|assistant|guide|checklist)\b/i;

/** Lightweight archetype detection from founder/public idea text. */
export function detectArchetypeFromIdea(idea: string): MvpArchetype {
  const t = idea.trim();
  if (!t) return "assistant";
  const scores: Record<MvpArchetype, number> = {
    dashboard: 0,
    tool: 0,
    marketplace: 0,
    generator: 0,
    assistant: 0,
  };
  if (DASHBOARD_HINTS.test(t)) scores.dashboard += 2;
  if (MARKETPLACE_HINTS.test(t)) scores.marketplace += 2;
  if (TOOL_HINTS.test(t)) scores.tool += 2;
  if (GENERATOR_HINTS.test(t)) scores.generator += 2;
  if (ASSISTANT_HINTS.test(t)) scores.assistant += 2;
  let best: MvpArchetype = "generator";
  let max = -1;
  (Object.keys(scores) as MvpArchetype[]).forEach((k) => {
    if (scores[k] > max) {
      max = scores[k];
      best = k;
    }
  });
  if (max === 0) return "assistant";
  return best;
}

function shortProductNameFromIdea(idea: string): string {
  const words = idea.trim().split(/\s+/).slice(0, 4).join(" ");
  if (words.length > 42) return `${words.slice(0, 39).trim()}…`;
  return words || "Your product";
}

/**
 * YouTube Shorts growth surface: long video → best clip hook — archetype **generator** (output-first).
 */
export function buildYouTubeShortsGrowthHookProductFrame(idea: string, audience: string): ProductFrame {
  const target = audience.trim() || "For creators turning long videos into YouTube Shorts";
  return {
    product_name: "YouTube Shorts Growth Engine",
    one_line_promise:
      "Start by choosing the hook for your best clip. This is what makes people stop scrolling.",
    target_user: target,
    core_outcome:
      "More views, stronger retention, and higher replay potential from better clips, hooks, and thumbnails.",
    archetype: "generator",
  };
}

/** Generic frame from raw idea + detected archetype (for future templates). */
export function buildProductFrameFromIdea(idea: string): ProductFrame {
  const archetype = detectArchetypeFromIdea(idea);
  const name = shortProductNameFromIdea(idea);
  const promises: Record<MvpArchetype, string> = {
    dashboard: "See what matters and act on it faster.",
    tool: "Get a precise answer without the busywork.",
    marketplace: "Find the right match and move with confidence.",
    generator: "Create stronger output in minutes, not hours.",
    assistant: "Follow a clear plan and ship the next step.",
  };
  const outcomes: Record<MvpArchetype, string> = {
    dashboard: "Clarity and faster decisions.",
    tool: "Accurate results you can trust.",
    marketplace: "Better matches and smoother transactions.",
    generator: "Polished drafts you can ship.",
    assistant: "Momentum without guesswork.",
  };
  return {
    product_name: name,
    one_line_promise: promises[archetype],
    target_user: "Your ideal customer",
    core_outcome: outcomes[archetype],
    archetype,
  };
}
