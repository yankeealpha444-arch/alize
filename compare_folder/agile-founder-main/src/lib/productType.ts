// Product type detection — determines MVP flow based on idea

export type ProductType = "tool" | "saas" | "marketplace" | "landing" | "ai-tool";

export interface ProductTypeInfo {
  type: ProductType;
  label: string;
  flow: string[];
  firstStep: string;
  description: string;
}

const patterns: Array<{ match: RegExp; type: ProductType }> = [
  // AI tools
  { match: /\b(ai|gpt|chatbot|generate|generator|prompt|machine learning|ml model|image generat|text generat|ai logo|ai writ)/i, type: "ai-tool" },
  // Tools / converters / calculators
  { match: /\b(convert|calculator|checker|scanner|compress|resize|format|extract|merge|split|download|upload|pdf|csv|mp3|mp4|jpg|png|qr|url short|password gen|translator|timer|stopwatch|countdown|scraper|validator)/i, type: "tool" },
  // Marketplaces
  { match: /\b(marketplace|for sale|buy and sell|listing|classified|auction|rent|hire freelanc|directory|shop|store|ecommerce|e-commerce|surfboard|sneaker|vintage|handmade)/i, type: "marketplace" },
  // SaaS systems
  { match: /\b(crm|erp|dashboard|manager|management|planner|scheduler|tracker|analytics|platform|system|saas|subscription|workspace|collaboration|project manage|team|workflow|automat)/i, type: "saas" },
  // Landing page / content
  { match: /\b(blog|newsletter|portfolio|landing page|waitlist|coming soon|announcement|launch|pre-launch)/i, type: "landing" },
];

export function detectProductType(idea: string): ProductType {
  const lower = idea.toLowerCase().trim();
  for (const p of patterns) {
    if (p.match.test(lower)) return p.type;
  }
  // Default to SaaS
  return "saas";
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
  }
}
