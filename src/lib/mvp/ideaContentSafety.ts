/**
 * Lightweight content safety for founder idea text before persistence (local + Supabase).
 * Heuristic only — not a substitute for human moderation or provider-side safety APIs.
 *
 * Server parity: `supabase/migrations/20260414120000_projects_idea_safety.sql` mirrors
 * RULES / safe strings for `public.projects` writes via PostgREST.
 */

export type IdeaSafetyCategory = "exploitation" | "illegal" | "harm";

export type IdeaSafetyAssessment =
  | { blocked: false }
  | {
      blocked: true;
      category: IdeaSafetyCategory;
      /** Short explanation for UI / logs (no graphic detail). */
      userMessage: string;
      /** Safe text persisted instead of the blocked input. */
      safeAlternative: string;
    };

const SAFE_ALTERNATIVES: Record<IdeaSafetyCategory, string> = {
  exploitation:
    "An ethical digital product that respects people’s rights and complies with the law — for example a marketplace for legitimate services or a tool that helps communities stay safe.",
  illegal:
    "A lawful product or service with a clear business model — describe what problem you solve for customers in everyday language.",
  harm:
    "A product focused on wellbeing or productivity — describe how you help users in a positive, constructive way.",
};

type Rule = {
  test: (t: string) => boolean;
  category: IdeaSafetyCategory;
};

/** Order: first match wins (specific before broad). */
const RULES: Rule[] = [
  {
    test: (t) =>
      /\b(human\s*traffick|sex\s*traffick|child\s*traffick|traffick(?:ing|er)s?\s+(?:of|in)\s+(?:children|minors|humans))\b/i.test(t) ||
      /\b(modern\s*slavery|forced\s*prostitution|child\s*prostitution)\b/i.test(t) ||
      /\b(sell(?:ing)?|sold|buy(?:ing)?)\s+(?:children|kids|minors|humans?|people|women|men)\b/i.test(t) ||
      /\b(sell(?:ing)?|trade)\s+(?:of\s+)?(?:humans?|people)\b/i.test(t) ||
      /\b(sex\s*slave|sexual\s*exploitation\s+of\s+(?:children|minors))\b/i.test(t) ||
      /\b(people|humans?|children|minors|kids)\s+for\s+sale\b/i.test(t) ||
      /\b(old\s+people|elderly)\s+for\s+sale\b/i.test(t),
    category: "exploitation",
  },
  {
    test: (t) =>
      /\b(hit\s*man|contract\s*killing|assassin\s+for\s+hire)\b/i.test(t) ||
      /\b(how\s+to\s+make\s+(?:a\s+)?(?:bomb|explosive|meth|fentanyl))\b/i.test(t) ||
      /\b(money\s*launder(?:ing)?\s+for\s+(?:cartel|criminal|illegal))\b/i.test(t) ||
      /\b(child\s*porn|csam|sexual\s*abuse\s+of\s+minors)\b/i.test(t),
    category: "illegal",
  },
  {
    test: (t) =>
      /\b(how\s+to\s+(?:commit\s+)?suicide|suicide\s+methods|kill\s+myself|end\s+my\s+life)\b/i.test(t) ||
      /\b(self[\s-]*harm\s+(?:instructions|methods)|cutting\s+myself\s+how)\b/i.test(t),
    category: "harm",
  },
];

const MESSAGES: Record<IdeaSafetyCategory, string> = {
  exploitation:
    "That idea can’t be saved because it appears to involve exploitation or harm to people. Here’s a safe direction you can use instead.",
  illegal:
    "That idea can’t be saved because it may involve illegal activity. Try describing a lawful product or service instead.",
  harm:
    "That idea can’t be saved because it may relate to self-harm or violence. Try reframing around wellbeing or a constructive goal.",
};

export function assessIdeaContentSafety(idea: string): IdeaSafetyAssessment {
  const t = idea.trim();
  if (!t) return { blocked: false };

  for (const rule of RULES) {
    if (rule.test(t)) {
      return {
        blocked: true,
        category: rule.category,
        userMessage: MESSAGES[rule.category],
        safeAlternative: SAFE_ALTERNATIVES[rule.category],
      };
    }
  }

  return { blocked: false };
}

/**
 * Text safe to persist or show after normalizing legacy data (localStorage, builder config, frames).
 * Reuses the same safe alternatives as `assessIdeaContentSafety` / the DB trigger on `public.projects`.
 */
export function sanitizeIdeaForPersistence(idea: string): string {
  const t = idea.trim();
  if (!t) return "";
  const a = assessIdeaContentSafety(t);
  if (a.blocked) return a.safeAlternative;
  return t;
}
