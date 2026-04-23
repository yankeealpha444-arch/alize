import { useEffect, useMemo, useState } from "react";
import { Check, Sparkles } from "lucide-react";
import { getMvpCustomizations } from "@/lib/projectData";
import { generateCopy } from "@/lib/copyGenerator";
import { detectProductType } from "@/lib/productType";
import {
  saasShellClass,
  saasNavClass,
  saasPrimaryButtonClass,
  saasSecondaryButtonClass,
} from "@/lib/saasPreviewVisual";
import { useSaaSVisualWithHero } from "@/hooks/useSaaSVisualWithHero";

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
  const productType = detectProductType(idea);

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

  const visual = useSaaSVisualWithHero(idea, headline, productType);
  const [heroImgBroken, setHeroImgBroken] = useState(false);
  const heroImageSrc = heroImgBroken ? visual.heroFallbackUrl : visual.heroPrimaryUrl;
  useEffect(() => {
    setHeroImgBroken(false);
  }, [visual.heroPrimaryUrl]);

  return (
    <div className={`text-foreground relative ${saasShellClass} [&_.text-muted-foreground]:text-slate-400/90`}>
      {/* Preview top nav (reference-like) */}
      <div className={`flex items-center justify-between px-6 py-3.5 sticky top-0 z-10 ${saasNavClass}`}>
        <span className="text-sm font-semibold tracking-tight text-white">{projectName}</span>
        <div className="flex items-center gap-4">
          <span className="text-xs text-muted-foreground">How it works</span>
          {includePricing && <span className="text-xs text-muted-foreground">Pricing</span>}
          <button className={`text-xs px-4 py-1.5 rounded-lg font-medium ${saasPrimaryButtonClass}`}>
            Get Started
          </button>
        </div>
      </div>

      {/* Hero */}
      <div className="px-6 md:px-8 py-14 md:py-20 border-b border-white/10 relative overflow-hidden !bg-transparent">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/50 via-slate-900/30 to-violet-950/40 pointer-events-none" />
        <div className="max-w-6xl mx-auto relative z-[1]">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <div className="max-w-lg mx-auto lg:mx-0 text-center lg:text-left">
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/15 bg-white/5 text-[10px] text-muted-foreground mb-5">
                <Sparkles className="w-3 h-3" />
                {copy.tagline}
              </div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 leading-tight text-white drop-shadow-sm">
                {headline}
              </h1>
              <p className="text-sm text-muted-foreground mb-8 leading-relaxed max-w-md mx-auto lg:mx-0">{subtitle}</p>
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 mb-8">
                <button className={`px-7 py-3 rounded-xl text-sm font-semibold shadow-lg ${saasPrimaryButtonClass}`}>
                  {ctaText}
                </button>
                <button className={`px-7 py-3 rounded-xl text-sm ${saasSecondaryButtonClass}`}>
                  See how it works
                </button>
              </div>
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-5 text-[11px] text-muted-foreground">
                {["Live MVP", "Real user signals", "Clear next steps"].map((b) => (
                  <span key={b} className="flex items-center gap-1.5">
                    <Check className="w-3 h-3 text-indigo-400/90" />
                    {b}
                  </span>
                ))}
              </div>
            </div>
            <div className="relative mx-auto max-w-xl w-full">
              <img
                src={heroImageSrc}
                alt=""
                onError={() => setHeroImgBroken(true)}
                className="w-full rounded-2xl object-cover aspect-[4/3] shadow-2xl ring-1 ring-white/10 transition-transform duration-500 hover:scale-[1.02]"
              />
              <div className="pointer-events-none absolute -inset-1 rounded-3xl bg-gradient-to-tr from-indigo-500/25 to-fuchsia-500/10 blur-2xl -z-10" />
            </div>
          </div>
        </div>
      </div>

      {/* Pricing (condensed) */}
      {includePricing && (
        <div className="px-6 md:px-8 py-10 border-b border-white/10 relative overflow-hidden !bg-gradient-to-br !from-indigo-950/35 !via-slate-900/45 !to-violet-950/25">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_rgba(99,102,241,0.1),_transparent_55%)]" />
          <div className="relative">
            <p className="text-xs font-semibold text-white uppercase tracking-widest mb-3">Pricing</p>
            <p className="text-sm text-muted-foreground">{pricingCopy}</p>
          </div>
        </div>
      )}

      {/* Footer placeholder */}
      <div className="px-6 md:px-8 py-10 border-t border-white/10 bg-slate-950/50">
        <p className="text-xs text-muted-foreground">
          Preview only. Use the editor to change headline, CTA, and pricing copy.
        </p>
      </div>
    </div>
  );
}
