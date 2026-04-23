import type { IdeaContext } from "@/lib/ideaRouting";

/** Three high-performing angles, cycled across the 10-hook funnel. */
export type HookAngle = "Shock / pattern break" | "Specific result" | "Contrarian truth";

export type GeneratedHook = {
  id: string;
  angle: HookAngle;
  text: string;
};

const ANGLE_CYCLE: HookAngle[] = ["Shock / pattern break", "Specific result", "Contrarian truth"];

const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "but", "for", "with", "from", "that", "this", "your", "our", "are", "was", "were",
  "been", "being", "have", "has", "had", "does", "did", "will", "would", "could", "should", "about", "into", "onto",
  "just", "very", "also", "not", "all", "any", "can", "get", "got", "how", "what", "when", "who", "why", "way", "out",
  "make", "made", "like", "want", "need", "use", "using", "build", "create", "help", "helps", "app", "tool", "new",
]);

const IDEA_SPELLING_FIXES: Array<[RegExp, string]> = [
  [/\bcreater\b/gi, "creator"],
  [/\binsta\b/gi, "instagram"],
  [/\bimg\b/gi, "image"],
  [/\bpics\b/gi, "images"],
];

/** Strip robotic SaaS words if they slip in; keep voice human. */
function polishHookCopy(line: string): string {
  let s = line.trim();
  if (!s) return s;
  s = s
    .replace(/\bworkflow\b/gi, "flow")
    .replace(/\bworkflows\b/gi, "flows")
    .replace(/\bsetup\b/gi, "prep")
    .replace(/\bsetups\b/gi, "prep")
    .replace(/\bconsistency\b/gi, "showing up");
  return s.replace(/\s+/g, " ").trim();
}

function normalizeIdeaText(rawIdea: string): string {
  let t = rawIdea.trim().toLowerCase();
  if (!t) return "";
  for (const [pattern, replacement] of IDEA_SPELLING_FIXES) {
    t = t.replace(pattern, replacement);
  }
  t = t.replace(/[^\w\s'-]/g, " ").replace(/\s+/g, " ").trim();

  if (/\binstagram\b/.test(t) && /\bimage(s)?\b/.test(t) && /\bcreator\b/.test(t)) {
    return "create stronger thumbnails for youtube shorts";
  }
  if (/\bcreator\b/.test(t) && /\btool\b/.test(t)) {
    t = t.replace(/\bcreator tool\b/g, "creator kit");
  }
  if (!/\b(create|build|improve|grow|help|make)\b/.test(t) && t.split(/\s+/).length <= 6) {
    t = `improve ${t}`;
  }
  return t;
}

function toTitlePhrase(text: string): string {
  const cleaned = text.trim();
  if (!cleaned) return "your idea";
  return cleaned
    .split(/\s+/)
    .map((w, i) => {
      if (i > 0 && w.length <= 3) return w;
      return w[0].toUpperCase() + w.slice(1);
    })
    .join(" ");
}

function extractKeywords(idea: string): string[] {
  const raw = idea.trim();
  if (!raw) return [];
  const words = raw.toLowerCase().match(/\b[a-z][a-z0-9'-]{2,}\b/gi) || [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const w of words) {
    const lw = w.toLowerCase();
    if (STOPWORDS.has(lw)) continue;
    if (seen.has(lw)) continue;
    seen.add(lw);
    out.push(w.length <= 3 ? w : w[0].toUpperCase() + w.slice(1));
    if (out.length >= 6) break;
  }
  return out;
}

function audienceShort(audience: string): string {
  const t = audience.trim();
  if (!t) return "your audience";
  const parts = t.split(/\s+/).slice(0, 3).join(" ");
  return parts.length > 48 ? parts.slice(0, 45).trim() + "…" : parts;
}

function kw(keywords: string[], i: number, fallback: string): string {
  if (keywords.length === 0) return fallback;
  return keywords[i % keywords.length];
}

function normalizeForCompare(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function wordBag(s: string): Set<string> {
  return new Set(
    normalizeForCompare(s)
      .split(" ")
      .filter((w) => w.length > 2),
  );
}

function isNearDuplicate(a: string, b: string): boolean {
  if (a === b) return true;
  const A = wordBag(a);
  const B = wordBag(b);
  if (A.size === 0 || B.size === 0) return normalizeForCompare(a) === normalizeForCompare(b);
  let inter = 0;
  for (const w of A) if (B.has(w)) inter++;
  const union = A.size + B.size - inter;
  const j = union > 0 ? inter / union : 0;
  if (j >= 0.52) return true;
  const pre = normalizeForCompare(a).slice(0, 48);
  const preB = normalizeForCompare(b).slice(0, 48);
  return pre.length > 28 && pre === preB;
}

function groundingTerms(keywords: string[], niche: string, idea: string): string[] {
  const fromNiche = niche
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 2);
  const fromIdea = idea.toLowerCase().match(/\b[a-z][a-z0-9]{3,}\b/g) || [];
  const merged = [...keywords.map((k) => k.toLowerCase()), ...fromNiche, ...fromIdea];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of merged) {
    if (seen.has(t)) continue;
    seen.add(t);
    out.push(t);
    if (out.length >= 10) break;
  }
  const low = idea.toLowerCase();
  const boost: string[] = [];
  if (/surf|wave|paddl|ocean|board|lineup/i.test(low)) {
    boost.push("waves", "paddle", "lineup", "takeoff", "surf");
  }
  if (/fitness|workout|gym|lift|rep|trainer|muscle|cardio/i.test(low)) {
    boost.push("lift", "rep", "gym", "form", "split");
  }
  if (/content|hook|caption|reel|tiktok|youtube|shorts|instagram|image|post/i.test(low)) {
    boost.push("hook", "saves", "open", "reel", "feed");
  }
  if (/marketplace|sell|shop|store|listing|buy/i.test(low)) {
    boost.push("buyers", "listing", "dm", "sold", "price");
  }
  for (const t of boost) {
    if (seen.has(t)) continue;
    seen.add(t);
    out.push(t);
    if (out.length >= 18) break;
  }
  const universal = ["hook", "open", "line", "scroll", "saves", "ignored", "stuck", "attention", "feed"];
  for (const u of universal) {
    if (seen.has(u)) continue;
    seen.add(u);
    out.push(u);
  }
  return out;
}

function isGenericFluff(text: string): boolean {
  const t = text.trim();
  if (t.length < 16) return true;
  if (/^(here is|this is a|everyone knows|in today's|unlock your|level up your)\b/i.test(t)) return true;
  if (/\b(creators and growth|internet is crowded|growth focused teams|social media grower)\b/i.test(t)) return true;
  if (/\b(your audience|audience focused|go viral fast)\b/i.test(t)) return true;
  if (/\bthis changes how you approach\b/i.test(t)) return true;
  if (/\bmost people get\b/i.test(t)) return true;
  if (/\byou do not need more\b/i.test(t)) return true;
  return false;
}

function relatesToIdea(text: string, terms: string[]): boolean {
  if (terms.length === 0) return true;
  const low = text.toLowerCase();
  return terms.some((term) => low.includes(term.slice(0, Math.min(term.length, 14))));
}

function hasBannedTone(s: string): boolean {
  return /\b(workflow|session|setup|consistency)\b/i.test(s);
}

type AngleKey = "shock" | "result" | "contrarian";

function buildHooksByAngle(
  angle: AngleKey,
  topic: string,
  k0: string,
  k1: string,
  k2: string,
  d0: string,
  d1: string,
  d2: string,
  audienceLabel: string,
  baseIdea: string,
): string[] {
  const isContent = /content|hook|caption|reel|tiktok|youtube|shorts|post|instagram|image/i.test(baseIdea);
  const isFitness = /fitness|workout|trainer|gym|body|muscle|cardio|exercise/i.test(baseIdea);
  const isSurf = /surf|wave|paddl|board|water/i.test(baseIdea);
  const isShop = /marketplace|buy|sell|shop|store|ecommerce|e-commerce/i.test(baseIdea);

  const shock: string[] = [];
  const result: string[] = [];
  const contrarian: string[] = [];

  // --- Shock / pattern break
  shock.push(
    `The scroll stopped when I killed the “friendly” opener. ${k0} finally got attention.`,
    `Nobody warned me: the first line was silently tanking every ${d0} clip.`,
    `I kept getting ignored until I rewrote frame one — not the whole ${k1} thing.`,
    `Pattern break: I said the quiet part out loud about ${topic}. Saves jumped.`,
  );
  if (isContent) {
    shock.push(
      `Your hook isn’t “bad.” It’s invisible. I fixed one sentence and the feed finally moved.`,
      `I sounded like every other ${d0} account until I broke the template on purpose.`,
    );
  }
  if (isFitness) {
    shock.push(
      `I was “doing everything right” and still stuck — one ${d1} tweak finally worked.`,
      `Gym bros won’t say it: your first rep matters more than the whole plan.`,
    );
  }
  if (isSurf) {
    shock.push(
      `I blamed the waves. It was my timing. First paddle-in finally felt different.`,
      `Same board, same beach — one change to how I popped up. Night and day.`,
    );
  }
  if (isShop) {
    shock.push(
      `My listing sounded like everyone else’s. One blunt line and DMs woke up.`,
      `Buyers weren’t ignoring the price — they never felt the hook in the title.`,
    );
  }

  // --- Specific result
  result.push(
    `Two weeks in: more saves, fewer crickets. ${k0} actually started landing.`,
    `Real numbers: first ${d0} after the rewrite beat my last ten by a mile.`,
    `I finally got replies — not “great post,” people quoting the first line back.`,
    `From stuck to traction: one ${k1} change, and the graph finally bent.`,
  );
  if (isContent) {
    result.push(
      `Watch time climbed when I stopped burying the payoff — people stayed for the twist.`,
      `Comments went from spam to “how did you word that?” — that’s the shift.`,
    );
  }
  if (isFitness) {
    result.push(
      `Week one felt messy. Week two: stronger lifts, same hours — I wasn’t guessing anymore.`,
      `Finally saw progress when I stopped grinding and fixed one movement detail.`,
    );
  }
  if (isSurf) {
    result.push(
      `Seven days: fewer missed waves, cleaner drops — one rhythm fix.`,
      `Getting attention in the lineup meant fixing the boring part first.`,
    );
  }
  if (isShop) {
    result.push(
      `First day with the new copy: messages, not views.`,
      `Sold faster when I named the exact pain — not “quality” fluff.`,
    );
  }

  // --- Contrarian truth
  contrarian.push(
    `Hot take: you don’t need more ${d0} volume. You need a sharper first second.`,
    `Unpopular: “authentic” is killing your reach if it sounds like everyone else.`,
    `The algorithm isn’t out to get you — your open is training people to scroll.`,
    `Everyone says “value first.” I won curiosity first — then delivered.`,
  );
  if (isContent) {
    contrarian.push(
      `Posting more won’t save a weak hook. One strong open beats ten mid posts.`,
      `You’re not shadowbanned — you’re forgettable in the first line.`,
    );
  }
  if (isFitness) {
    contrarian.push(
      `More plans aren’t the answer if your form’s lying to you.`,
      `Rest isn’t lazy — it’s why my next ${d0} day finally hit.`,
    );
  }
  if (isSurf) {
    contrarian.push(
      `Fitness didn’t fix my surfing — timing did.`,
      `Chasing every wave kept me tired. Picking fewer made me dangerous.`,
    );
  }
  if (isShop) {
    contrarian.push(
      `Lower price didn’t move it. Clearer pain did.`,
      `“Professional photos” meant nothing until the headline stopped whispering.`,
    );
  }

  if (audienceLabel.trim()) {
    shock.push(
      `For ${audienceLabel.trim()}: the opener that finally got traction wasn’t polite — it was honest.`,
    );
  }

  const pools: Record<AngleKey, string[]> = { shock, result, contrarian };
  return pools[angle].map(polishHookCopy);
}

function finalizeHookLines(candidates: string[], idea: string, ctx: IdeaContext, keywords: string[]): string[] {
  const terms = groundingTerms(keywords, ctx.niche, idea);
  const structureSig = (s: string) =>
    normalizeForCompare(s)
      .replace(/\b\d+\b/g, "#")
      .replace(/\b(i|my|we|you)\b/g, "p")
      .replace(/\b(why|how|what|when|before|after|first)\b/g, "q")
      .split(" ")
      .slice(0, 7)
      .join(" ");

  const scored = candidates
    .map((line) => polishHookCopy(line))
    .filter((line) => {
      const t = line.trim();
      if (!t) return false;
      if (hasBannedTone(t)) return false;
      if (isGenericFluff(t)) return false;
      if (t.length < 22 || t.length > 120) return false;
      if (!relatesToIdea(t, terms)) return false;
      return true;
    });

  const kept: string[] = [];
  const sigs = new Set<string>();
  for (const line of scored) {
    if (kept.some((k) => isNearDuplicate(k, line))) continue;
    const sig = structureSig(line);
    if (sigs.has(sig)) continue;
    sigs.add(sig);
    kept.push(line);
    if (kept.length >= 24) break;
  }

  const k0 = kw(keywords, 0, "this");
  const k1 = kw(keywords, 1, k0);
  const topic = (ctx.niche || idea).slice(0, 64);

  const backups: string[] = [
    polishHookCopy(`Ignored for months. One sharper ${k0} line and saves finally showed up.`),
    polishHookCopy(`I was stuck in the scroll — then I said what everyone was thinking about ${topic}.`),
    polishHookCopy(`Getting attention stopped feeling random when I fixed the open, not the “strategy.”`),
    polishHookCopy(`Finally worked: lead with tension, not politeness — ${k0} isn’t a lecture.`),
  ];

  for (const b of backups) {
    if (kept.length >= 14) break;
    if (!b.trim() || hasBannedTone(b)) continue;
    if (isGenericFluff(b)) continue;
    if (!relatesToIdea(b, terms)) continue;
    if (kept.some((k) => isNearDuplicate(k, b))) continue;
    kept.push(b);
  }

  let padAttempts = 0;
  while (kept.length < 12 && padAttempts < 16) {
    padAttempts += 1;
    const filler = polishHookCopy(
      `Stuck on ${k0}? Say the part you’re scared to say — that’s what gets saves.`,
    );
    if (!hasBannedTone(filler) && !kept.some((k) => isNearDuplicate(k, filler))) kept.push(filler);
    else {
      const alt = polishHookCopy(`Your ${k1} isn’t boring — your first line is playing it safe.`);
      if (!kept.some((k) => isNearDuplicate(k, alt))) kept.push(alt);
    }
  }

  if (kept.length === 0) {
    return candidates.filter(Boolean).map(polishHookCopy).slice(0, 10);
  }

  return kept;
}

/**
 * Ten hooks: three angles cycled on labels — shock, specific result, contrarian — copy mixed from all three pools.
 */
export function generateTenHooks(idea: string, ctx: IdeaContext): GeneratedHook[] {
  const trimmed = idea.trim();
  const normalizedIdea = normalizeIdeaText(trimmed);
  const cleanedNiche = normalizeIdeaText(ctx.niche || "");
  const baseIdea = normalizedIdea || trimmed;
  const baseNiche = cleanedNiche || ctx.niche || baseIdea;
  const { audience } = ctx;
  const keywords = extractKeywords(baseIdea);
  const k0 = kw(keywords, 0, baseNiche.split(/\s+/)[0] || "this");
  const k1 = kw(keywords, 1, baseNiche.split(/\s+/)[1] || k0);
  const k2 = kw(keywords, 2, k0);
  const topic = toTitlePhrase((baseNiche || baseIdea || "your idea").slice(0, 72));
  const audienceIsGeneric =
    /creators and growth focused teams|for creators turning long videos into youtube shorts/i.test(
      audience.trim(),
    );
  const aud = audienceIsGeneric ? "" : audienceShort(audience);
  const audienceLabel = aud;

  const domainWords =
    /surf|wave|paddle|balance|technique|board|water/i.test(baseIdea)
      ? ["waves", "paddle", "balance", "takeoff", "lineup"]
      : /fitness|workout|trainer|gym|body|cardio|exercise/i.test(baseIdea)
        ? ["lift", "rep", "form", "recovery", "split"]
        : /content|hook|caption|reel|tiktok|youtube|shorts|post|instagram|image/i.test(baseIdea)
          ? ["hook", "open", "retention", "saves", "first frame"]
          : [k0.toLowerCase(), k1.toLowerCase(), k2.toLowerCase()];
  const d0 = domainWords[0] || k0.toLowerCase();
  const d1 = domainWords[1] || k1.toLowerCase();
  const d2 = domainWords[2] || k2.toLowerCase();

  const candidates: string[] = [
    ...buildHooksByAngle("shock", topic, k0, k1, k2, d0, d1, d2, audienceLabel, baseIdea),
    ...buildHooksByAngle("result", topic, k0, k1, k2, d0, d1, d2, audienceLabel, baseIdea),
    ...buildHooksByAngle("contrarian", topic, k0, k1, k2, d0, d1, d2, audienceLabel, baseIdea),
  ];

  let lines = finalizeHookLines(candidates, baseIdea, { ...ctx, niche: baseNiche }, keywords);

  const padLine = () =>
    polishHookCopy(
      `Stuck on ${k0}? Say the quiet part out loud — that’s what gets saves, not another “tip.”`,
    );
  let guard = 0;
  while (lines.length < 10 && guard++ < 12) {
    const p = padLine();
    if (!lines.some((x) => isNearDuplicate(x, p))) lines.push(p);
    else lines.push(polishHookCopy(`Sharp first line about ${k1} — boring opens get ignored.`));
  }

  const ten = lines.slice(0, 10);
  return ten.map((text, i) => ({
    id: `hook-${i + 1}`,
    angle: ANGLE_CYCLE[i % 3],
    text: text || polishHookCopy(`${topic}: lead with tension — saves follow.`),
  }));
}

export type RefinementKind = "curiosity" | "aggressive" | "shorter" | "emotional";

export function refineHookText(base: string, kind: RefinementKind): string {
  const t = base.trim();
  if (!t) return t;
  let out: string;
  switch (kind) {
    case "curiosity":
      out = `The moment everyone skips in the clip: ${t}`;
      break;
    case "aggressive":
      out = `${t} — land this in the first second of the Short or viewers swipe.`;
      break;
    case "shorter":
      out = t.length > 88 ? t.slice(0, 85).trim() + "…" : t;
      break;
    case "emotional":
      out = `This is the beat that hits in the clip: ${t}`;
      break;
    default:
      out = t;
  }
  return polishHookCopy(out);
}

/** Default Shorts funnel hooks — clip-specific moments, YouTube-first (founder Hook Generator). */
export const YOUTUBE_SHORTS_FUNNEL_HOOK_TEXTS = [
  "This was the exact moment everything changed in the clip",
  "I almost cut this part out — that would have killed the Short",
  "This 3-second beat carried the whole Short",
  "Nobody told me this frame is what actually hooks viewers",
  "This clip outperformed the rest by 2.4x — here’s the hook",
] as const;

export const YOUTUBE_SHORTS_FUNNEL_HOOK_COUNT = YOUTUBE_SHORTS_FUNNEL_HOOK_TEXTS.length;

export const CANONICAL_YOUTUBE_SHORTS_FIRST_HOOK_ID = "yt-shorts-hook-1";

export function hooksMatchCanonicalYouTubeShortsFunnel(hooks: Pick<GeneratedHook, "id" | "text">[]): boolean {
  if (hooks.length !== YOUTUBE_SHORTS_FUNNEL_HOOK_COUNT) return false;
  if (hooks[0]?.id !== CANONICAL_YOUTUBE_SHORTS_FIRST_HOOK_ID) return false;
  return YOUTUBE_SHORTS_FUNNEL_HOOK_TEXTS.every((text, i) => hooks[i]?.text === text);
}

export function generateYouTubeShortsFunnelHooks(): GeneratedHook[] {
  return YOUTUBE_SHORTS_FUNNEL_HOOK_TEXTS.map((text, i) => ({
    id: `yt-shorts-hook-${i + 1}`,
    angle: ANGLE_CYCLE[i % ANGLE_CYCLE.length],
    text,
  }));
}
