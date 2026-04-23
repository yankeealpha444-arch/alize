import { isVideoClipperProductIdea, isVideoContentUrlInput } from "@/lib/mvp/videoClipperDetection";

// Product type detection — determines MVP flow based on idea

export type ProductType =
  | "tool"
  | "saas"
  | "marketplace"
  | "landing"
  | "ai-tool"
  | "creator_tool"
  | "growth_tool";

export interface ProductTypeInfo {
  type: ProductType;
  label: string;
  flow: string[];
  firstStep: string;
  description: string;
}

/**
 * Order matters: first match wins.
 * Priority rules (see detectProductType): commerce/fashion → marketplace; channels/audience → growth_tool; default tool — not SaaS.
 */
const patterns: Array<{ match: RegExp; type: ProductType }> = [
  // Landing
  {
    match: /\b(blog|newsletter|portfolio|landing page|waitlist|coming soon|announcement|launch|pre-launch)\b/i,
    type: "landing",
  },
  // Marketplace (narrow — broad commerce is handled in detectProductType first)
  {
    match:
      /\b(marketplace|for sale|buy and sell|listing|classified|auction|rent|hire freelanc|directory|ecommerce|e-commerce|surfboard|sneaker|vintage|handmade)\b/i,
    type: "marketplace",
  },
  // Growth / channels — subscribers/views still here; instagram/youtube/tiktok also in priority block
  {
    match:
      /\b(channel|channels|subscriber|subscribers|views|engagement|social growth|audience growth)\b/i,
    type: "growth_tool",
  },
  // Phrase-level growth (legacy)
  {
    match:
      /\b(social media grower|audience growth tool|growth analytics for creators|grow your (audience|reach|followers))\b/i,
    type: "growth_tool",
  },
  // Creator / content / video — when not caught as growth above
  {
    match: /\b(clipper solution|content clipper|video clipper|reels clipper|creator studio|short[- ]form editor)\b/i,
    type: "creator_tool",
  },
  { match: /\b(creator|content)\b/i, type: "creator_tool" },
  { match: /\b(video|shorts|reels)\b/i, type: "creator_tool" },
  // AI tools
  {
    match:
      /\b(ai study|study tutor|ai tutor|tutoring|ai|gpt|chatbot|generate|generator|prompt|machine learning|ml model|image generat|text generat|ai logo|ai writ)\b/i,
    type: "ai-tool",
  },
  // Utility tools
  {
    match:
      /\b(clipper|clipping|video clip|trim video|shortform|short-form|convert|calculator|checker|scanner|compress|resize|format|extract|merge|split|download|upload|pdf|csv|mp3|mp4|jpg|png|qr|url short|password gen|translator|timer|stopwatch|countdown|scraper|validator)\b/i,
    type: "tool",
  },
  // Explicit business SaaS (after growth/creator; "youtube … dashboard" still hits growth first)
  {
    match:
      /\b(crm|erp|dashboard|helpdesk|help desk|team management|workflow system|human resources|hr software|accounting software|billing software|enterprise software|saas platform)\b/i,
    type: "saas",
  },
];

function looseFallback(idea: string): ProductType {
  const lower = idea.toLowerCase();
  if (/\b(clothes|clothing|fashion|outfit|wear|shop|store|buy|marketplace)\b/i.test(lower)) {
    return "marketplace";
  }
  if (/\b(youtube|instagram|tiktok|growth|audience|followers)\b/i.test(lower)) {
    return "growth_tool";
  }
  if (/\b(youtube|tiktok|instagram|channel|subscriber|subscribers|views|engagement)\b/i.test(lower)) {
    return "growth_tool";
  }
  if (/\b(creator|content|video|shorts|reels)\b/i.test(lower)) {
    return "creator_tool";
  }
  return "tool";
}

export function detectProductType(idea: string): ProductType {
  const lower = idea.toLowerCase().trim();
  const devLog = typeof import.meta !== "undefined" && (import.meta as ImportMeta & { env?: { DEV?: boolean } }).env?.DEV;
  if (!lower) {
    if (devLog) console.log("DETECTED TYPE:", idea, "landing");
    return "landing";
  }

  // Hard routing rule: social video URLs always map to clipper flow.
  if (isVideoContentUrlInput(lower)) {
    if (devLog) console.log("DETECTED TYPE:", idea, "creator_tool (video URL)");
    return "creator_tool";
  }

  const fashionRetail =
    /\b(clothes|clothing|fashion|outfit|wear|wardrobe|apparel|dress|dresses|shop|store|buy|marketplace)\b/i.test(lower);

  // 1) Audience growth without retail — “buy followers” is growth, not a store
  if (
    /\b(followers|audience|subscribers)\b/i.test(lower) &&
    !/\b(clothes|clothing|fashion|outfit|wear|wardrobe|apparel|dress|dresses|shop|store|marketplace)\b/i.test(lower)
  ) {
    if (devLog) console.log("DETECTED TYPE:", idea, "growth_tool");
    return "growth_tool";
  }
  // 2) Commerce & fashion
  if (fashionRetail) {
    if (devLog) console.log("DETECTED TYPE:", idea, "marketplace");
    return "marketplace";
  }
  // Video clipping / repurposing (not generic “Instagram growth”)
  if (isVideoClipperProductIdea(lower)) {
    if (devLog) console.log("DETECTED TYPE:", idea, "creator_tool (video clipper)");
    return "creator_tool";
  }
  // 3) Growth / social channels
  if (/\b(youtube|instagram|tiktok|growth|audience|followers)\b/i.test(lower)) {
    if (devLog) console.log("DETECTED TYPE:", idea, "growth_tool");
    return "growth_tool";
  }

  for (const p of patterns) {
    if (p.match.test(lower)) {
      if (devLog) {
        console.log("DETECTED TYPE:", idea, p.type);
      }
      return p.type;
    }
  }
  const fallback = looseFallback(lower);
  if (devLog) {
    console.log("DETECTED TYPE:", idea, fallback);
  }
  return fallback;
}

export function getProductTypeInfo(type: ProductType): ProductTypeInfo {
  switch (type) {
    case "tool":
      return {
        type: "tool",
        label: "Tool / Utility",
        flow: ["Use tool", "See result", "Sign up to save", "Feedback"],
        firstStep: "Use the tool first — sign up comes after value",
        description: "Users try the tool instantly, then sign up to save results",
      };
    case "ai-tool":
      return {
        type: "ai-tool",
        label: "AI Tool",
        flow: ["Try AI feature", "See result", "Sign up for more", "Feedback"],
        firstStep: "Try the AI first — sign up to unlock full access",
        description: "Users generate something with AI, then sign up for unlimited access",
      };
    case "marketplace":
      return {
        type: "marketplace",
        label: "Marketplace",
        flow: ["Browse listings", "View details", "Contact / Sign up", "Feedback"],
        firstStep: "Browse first — sign up to buy or sell",
        description: "Users explore listings, then sign up to transact",
      };
    case "saas":
      return {
        type: "saas",
        label: "SaaS Product",
        flow: ["Sign up", "Onboarding", "Use product", "Feedback"],
        firstStep: "Sign up first — then personalize and use",
        description: "Users create an account, get onboarded, then use the product",
      };
    case "landing":
      return {
        type: "landing",
        label: "Landing Page",
        flow: ["Read value prop", "Email signup", "Confirmation"],
        firstStep: "Read about it — sign up for updates",
        description: "Users learn about the product and sign up for launch updates",
      };
    case "creator_tool":
      return {
        type: "creator_tool",
        label: "Creator / Content Tool",
        flow: ["Create", "Schedule", "Analyze", "Feedback"],
        firstStep: "Create content first — then grow",
        description: "Creators produce content, schedule it, and see performance",
      };
    case "growth_tool":
      return {
        type: "growth_tool",
        label: "Growth Tool",
        flow: ["Measure", "Optimize", "Experiment", "Feedback"],
        firstStep: "See what’s working — then improve",
        description: "Teams track growth metrics and run experiments",
      };
  }
}
