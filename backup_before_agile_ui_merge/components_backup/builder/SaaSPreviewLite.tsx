import { useEffect, useMemo, useState } from "react";
import { Check, Sparkles } from "lucide-react";
import { getMvpCustomizations } from "@/lib/projectData";
import { generateCopy } from "@/lib/copyGenerator";

export default function SaaSPreviewLite({
  projectId,
  projectName,
  includePricing,
}: {
  projectId: string;
  projectName: string;
  includePricing: boolean;
}) {
  const idea = (typeof window !== "undefined" ? localStorage.getItem("alize_idea") : null) || projectName;

  const [customizations, setCustomizations] = useState(() => getMvpCustomizations(projectId));

  useEffect(() => {
    const handler = () => setCustomizations(getMvpCustomizations(projectId));
    window.addEventListener("alize-mvp-updated", handler);
    return () => window.removeEventListener("alize-mvp-updated", handler);
  }, [projectId]);

  const copy = useMemo(() => generateCopy(idea, projectName), [idea, projectName]);
  const headline = customizations.headline || copy.headline;
  const subtitle = customizations.subtitle || copy.subtitle;
  const ctaText = customizations.ctaText || copy.cta;
  const pricingCopy =
    customizations.pricingCopy || copy.pricingPlans.map((p) => `${p.name}: ${p.price}`).join(" · ");

  return (
    <div className="text-foreground relative">
      {/* Preview top nav (reference-like) */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <span className="text-sm font-semibold tracking-tight">{projectName}</span>
        <div className="flex items-center gap-4">
          <span className="text-xs text-muted-foreground">How it works</span>
          {includePricing && <span className="text-xs text-muted-foreground">Pricing</span>}
          <button className="text-xs bg-foreground text-background px-4 py-1.5 rounded-md font-medium hover:opacity-90 transition-opacity">
            Get Started
          </button>
        </div>
      </div>

      {/* Hero */}
      <div className="px-6 py-14 border-b border-border relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-secondary/40 via-transparent to-primary/5 pointer-events-none" />
        <div className="max-w-lg mx-auto text-center relative">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-border bg-secondary/40 text-[10px] text-muted-foreground mb-5">
            <Sparkles className="w-3 h-3" />
            {copy.tagline}
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 leading-tight">
            {headline}
          </h1>
          <p className="text-sm text-muted-foreground mb-8 leading-relaxed max-w-md mx-auto">{subtitle}</p>
          <div className="flex items-center justify-center gap-3 mb-8">
            <button className="bg-foreground text-background px-7 py-3 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity shadow-lg">
              {ctaText}
            </button>
            <button className="border border-border px-7 py-3 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors">
              See how it works
            </button>
          </div>
          <div className="flex items-center justify-center gap-5 text-[11px] text-muted-foreground">
            {["Live MVP", "Real user signals", "Clear next steps"].map((b) => (
              <span key={b} className="flex items-center gap-1.5">
                <Check className="w-3 h-3 text-foreground/50" />
                {b}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Pricing (condensed) */}
      {includePricing && (
        <div className="px-6 py-10 border-b border-border">
          <p className="text-xs font-semibold text-foreground uppercase tracking-widest mb-3">Pricing</p>
          <p className="text-sm text-muted-foreground">{pricingCopy}</p>
        </div>
      )}

      {/* Footer placeholder */}
      <div className="px-6 py-10">
        <p className="text-xs text-muted-foreground">
          Preview only. Use the editor to change headline, CTA, and pricing copy.
        </p>
      </div>
    </div>
  );
}

