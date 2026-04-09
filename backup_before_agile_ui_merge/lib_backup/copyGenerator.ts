export type GeneratedCopy = {
  tagline: string;
  headline: string;
  subtitle: string;
  cta: string;
  pricingPlans: Array<{ name: string; price: string; blurb: string }>;
};

function titleFromIdea(idea: string, fallback: string) {
  const words = idea.split(/\s+/).filter(Boolean);
  return words.slice(0, 4).join(" ") || fallback;
}

export function generateCopy(idea: string, projectName: string): GeneratedCopy {
  const name = projectName || titleFromIdea(idea, "Alizé");
  const trimmed = idea.trim();

  const headline = trimmed
    ? `${name} — built to validate demand`
    : `${name} — validate demand with real users`;

  const subtitle = trimmed
    ? `Launch a working MVP to measure actual interest: signups, conversations, and conversion signals — then iterate based on evidence.`
    : `Turn your idea into a live MVP with automated evidence capture so you know exactly what to do next.`;

  return {
    tagline: "Live MVP · Automated tracking · Clear next steps",
    headline,
    subtitle,
    cta: "Get Started",
    pricingPlans: [
      { name: "Starter", price: "$0", blurb: "Test demand and collect signals." },
      { name: "Growth", price: "$29", blurb: "Run experiments and improve faster." },
      { name: "Pro", price: "$99", blurb: "Scale tracking and validation loops." },
    ],
  };
}

