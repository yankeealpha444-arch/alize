// Smart copy generator for MVPs
// Product-type-aware — generates different copy per lane

import { ProductType, detectProductType } from "./productType";

interface GeneratedCopy {
  headline: string;
  subtitle: string;
  cta: string;
  tagline: string;
  bullets: string[];
  howItWorks: Array<{ step: string; title: string; desc: string }>;
  pricingPlans: Array<{ name: string; price: string; desc: string; features: string[]; cta: string }>;
}

// ── Idea-specific patterns ──────────────────────────────────────────
const ideaPatterns: Array<{
  match: RegExp;
  headline: string;
  subtitle: string;
  cta: string;
  tagline: string;
  bullets: string[];
}> = [
  {
    match: /pdf.*(google|doc)|google.*doc.*pdf|convert.*pdf/i,
    headline: "Convert PDF to editable Google Docs in seconds",
    subtitle: "Upload your PDF and get a clean, editable document — no formatting headaches.",
    cta: "Convert a file",
    tagline: "The fastest PDF-to-Docs converter",
    bullets: ["Preserves formatting", "No software to install", "Works with any PDF", "Free to try"],
  },
  {
    match: /social media/i,
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
    subtitle: "Track workouts, follow plans, and stay consistent — all in one app.",
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

// ── How It Works per product type ───────────────────────────────────
function getHowItWorks(type: ProductType, idea: string): Array<{ step: string; title: string; desc: string }> {
  switch (type) {
    case "tool":
      return [
        { step: "1", title: "Upload or paste", desc: "Add your file or content to process" },
        { step: "2", title: "Get your result", desc: "See your result instantly — no waiting" },
        { step: "3", title: "Download or share", desc: "Save your result with one click" },
      ];
    case "ai-tool":
      return [
        { step: "1", title: "Describe what you need", desc: "Tell the AI what you want to create" },
        { step: "2", title: "AI generates it", desc: "Get your result in seconds" },
        { step: "3", title: "Download or refine", desc: "Save it or tweak until perfect" },
      ];
    case "marketplace":
      return [
        { step: "1", title: "Browse or list", desc: "Find what you need or post what you're selling" },
        { step: "2", title: "Connect", desc: "Message buyers or sellers directly" },
        { step: "3", title: "Deal done", desc: "Complete the transaction securely" },
      ];
    case "landing":
      return [
        { step: "1", title: "See what we're building", desc: "Learn about the product and vision" },
        { step: "2", title: "Join early access", desc: "Get on the list before public launch" },
        { step: "3", title: "Be first", desc: "Get notified the moment we launch" },
      ];
    default: // saas
      return [
        { step: "1", title: "Create your account", desc: "Sign up in seconds — no credit card needed" },
        { step: "2", title: "Set up your workspace", desc: "Tell us what you need and we'll personalize" },
        { step: "3", title: "Start getting results", desc: "Use the product and see value immediately" },
      ];
  }
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
    default: // saas
      return [
        { name: "Free", price: "$0", desc: "For individuals getting started", features: ["Core features", "Basic analytics", "Community support"], cta: "Get started free" },
        { name: "Pro", price: "$29/mo", desc: "For teams that need more", features: ["All features", "Advanced analytics", "Priority support", "Team collaboration"], cta: "Join Pro waitlist" },
      ];
  }
}

// ── Generic copy per type (fallback) ────────────────────────────────
function getGenericCopy(type: ProductType, idea: string, projectName: string): Omit<GeneratedCopy, "howItWorks" | "pricingPlans"> {
  const cleaned = idea
    .replace(/\b(app|tool|platform|system|software|saas|product|builder|maker|manager|grower|tracker)\b/gi, "")
    .trim() || idea;

  switch (type) {
    case "tool":
      return {
        headline: `${cleaned} — done in seconds`,
        subtitle: `${projectName} handles it instantly so you don't have to. No signup required to try.`,
        cta: "Try it now — free",
        tagline: `The fastest way to ${cleaned.toLowerCase()}`,
        bullets: ["No signup needed to try", "Results in seconds", "Download instantly", "Free to start"],
      };
    case "ai-tool":
      return {
        headline: `Generate ${cleaned.toLowerCase()} with AI`,
        subtitle: `Describe what you need and ${projectName} creates it instantly. No design skills required.`,
        cta: "Try it now — free",
        tagline: `AI-powered ${cleaned.toLowerCase()}`,
        bullets: ["AI does the work", "Unlimited variations", "Download in high quality", "Free to start"],
      };
    case "marketplace":
      return {
        headline: `The best place to find ${cleaned.toLowerCase()}`,
        subtitle: `${projectName} connects buyers and sellers. Browse listings or post your own.`,
        cta: "Browse listings",
        tagline: `The ${cleaned.toLowerCase()} marketplace`,
        bullets: ["Browse and compare", "Direct messaging", "Verified listings", "Free to join"],
      };
    case "landing":
      return {
        headline: `${cleaned} is coming soon`,
        subtitle: `${projectName} is launching soon. Join the waitlist and help shape the first version.`,
        cta: "Get early access",
        tagline: `Coming soon`,
        bullets: ["Be the first to try", "Shape the product", "Founding member perks", "No spam, ever"],
      };
    default: // saas
      return {
        headline: `The easier way to ${cleaned.toLowerCase()}`,
        subtitle: `${projectName} helps you get results without the complexity. One simple system to plan, track, and improve.`,
        cta: "Get started free",
        tagline: `Built for people who care about ${cleaned.toLowerCase()}`,
        bullets: ["Set up in under 2 minutes", "No credit card required", "Works on any device", "Cancel anytime"],
      };
  }
}

// ── Main generator ──────────────────────────────────────────────────
export function generateCopy(idea: string, projectName: string): GeneratedCopy {
  const type = detectProductType(idea);

  // Check for idea-specific pattern first
  const pattern = ideaPatterns.find(p => p.match.test(idea));

  const base = pattern
    ? { headline: pattern.headline, subtitle: pattern.subtitle, cta: pattern.cta, tagline: pattern.tagline, bullets: pattern.bullets }
    : getGenericCopy(type, idea, projectName);

  return {
    ...base,
    howItWorks: getHowItWorks(type, idea),
    pricingPlans: getPricingPlans(type),
  };
}
