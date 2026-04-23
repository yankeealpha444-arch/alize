/**
 * Data-driven MVP template families — one config per ProductType.
 * Used by copy, images, SaaSPreview, and PublicMVP for aligned output.
 */

import type { ProductType } from "./productType";
import { stripDashesFromDisplayText } from "./textNormalize";

const IDEA_STOP = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "for",
  "to",
  "of",
  "in",
  "on",
  "at",
  "with",
  "your",
  "my",
  "our",
  "that",
  "this",
  "from",
  "into",
  "app",
  "get",
  "new",
  "how",
  "what",
  "are",
  "you",
  "can",
  "all",
  "any",
  "use",
  "solution",
  "build",
  "make",
]);

export type OnboardingItem = { q: string; options: string[] };

export type FeatureBlock = { title: string; desc: string };

export type HowStep = { step: string; title: string; desc: string };

export type SectionLabels = {
  howItWorksTitle: string;
  howItWorksSubtitle: string;
  onboardingTitle: string;
  onboardingSubtitle: string;
  /** Supports {{idea}} and {{projectName}} */
  coreProductTitle: string;
  coreProductSubtitle: string;
  featuresSectionTitle: string;
  featuresSectionSubtitle: string;
  secondaryCta: string;
  tryItTitle: string;
  tryItSubtitle: string;
  browseTitle: string;
  browseSubtitle: string;
  pricingTitleTool: string;
  pricingTitleMarketplace: string;
  pricingTitleDefault: string;
};

export type TemplateFamily = {
  type: ProductType;
  /** Base LoremFlickr tag groups — always applied before idea keywords */
  heroImageSeedTags: string[];
  featureBlocks: FeatureBlock[];
  howItWorks: HowStep[];
  onboarding: OnboardingItem[];
  productActions: string[];
  sectionLabels: SectionLabels;
  uiMode: "tool" | "ai-tool" | "marketplace" | "landing" | "saas" | "creator_tool" | "growth_tool";
};

export function interpolateFamilyString(template: string, idea: string, projectName: string): string {
  const i = idea.trim() || "your product";
  const raw = template.replace(/\{\{idea\}\}/gi, i).replace(/\{\{projectName\}\}/g, projectName.trim() || "this product");
  return stripDashesFromDisplayText(raw);
}

/** 1–2 meaningful tokens from the idea for image tags (lowercased, comma-safe). */
export function extractCleanIdeaKeywords(idea: string, maxWords: number): string[] {
  const raw = (idea || "").toLowerCase();
  const words = raw
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !IDEA_STOP.has(w));
  const out: string[] = [];
  const seen = new Set<string>();
  for (const w of words) {
    if (seen.has(w)) continue;
    seen.add(w);
    out.push(w);
    if (out.length >= maxWords) break;
  }
  return out;
}

/** Allowed extra tags from the idea text for growth / creator heroes (strict). */
const GROWTH_TAG_WHITELIST = new Set([
  "youtube",
  "tiktok",
  "instagram",
  "content",
  "video",
  "analytics",
  "dashboard",
  "social",
  "media",
  "audience",
  "growth",
  "creator",
  "channel",
  "channels",
  "engagement",
  "subscriber",
  "subscribers",
  "views",
  "shorts",
  "reels",
]);

const CREATOR_TAG_WHITELIST = new Set([
  ...GROWTH_TAG_WHITELIST,
  "editing",
  "studio",
  "workflow",
  "clipper",
  "timeline",
  "short",
]);

/** Strip animal tokens from idea keywords when irrelevant (reduces random cat/dog photos on LoremFlickr). */
const ANIMAL_KEYWORDS = new Set([
  "cat",
  "cats",
  "dog",
  "dogs",
  "kitten",
  "kittens",
  "puppy",
  "puppies",
  "bird",
  "birds",
  "horse",
  "horses",
]);

function filterImageKeywordDrift(productType: ProductType, idea: string, words: string[]): string[] {
  const allowAnimals =
    productType === "marketplace" || /\b(breeder|breeders|kennel|pet|pets|puppy|puppies|dog|dogs|cat|cats|animal|animals)\b/i.test(idea);
  if (allowAnimals) return words;
  return words.filter((w) => !ANIMAL_KEYWORDS.has(w));
}

function pickWhitelistedIdeaTags(idea: string, whitelist: Set<string>): string[] {
  const raw = (idea || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/);
  const out: string[] = [];
  const seen = new Set<string>();
  for (const w of raw) {
    if (w.length < 2 || !whitelist.has(w)) continue;
    if (seen.has(w)) continue;
    seen.add(w);
    out.push(w);
    if (out.length >= 4) break;
  }
  return out;
}

/** Hero image tag path: controlled per-type seeds + optional idea keywords (no raw headline drift). */
export function buildHeroImageTagPath(productType: ProductType, idea: string): string {
  const family = getTemplateFamily(productType);

  if (productType === "growth_tool") {
    const base = family.heroImageSeedTags;
    const extra = pickWhitelistedIdeaTags(idea, GROWTH_TAG_WHITELIST);
    const merged = [...base, ...extra];
    const seen = new Set<string>();
    const unique: string[] = [];
    for (const t of merged) {
      const k = t.toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k);
      unique.push(t);
    }
    return unique.slice(0, 12).join(",");
  }

  if (productType === "creator_tool") {
    const base = family.heroImageSeedTags;
    const extra = pickWhitelistedIdeaTags(idea, CREATOR_TAG_WHITELIST);
    const merged = [...base, ...extra];
    const seen = new Set<string>();
    const unique: string[] = [];
    for (const t of merged) {
      const k = t.toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k);
      unique.push(t);
    }
    return unique.slice(0, 12).join(",");
  }

  const raw = extractCleanIdeaKeywords(idea, 2);
  const extra = filterImageKeywordDrift(productType, idea, raw);
  const merged = [...family.heroImageSeedTags, ...extra];
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const t of merged) {
    const k = t.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    unique.push(t);
  }
  return unique.slice(0, 12).join(",");
}

const TEMPLATE_FAMILIES: Record<ProductType, TemplateFamily> = {
  tool: {
    type: "tool",
    heroImageSeedTags: [
      "software",
      "dashboard",
      "utility",
      "workflow",
      "file",
      "processing",
      "document",
    ],
    featureBlocks: [
      { title: "Fast processing", desc: "Run conversions and checks in seconds — no heavy install." },
      { title: "Clear results", desc: "Preview output before you download or share." },
      { title: "Works in the browser", desc: "Use it anywhere; pick up where you left off." },
      { title: "Export-ready", desc: "Download or copy results in the format you need." },
    ],
    howItWorks: [
      { step: "1", title: "Add input", desc: "Upload a file or paste what you need to process." },
      { step: "2", title: "Run the tool", desc: "Get a clean result in seconds — see it before you commit." },
      { step: "3", title: "Download or share", desc: "Save the output or send it to your workflow." },
    ],
    onboarding: [
      {
        q: "What do you want to do first with {{projectName}}?",
        options: ["Convert or compress a file", "Check or validate something", "Extract or merge data", "Just exploring"],
      },
      {
        q: "What kind of input are you working with most?",
        options: ["Documents (PDF, Doc)", "Images or media", "Data (CSV, sheets)", "Mixed / not sure"],
      },
      {
        q: "How often will you use this?",
        options: ["Daily", "Weekly", "Occasionally", "One-off task"],
      },
    ],
    productActions: ["Upload file", "Run tool", "Download result", "Share output"],
    sectionLabels: {
      howItWorksTitle: "How it works",
      howItWorksSubtitle: "Three quick steps from input to result",
      onboardingTitle: "Tune the experience",
      onboardingSubtitle: "So we can match the tool to your workflow",
      coreProductTitle: "{{idea}} — at a glance",
      coreProductSubtitle: "Core actions in this tool",
      featuresSectionTitle: "Built for quick wins",
      featuresSectionSubtitle: "Everything you need to go from input to output",
      secondaryCta: "See how it works",
      tryItTitle: "Try it now — no signup needed",
      tryItSubtitle: "See a sample result, then save your work when you're ready.",
      browseTitle: "",
      browseSubtitle: "",
      pricingTitleTool: "Pricing",
      pricingTitleMarketplace: "How it works",
      pricingTitleDefault: "Choose your plan",
    },
    uiMode: "tool",
  },

  "ai-tool": {
    type: "ai-tool",
    heroImageSeedTags: [
      "artificial",
      "intelligence",
      "learning",
      "education",
      "workspace",
      "prompt",
      "interface",
      "generated",
      "creative",
    ],
    featureBlocks: [
      { title: "Prompt to output", desc: "Describe what you need — get structured results fast." },
      { title: "Iterate quickly", desc: "Refine with follow-ups until it matches your intent." },
      { title: "Quality presets", desc: "Balance speed, depth, and style for your use case." },
      { title: "Export anywhere", desc: "Copy, download, or plug into your stack." },
    ],
    howItWorks: [
      { step: "1", title: "Enter a prompt", desc: "Tell the AI what you want to create or transform." },
      { step: "2", title: "Generate output", desc: "Get a first draft in seconds — ready to review." },
      { step: "3", title: "Edit and export", desc: "Tweak the result, then save or share it." },
    ],
    onboarding: [
      {
        q: "What do you want AI to help you create with {{projectName}}?",
        options: ["Summaries or study notes", "Drafts or rewrites", "Code or structured data", "Images or visuals"],
      },
      {
        q: "How do you want the output delivered?",
        options: ["Plain text", "Structured sections", "Downloadable file", "In-app canvas"],
      },
      {
        q: "What matters most?",
        options: ["Speed", "Quality", "Control / edits", "Cost"],
      },
    ],
    productActions: ["Enter prompt", "Generate output", "Edit result", "Export"],
    sectionLabels: {
      howItWorksTitle: "How it works",
      howItWorksSubtitle: "From prompt to polished output",
      onboardingTitle: "Personalize your AI workflow",
      onboardingSubtitle: "We’ll tune defaults to match how you work",
      coreProductTitle: "{{idea}} — at a glance",
      coreProductSubtitle: "Your AI workflow in four actions",
      featuresSectionTitle: "Why teams use this AI workspace",
      featuresSectionSubtitle: "Designed for fast iteration and clear outputs",
      secondaryCta: "See how it works",
      tryItTitle: "Try the AI — no signup required",
      tryItSubtitle: "Run a sample generation, then unlock more when you sign up.",
      browseTitle: "",
      browseSubtitle: "",
      pricingTitleTool: "Pricing",
      pricingTitleMarketplace: "How it works",
      pricingTitleDefault: "Choose your plan",
    },
    uiMode: "ai-tool",
  },

  marketplace: {
    type: "marketplace",
    heroImageSeedTags: [
      "marketplace",
      "listings",
      "ecommerce",
      "shopping",
      "buyer",
      "seller",
      "browse",
    ],
    featureBlocks: [
      { title: "Search and filters", desc: "Find listings that match price, location, and trust signals." },
      { title: "Direct messaging", desc: "Talk to buyers or sellers without leaving the platform." },
      { title: "Verified profiles", desc: "Know who you’re dealing with before you commit." },
      { title: "Secure checkout", desc: "Simple flows whether you’re buying or listing." },
    ],
    howItWorks: [
      { step: "1", title: "Browse or list", desc: "Explore what’s available or post what you’re selling." },
      { step: "2", title: "Compare and chat", desc: "Ask questions, compare options, and agree on terms." },
      { step: "3", title: "Close the deal", desc: "Complete payment and delivery with confidence." },
    ],
    onboarding: [
      {
        q: "Are you mainly buying or selling on {{projectName}}?",
        options: ["Buying", "Selling", "Both", "Just browsing"],
      },
      {
        q: "What matters most to you?",
        options: ["Lowest price", "Trust and reviews", "Speed of response", "Selection / variety"],
      },
      {
        q: "Which category fits best?",
        options: ["Animals / pets", "Local services", "Collectibles", "General goods"],
      },
    ],
    productActions: ["Browse listings", "Compare options", "Message seller", "Post listing"],
    sectionLabels: {
      howItWorksTitle: "How it works",
      howItWorksSubtitle: "From discovery to a done deal",
      onboardingTitle: "Tailor your marketplace experience",
      onboardingSubtitle: "So we can show the right listings and tools",
      coreProductTitle: "{{idea}} — at a glance",
      coreProductSubtitle: "What you can do on this marketplace",
      featuresSectionTitle: "Everything for buyers and sellers",
      featuresSectionSubtitle: "Trust, discovery, and messaging in one place",
      secondaryCta: "See how it works",
      tryItTitle: "",
      tryItSubtitle: "",
      browseTitle: "Browse listings",
      browseSubtitle: "Find what you’re looking for — message sellers when you’re ready.",
      pricingTitleTool: "Pricing",
      pricingTitleMarketplace: "Plans for buyers and sellers",
      pricingTitleDefault: "Choose your plan",
    },
    uiMode: "marketplace",
  },

  landing: {
    type: "landing",
    heroImageSeedTags: [
      "startup",
      "landing",
      "page",
      "product",
      "launch",
      "waitlist",
      "newsletter",
    ],
    featureBlocks: [
      { title: "Clear story", desc: "What you’re building — and why it matters now." },
      { title: "Early access", desc: "Join the list for launch day and founding perks." },
      { title: "Roadmap transparency", desc: "See what’s shipping next and how feedback shapes it." },
      { title: "Lightweight signup", desc: "Email only — no spam, easy unsubscribe." },
    ],
    howItWorks: [
      { step: "1", title: "See the vision", desc: "Understand what’s launching and who it’s for." },
      { step: "2", title: "Join the waitlist", desc: "Reserve your spot and get launch updates." },
      { step: "3", title: "Get early access", desc: "Be first in line when the doors open." },
    ],
    onboarding: [
      {
        q: "What drew you to {{projectName}}?",
        options: ["The problem it solves", "The team / story", "A referral", "Curiosity"],
      },
      {
        q: "How do you want updates?",
        options: ["Email only", "Email + major milestones", "Quiet — launch day only", "Not sure yet"],
      },
      {
        q: "What would make early access valuable for you?",
        options: ["Founding pricing", "Shape the roadmap", "Private community", "Just early login"],
      },
    ],
    productActions: ["Join waitlist", "Learn more", "Share interest", "Book early access"],
    sectionLabels: {
      howItWorksTitle: "How launch works",
      howItWorksSubtitle: "From waitlist to first access",
      onboardingTitle: "Tell us what you care about",
      onboardingSubtitle: "We’ll personalize launch updates — no spam",
      coreProductTitle: "{{idea}} — what’s next",
      coreProductSubtitle: "Ways to stay close to the launch",
      featuresSectionTitle: "Why join early",
      featuresSectionSubtitle: "A focused launch — built with early supporters",
      secondaryCta: "How it works",
      tryItTitle: "",
      tryItSubtitle: "",
      browseTitle: "",
      browseSubtitle: "",
      pricingTitleTool: "Early supporter options",
      pricingTitleMarketplace: "How it works",
      pricingTitleDefault: "Choose your plan",
    },
    uiMode: "landing",
  },

  growth_tool: {
    type: "growth_tool",
    heroImageSeedTags: [
      "youtube",
      "content",
      "video",
      "analytics",
      "dashboard",
      "social",
      "media",
      "audience",
      "growth",
      "creator",
    ],
    featureBlocks: [
      { title: "Grow with clear channel signals", desc: "See what drives views and retention, not vanity counts." },
      { title: "Double down on what works", desc: "Compare thumbnails, titles, and hooks with simple before and after views." },
      { title: "Run focused content tests", desc: "Try one change at a time so you learn what actually moves the needle." },
      { title: "Turn insight into a weekly plan", desc: "Ship a repeatable rhythm instead of random posting." },
    ],
    howItWorks: [
      { step: "1", title: "Set your channel and goal", desc: "Tell us the platform and what you are optimizing for." },
      { step: "2", title: "Generate a growth plan", desc: "Get ideas, a weekly rhythm, and experiments you can run immediately." },
      { step: "3", title: "Save and iterate", desc: "Plans stay in your workspace. Adjust and regenerate anytime." },
    ],
    onboarding: [
      {
        q: "What platform are you growing on?",
        options: ["YouTube", "TikTok", "Instagram", "Other / multiple"],
      },
      {
        q: "What is your main goal?",
        options: ["More views", "More subscribers", "Monetization", "Engagement quality"],
      },
      {
        q: "How often do you post?",
        options: ["Daily", "A few times a week", "Weekly", "Rarely"],
      },
    ],
    productActions: ["Analyze channel", "Optimize videos", "Track growth", "Test content ideas"],
    sectionLabels: {
      howItWorksTitle: "How growth works here",
      howItWorksSubtitle: "Measure, learn, and improve on a steady cadence",
      onboardingTitle: "Tune this to your channel",
      onboardingSubtitle: "So {{projectName}} highlights the metrics that matter for you",
      coreProductTitle: "{{idea}} growth hub",
      coreProductSubtitle: "Move from guessing to repeatable growth loops",
      featuresSectionTitle: "Built for measurable growth",
      featuresSectionSubtitle: "Less vanity, more signal on what to do next",
      secondaryCta: "See how it works",
      tryItTitle: "",
      tryItSubtitle: "",
      browseTitle: "",
      browseSubtitle: "",
      pricingTitleTool: "Pricing",
      pricingTitleMarketplace: "How it works",
      pricingTitleDefault: "Choose your plan",
    },
    uiMode: "growth_tool",
  },

  creator_tool: {
    type: "creator_tool",
    heroImageSeedTags: [
      "content",
      "creator",
      "video",
      "editing",
      "timeline",
      "studio",
      "workflow",
      "short",
    ],
    featureBlocks: [
      { title: "Draft faster in one canvas", desc: "Storyboard, rough cut, and polish without juggling five tabs." },
      { title: "Templates for your format", desc: "Hooks, captions, and aspect ratios tuned for short-form." },
      { title: "Schedule with confidence", desc: "Queue posts when your audience is actually online." },
      { title: "See what lands", desc: "Simple performance views so the next clip isn’t a guess." },
    ],
    howItWorks: [
      { step: "1", title: "Import or record", desc: "Bring in clips, voiceovers, and brand assets." },
      { step: "2", title: "Shape the story", desc: "Trim, caption, and brand — optimized for your platform." },
      { step: "3", title: "Publish or export", desc: "Push live or hand off a clean file to your stack." },
    ],
    onboarding: [
      {
        q: "Which platforms do you publish on most?",
        options: ["Short video", "Long video", "Social feed", "Multiple / not sure"],
      },
      {
        q: "How often do you post today?",
        options: ["Daily", "A few times a week", "Weekly", "Sporadically"],
      },
      {
        q: "What’s your main goal right now?",
        options: ["Audience growth", "Monetization", "Reach / awareness", "Posting consistency"],
      },
    ],
    productActions: ["Create content", "Schedule posts", "Analyze performance", "Grow audience"],
    sectionLabels: {
      howItWorksTitle: "How your creator workflow runs",
      howItWorksSubtitle: "From raw clips to shipped posts",
      onboardingTitle: "Match the workflow to your channel",
      onboardingSubtitle: "We’ll prioritize the tools you actually use",
      coreProductTitle: "{{idea}} — creator workspace",
      coreProductSubtitle: "The core moves creators repeat every week",
      featuresSectionTitle: "Made for publishing velocity",
      featuresSectionSubtitle: "Less friction from idea to upload",
      secondaryCta: "See how it works",
      tryItTitle: "",
      tryItSubtitle: "",
      browseTitle: "",
      browseSubtitle: "",
      pricingTitleTool: "Pricing",
      pricingTitleMarketplace: "How it works",
      pricingTitleDefault: "Choose your plan",
    },
    uiMode: "creator_tool",
  },

  saas: {
    type: "saas",
    heroImageSeedTags: [
      "saas",
      "dashboard",
      "analytics",
      "team",
      "workflow",
      "business",
      "software",
    ],
    featureBlocks: [
      { title: "One workspace", desc: "Plans, tasks, and visibility in a single calm view." },
      { title: "Automations", desc: "Reduce manual follow-ups with simple rules and reminders." },
      { title: "Team-ready", desc: "Invite collaborators with roles that match how you work." },
      { title: "Insightful reports", desc: "See progress and bottlenecks without spreadsheet gymnastics." },
    ],
    howItWorks: [
      { step: "1", title: "Create your workspace", desc: "Sign up and connect what you already use." },
      { step: "2", title: "Personalize setup", desc: "Answer a few questions so defaults match your goals." },
      { step: "3", title: "Ship outcomes", desc: "Track work, report up, and improve every week." },
    ],
    onboarding: [
      {
        q: "What do you want to achieve with {{projectName}}?",
        options: ["Clarify priorities", "Save time each week", "Grow revenue or reach", "Stay organized as a team"],
      },
      {
        q: "How are you solving this today?",
        options: ["Spreadsheets", "Another product", "Manual process", "Not really solving it"],
      },
      {
        q: "What best describes you?",
        options: ["Solo", "Small team", "Growing company", "Just exploring"],
      },
    ],
    productActions: ["Create workspace", "Track activity", "View reports", "Invite team"],
    sectionLabels: {
      howItWorksTitle: "How it works",
      howItWorksSubtitle: "Get value in your first session",
      onboardingTitle: "Personalize your experience",
      onboardingSubtitle: "Quick setup so we can tailor {{projectName}} for you",
      coreProductTitle: "{{idea}} — at a glance",
      coreProductSubtitle: "Here’s what you can do inside the product",
      featuresSectionTitle: "Everything in one place",
      featuresSectionSubtitle: "Less context switching — more progress",
      secondaryCta: "See how it works",
      tryItTitle: "",
      tryItSubtitle: "",
      browseTitle: "",
      browseSubtitle: "",
      pricingTitleTool: "Pricing",
      pricingTitleMarketplace: "How it works",
      pricingTitleDefault: "Choose your plan",
    },
    uiMode: "saas",
  },
};

export function getTemplateFamily(type: ProductType): TemplateFamily {
  return TEMPLATE_FAMILIES[type];
}
