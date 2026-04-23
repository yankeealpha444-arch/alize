// Smart copy generator for MVPs
// Product-type-aware — generates different copy per lane

import type { ProductType } from "./productType";
import { detectProductType } from "./productType";
import type { TemplateFamily } from "./templateFamilies";
import { getTemplateFamily } from "./templateFamilies";
import { stripDashesFromDisplayText } from "./textNormalize";

interface GeneratedCopy {
  headline: string;
  subtitle: string;
  cta: string;
  tagline: string;
  bullets: string[];
  howItWorks: Array<{ step: string; title: string; desc: string }>;
  pricingPlans: Array<{ name: string; price: string; desc: string; features: string[]; cta: string }>;
}

// ── Idea-specific patterns (hero + bullets) — skipped when growth_tool / creator_tool (enforced copy) ──
const ideaPatterns: Array<{
  match: RegExp;
  headline: string;
  subtitle: string;
  cta: string;
  tagline: string;
  bullets: string[];
}> = [
  {
    match: /\b(clothes|clothing|fashion|outfit|wear|wardrobe|apparel|digital wardrobe|try on|online shopping for clothes)\b/i,
    headline: "Wear and shop outfits online — see style before you buy",
    subtitle: "Browse curated looks, mix pieces, and try styles digitally. Real products, clear prices.",
    cta: "Browse the collection",
    tagline: "Fashion marketplace, built for discovery",
    bullets: ["Curated listings with photos", "Save favorites in one tap", "Fast, simple checkout flow", "New drops weekly"],
  },
  {
    match: /pdf.*(google|doc)|google.*doc.*pdf|convert.*pdf/i,
    headline: "Convert PDF to editable Google Docs in seconds",
    subtitle: "Upload your PDF and get a clean, editable document. No formatting headaches.",
    cta: "Convert a file",
    tagline: "The fastest PDF-to-Docs converter",
    bullets: ["Preserves formatting", "No software to install", "Works with any PDF", "Free to try"],
  },
  {
    match: /\b(ai study|study tutor|ai tutor|tutoring|homework help)\b/i,
    headline: "Your AI study partner that adapts to how you learn",
    subtitle: "Turn notes, prompts, or topics into explanations and practice. No chaos.",
    cta: "Start learning",
    tagline: "Smarter studying, less cramming",
    bullets: ["Step-by-step explanations", "Quiz yourself on weak spots", "Works with your materials", "Free to try"],
  },
  {
    match: /\bsocial media (dashboard|suite|calendar|scheduler|management|toolkit|platform)\b/i,
    headline: "Manage and grow your social media in one place",
    subtitle: "Plan content, track performance, and improve faster with one simple dashboard.",
    cta: "Start free",
    tagline: "Built for creators and small teams",
    bullets: ["Schedule posts across platforms", "Track what's working", "AI content suggestions", "Team collaboration"],
  },
  {
    match: /email/i,
    headline: "Send emails that actually get opened",
    subtitle: "Write, schedule, and track email campaigns without the complexity.",
    cta: "Start sending",
    tagline: "Email made simple",
    bullets: ["Drag-and-drop editor", "Open and click tracking", "Audience segmentation", "Free to start"],
  },
  {
    match: /fitness|workout|gym/i,
    headline: "Train smarter and see real results",
    subtitle: "Track workouts, follow plans, and stay consistent. All in one app.",
    cta: "Start training",
    tagline: "Your personal fitness system",
    bullets: ["Custom workout plans", "Progress tracking", "Exercise library", "Works on any device"],
  },
  {
    match: /finance|money|budget/i,
    headline: "Take control of your money without the spreadsheet headache",
    subtitle: "Track spending, set budgets, and see where your money actually goes.",
    cta: "Start tracking",
    tagline: "Simple money management",
    bullets: ["Automatic categorization", "Budget alerts", "Visual spending reports", "Bank-level security"],
  },
  {
    match: /surfboard|surf/i,
    headline: "Buy and sell surfboards in one place",
    subtitle: "List your board, find buyers, and browse the best deals from surfers near you.",
    cta: "Browse boards",
    tagline: "The surfboard marketplace",
    bullets: ["Local and worldwide listings", "Direct buyer-seller chat", "Price comparison", "Verified sellers"],
  },
  {
    match: /logo/i,
    headline: "Create a professional logo in seconds with AI",
    subtitle: "Describe your brand and get a custom logo instantly. No design skills needed.",
    cta: "Generate a logo",
    tagline: "AI-powered logo maker",
    bullets: ["Unlimited variations", "High-res downloads", "Brand color matching", "Commercial license"],
  },
  {
    match: /project|task/i,
    headline: "Ship projects faster without the chaos",
    subtitle: "Plan, track, and collaborate with your team in one simple workspace.",
    cta: "Start free",
    tagline: "Project management, simplified",
    bullets: ["Task boards and timelines", "Team collaboration", "Progress tracking", "Integrations"],
  },
  {
    match: /food|recipe|meal|cook/i,
    headline: "Plan better meals with less stress",
    subtitle: "Get recipe ideas, plan your week, and generate shopping lists automatically.",
    cta: "Plan your meals",
    tagline: "Meal planning made easy",
    bullets: ["Smart recipe suggestions", "Auto shopping lists", "Dietary preferences", "Family-friendly"],
  },
  {
    match: /hire|recruit|talent|hr/i,
    headline: "Hire the right people, faster",
    subtitle: "Post jobs, screen candidates, and manage your pipeline in one place.",
    cta: "Post a job",
    tagline: "Hiring, simplified",
    bullets: ["Job board distribution", "Applicant tracking", "Interview scheduling", "Team scorecards"],
  },
  {
    match: /prompt|startup builder/i,
    headline: "Turn your startup idea into a real product",
    subtitle: "Describe your idea and get a working MVP you can test with real users.",
    cta: "Build your MVP",
    tagline: "From idea to product in minutes",
    bullets: ["AI-generated MVP", "Real user testing", "Validation metrics", "Iterate and improve"],
  },
];

function ctaForType(type: ProductType): string {
  switch (type) {
    case "tool":
    case "ai-tool":
      return "Try it now, free";
    case "marketplace":
      return "Browse listings";
    case "landing":
      return "Get early access";
    default:
      return "Get started free";
  }
}

function buildGrowthEnforcedCopy(idea: string, projectName: string, family: TemplateFamily): Omit<GeneratedCopy, "howItWorks" | "pricingPlans"> {
  const rawName = projectName.trim() || idea.split(/\s+/).slice(0, 4).join(" ");
  const pn = stripDashesFromDisplayText(rawName);
  const yt = /\byoutube\b/i.test(idea);
  const headline = stripDashesFromDisplayText(
    `${pn}. ${yt ? "Grow your YouTube faster with clear signals" : "Grow your audience faster with clear signals"}`,
  );
  return {
    headline,
    subtitle: stripDashesFromDisplayText("See what drives views and double down on what works."),
    tagline: stripDashesFromDisplayText("Channel analytics without spreadsheet pain"),
    cta: "Get started free",
    bullets: family.featureBlocks.map((f) => stripDashesFromDisplayText(f.title)),
  };
}

function buildCreatorEnforcedCopy(idea: string, projectName: string, family: TemplateFamily): Omit<GeneratedCopy, "howItWorks" | "pricingPlans"> {
  const rawName = projectName.trim() || idea.split(/\s+/).slice(0, 4).join(" ");
  const pn = stripDashesFromDisplayText(rawName);
  return {
    headline: stripDashesFromDisplayText(`${pn}. Turn ideas into high performing content faster`),
    subtitle: stripDashesFromDisplayText("Plan, create, and publish in one calm workflow."),
    tagline: stripDashesFromDisplayText("Less tool hopping, more shipping"),
    cta: "Get started free",
    bullets: family.featureBlocks.map((f) => stripDashesFromDisplayText(f.title)),
  };
}

/** When no regex match: hero + bullets come from template family feature blocks. */
function buildFamilyFirstCopy(idea: string, projectName: string, family: TemplateFamily, type: ProductType): Omit<GeneratedCopy, "howItWorks" | "pricingPlans"> {
  const cleaned =
    idea.replace(/\b(app|tool|platform|system|software|saas|product|builder|maker|manager|grower|tracker)\b/gi, "").trim() || idea;
  const displayName = stripDashesFromDisplayText(projectName.trim() || cleaned.split(/\s+/).slice(0, 4).join(" "));
  const fb = family.featureBlocks;
  const h1 = fb[0]?.title ?? family.sectionLabels.featuresSectionTitle;
  const subtitle = stripDashesFromDisplayText(fb.slice(0, 2).map((f) => f.desc).join(" "));
  const tagline = stripDashesFromDisplayText(fb[2]?.title ?? family.sectionLabels.featuresSectionSubtitle);

  return {
    headline: stripDashesFromDisplayText(`${displayName}. ${h1}`),
    subtitle,
    tagline,
    cta: ctaForType(type),
    bullets: fb.map((f) => stripDashesFromDisplayText(f.title)),
  };
}

function sanitizeHowItWorks(steps: Array<{ step: string; title: string; desc: string }>) {
  return steps.map((s) => ({
    step: s.step,
    title: stripDashesFromDisplayText(s.title),
    desc: stripDashesFromDisplayText(s.desc),
  }));
}

function sanitizePricingPlans(
  plans: Array<{ name: string; price: string; desc: string; features: string[]; cta: string }>,
) {
  return plans.map((p) => ({
    name: stripDashesFromDisplayText(p.name),
    price: p.price,
    desc: stripDashesFromDisplayText(p.desc),
    features: p.features.map((f) => stripDashesFromDisplayText(f)),
    cta: stripDashesFromDisplayText(p.cta),
  }));
}

// ── Pricing per product type ────────────────────────────────────────
function getPricingPlans(type: ProductType): Array<{ name: string; price: string; desc: string; features: string[]; cta: string }> {
  switch (type) {
    case "tool":
    case "ai-tool":
      return [
        { name: "Free", price: "$0", desc: "Try it out", features: ["3 free conversions", "Standard quality", "Email support"], cta: "Try free" },
        { name: "Unlimited", price: "$9/mo", desc: "No limits", features: ["Unlimited conversions", "Priority processing", "Bulk upload", "API access"], cta: "Join waitlist" },
      ];
    case "marketplace":
      return [
        { name: "Buyer", price: "Free", desc: "Browse and buy", features: ["Unlimited browsing", "Direct messaging", "Save favorites", "Price alerts"], cta: "Start browsing" },
        { name: "Seller", price: "$4.99/listing", desc: "List and sell", features: ["Featured placement", "Analytics", "Verified badge", "Priority support"], cta: "List an item" },
      ];
    case "landing":
      return [
        { name: "Early Access", price: "Free", desc: "Be first in line", features: ["Priority access", "Founding member perks", "Shape the product"], cta: "Join waitlist" },
      ];
    case "saas":
    case "creator_tool":
    case "growth_tool":
      return [
        { name: "Free", price: "$0", desc: "For individuals getting started", features: ["Core features", "Basic analytics", "Community support"], cta: "Get started free" },
        { name: "Pro", price: "$29/mo", desc: "For teams that need more", features: ["All features", "Advanced analytics", "Priority support", "Team collaboration"], cta: "Join Pro waitlist" },
      ];
  }
}

// ── Main generator ──────────────────────────────────────────────────
export function generateCopy(idea: string, projectName: string): GeneratedCopy {
  const type = detectProductType(idea);
  const family = getTemplateFamily(type);

  let base: Omit<GeneratedCopy, "howItWorks" | "pricingPlans">;

  if (type === "growth_tool") {
    base = buildGrowthEnforcedCopy(idea, projectName, family);
  } else if (type === "creator_tool") {
    base = buildCreatorEnforcedCopy(idea, projectName, family);
  } else if (type === "marketplace") {
    const rawPattern = ideaPatterns.find((p) => p.match.test(idea));
    if (rawPattern) {
      base = {
        headline: stripDashesFromDisplayText(rawPattern.headline),
        subtitle: stripDashesFromDisplayText(rawPattern.subtitle),
        cta: stripDashesFromDisplayText(rawPattern.cta),
        tagline: stripDashesFromDisplayText(rawPattern.tagline),
        bullets: rawPattern.bullets.map((b) => stripDashesFromDisplayText(b)),
      };
    } else {
      base = buildFamilyFirstCopy(idea, projectName, family, type);
    }
  } else {
    const rawPattern = ideaPatterns.find((p) => p.match.test(idea));
    const pattern = rawPattern
      ? {
          headline: rawPattern.headline,
          subtitle: rawPattern.subtitle,
          cta: rawPattern.cta,
          tagline: rawPattern.tagline,
          bullets: rawPattern.bullets.map((b) => stripDashesFromDisplayText(b)),
        }
      : undefined;

    base = pattern
      ? {
          headline: stripDashesFromDisplayText(pattern.headline),
          subtitle: stripDashesFromDisplayText(pattern.subtitle),
          cta: stripDashesFromDisplayText(pattern.cta),
          tagline: stripDashesFromDisplayText(pattern.tagline),
          bullets: pattern.bullets,
        }
      : buildFamilyFirstCopy(idea, projectName, family, type);
  }

  return {
    ...base,
    headline: stripDashesFromDisplayText(base.headline),
    subtitle: stripDashesFromDisplayText(base.subtitle),
    tagline: stripDashesFromDisplayText(base.tagline),
    cta: stripDashesFromDisplayText(base.cta),
    bullets: base.bullets.map((b) => stripDashesFromDisplayText(b)),
    howItWorks: sanitizeHowItWorks(family.howItWorks),
    pricingPlans: sanitizePricingPlans(getPricingPlans(type)),
  };
}
