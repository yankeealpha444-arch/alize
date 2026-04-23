/**
 * Internal routing: derive niche + audience from any idea string.
 * Not displayed as explicit UI; used to ground hook copy.
 */

export type IdeaContext = {
  niche: string;
  audience: string;
};

function cleanIdeaForNiche(idea: string): string {
  return idea
    .replace(/\b(my|the|a|an|for|to|and|or|with|using|build|create|make|app|tool|mvp|startup|idea|platform|saas|product)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

export function detectNicheAndAudience(idea: string): IdeaContext {
  const raw = idea.trim();
  const lower = raw.toLowerCase();

  let audience = "For creators turning long videos into YouTube Shorts";
  if (/\b(b2b|saas|enterprise|sales|crm)\b/i.test(lower)) audience = "B2B buyers and operators";
  else if (/\b(consumer|shop|ecommerce|buy|sell|marketplace)\b/i.test(lower)) audience = "Shoppers and online buyers";
  else if (/\b(student|learn|course|education|tutor)\b/i.test(lower)) audience = "Learners and students";
  else if (/\b(local|restaurant|clinic|gym|store)\b/i.test(lower)) audience = "Local customers nearby";

  const niche = cleanIdeaForNiche(raw) || "your offer";

  return { niche, audience };
}
