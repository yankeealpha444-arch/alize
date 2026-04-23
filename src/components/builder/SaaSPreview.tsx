import React, { useState, useEffect, useMemo } from "react";
import { MessageCircle, X, Send, Star, ArrowRight, Check, Sparkles, Upload } from "lucide-react";
import { toast } from "sonner";
import { addEmailCapture, addFeedback, getMvpCustomizations, MvpCustomizations } from "@/lib/projectData";
import { generateCopy } from "@/lib/copyGenerator";
import { detectProductType } from "@/lib/productType";
import { getTemplateFamily, interpolateFamilyString } from "@/lib/templateFamilies";
import { hashAppUrl } from "@/lib/hashRoutes";
import {
  saasShellClass,
  saasNavClass,
  saasPrimaryButtonClass,
  saasSecondaryButtonClass,
  saasCardClass,
} from "@/lib/saasPreviewVisual";
import { useSaaSVisualWithHero } from "@/hooks/useSaaSVisualWithHero";
import FounderLoopPreview from "@/components/builder/FounderLoopPreview";
import MarketplaceMVP from "@/components/marketplace/MarketplaceMVP";
import GrowthToolMVP from "@/components/growth/GrowthToolMVP";
import { sanitizeIdeaForPersistence } from "@/lib/mvp/ideaContentSafety";

interface SaaSPreviewProps {
  projectName: string;
  activeSection: string;
  includePricing: boolean;
  /** Must match Builder / project scope or preview reads the wrong localStorage bucket. */
  projectId?: string;
}

function Section({
  children,
  className = "",
  id,
  dataSection,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
  /** Matches Preview Changes click → scroll + highlight */
  dataSection?: string;
}) {
  return (
    <div id={id} data-section={dataSection} className={`px-6 md:px-8 py-12 md:py-16 border-b border-white/10 bg-white/[0.03] ${className}`}>
      {children}
    </div>
  );
}

export default function SaaSPreview({ projectName, activeSection, includePricing, projectId = "default" }: SaaSPreviewProps) {
  const idea = sanitizeIdeaForPersistence(localStorage.getItem("alize_idea") || "") || projectName;
  const [chatOpen, setChatOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [signedUp, setSignedUp] = useState(false);
  const [onboarded, setOnboarded] = useState(false);
  const [showEmailCapture, setShowEmailCapture] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [feedbackComment, setFeedbackComment] = useState("");
  const [selectedOnboarding, setSelectedOnboarding] = useState<Record<number, string>>({});
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [planInterest, setPlanInterest] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<Array<{ role: "bot" | "user"; text: string }>>([
    { role: "bot", text: `Hi! Welcome to ${projectName}. How can I help you get started?` },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [toolUsed, setToolUsed] = useState(false);
  const [toolProcessing, setToolProcessing] = useState(false);
  const [toolProgress, setToolProgress] = useState(0);
  const [customizations, setCustomizations] = useState<MvpCustomizations>(() => getMvpCustomizations(projectId));

  const productType = detectProductType(idea);
  const family = useMemo(() => getTemplateFamily(productType), [productType]);

  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log("RENDERING TEMPLATE:", productType);
    }
  }, [productType]);
  const isToolFirst = productType === "tool" || productType === "ai-tool";
  const isMarketplace = productType === "marketplace";
  const isLanding = productType === "landing";

  useEffect(() => {
    setCustomizations(getMvpCustomizations(projectId));
  }, [projectId]);

  useEffect(() => {
    setSelectedOnboarding({});
  }, [productType, idea]);

  useEffect(() => {
    const handler = () => setCustomizations(getMvpCustomizations(projectId));
    window.addEventListener("alize-mvp-updated", handler);
    return () => window.removeEventListener("alize-mvp-updated", handler);
  }, [projectId]);

  const copy = generateCopy(idea, projectName);
  const headline = customizations.headline || copy.headline;
  const subtitle = customizations.subtitle || copy.subtitle;
  const ctaText = customizations.ctaText || copy.cta;
  const visual = useSaaSVisualWithHero(idea, headline, productType);
  const [heroImgBroken, setHeroImgBroken] = useState(false);
  const heroImageSrc = heroImgBroken ? visual.heroFallbackUrl : visual.heroPrimaryUrl;
  useEffect(() => {
    setHeroImgBroken(false);
  }, [visual.heroPrimaryUrl]);

  const botResponses = [
    "Great question! You can start by setting up your first project in the dashboard.",
    "I'd recommend checking the onboarding steps — they'll personalize your experience.",
    "You can always come back here if you need help. What else can I do for you?",
    "Sure! Head to the dashboard and click '+ New' to create your first item.",
  ];

  const handleChatSend = () => {
    if (!chatInput.trim()) return;
    const newMessages = [...chatMessages, { role: "user" as const, text: chatInput }];
    const response = botResponses[Math.floor(Math.random() * botResponses.length)];
    newMessages.push({ role: "bot", text: response });
    setChatMessages(newMessages);
    setChatInput("");
  };

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  const handleEmailSave = () => {
    if (!emailInput.trim() || !emailInput.includes("@")) {
      toast.error("Please enter a valid email");
      return;
    }
    addEmailCapture(emailInput.trim(), projectId);
    toast.success("Email saved!");
    setEmailInput("");
    setShowEmailCapture(false);
  };

  const handleFeedbackEmoji = (emoji: string) => {
    addFeedback({ emoji }, projectId);
    toast.success(`Feedback: ${emoji} recorded!`);
  };

  const handleFeedbackSubmit = () => {
    if (!feedbackComment.trim()) return;
    addFeedback({ comment: feedbackComment }, projectId);
    toast.success("Feedback submitted!");
    setFeedbackComment("");
  };

  const handleFeedbackModal = (rating: number) => {
    addFeedback({ rating }, projectId);
    toast.success(`Rated ${rating}/5!`);
  };

  const handleFeedbackModalSubmit = () => {
    addFeedback({ comment: feedbackComment, rating: undefined }, projectId);
    toast.success("Feedback submitted!");
    setFeedbackComment("");
    setFeedbackOpen(false);
  };

  const handlePlanSelect = (planName: string) => {
    setSelectedPlan(planName);
    setPlanInterest(null);
  };

  const handlePlanInterest = (planName: string, action: string) => {
    setPlanInterest(planName);
    addFeedback({ comment: `Pricing interest: ${planName} — ${action}` }, projectId);
    toast.success(`Interest in ${planName} plan registered!`);
  };

  if (productType === "marketplace") {
    return (
      <div className={`text-foreground relative ${saasShellClass} [&_.text-muted-foreground]:text-slate-400/90`}>
        <MarketplaceMVP projectId={projectId} idea={idea} headline={headline} subtitle={subtitle} embedded />
      </div>
    );
  }

  if (productType === "growth_tool") {
    return (
      <div className={`text-foreground relative ${saasShellClass} [&_.text-muted-foreground]:text-slate-400/90`}>
        <GrowthToolMVP projectId={projectId} idea={idea} headline={headline} subtitle={subtitle} embedded />
      </div>
    );
  }

  return (
    <div className={`text-foreground relative ${saasShellClass} [&_.text-muted-foreground]:text-slate-400/90`}>
      {/* Nav */}
      <div className={`flex items-center justify-between px-6 py-3.5 sticky top-0 z-10 ${saasNavClass}`}>
        <span className="text-sm font-semibold tracking-tight">{projectName}</span>
        <div className="flex items-center gap-4">
          <span onClick={() => scrollTo("how-it-works")} className="text-xs text-muted-foreground hover:text-foreground cursor-pointer transition-colors">How it works</span>
          {includePricing && <span onClick={() => scrollTo("pricing")} className="text-xs text-muted-foreground hover:text-foreground cursor-pointer transition-colors">Pricing</span>}
          <button onClick={() => scrollTo(isToolFirst ? "try-it" : "signup")} className={`text-xs px-4 py-1.5 rounded-lg font-medium ${saasPrimaryButtonClass}`}>
            {isToolFirst ? "Try it free" : isLanding ? "Get early access" : "Get Started"}
          </button>
        </div>
      </div>

      {/* 1. Hero */}
      <Section className="py-20 md:py-24 relative overflow-hidden !bg-transparent">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/50 via-slate-900/30 to-violet-950/40 pointer-events-none" />
        <div className="absolute top-10 right-10 w-80 h-80 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 left-10 w-56 h-56 rounded-full bg-violet-500/10 blur-3xl pointer-events-none" />
        <div className="max-w-6xl mx-auto relative z-[1]">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
            <div className="max-w-lg mx-auto lg:mx-0 text-center lg:text-left">
              <div
                data-section="hero-tone"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/15 bg-white/5 text-[10px] text-muted-foreground mb-5"
              >
                <Sparkles className="w-3 h-3" />
                {copy.tagline}
              </div>
              <h1 data-section="headline" className="text-3xl md:text-4xl lg:text-[2.75rem] font-bold tracking-tight mb-4 leading-tight capitalize text-white drop-shadow-sm">
                {headline}
              </h1>
              <p data-section="subtitle" className="text-sm text-muted-foreground mb-8 leading-relaxed max-w-md mx-auto lg:mx-0">
                {subtitle}
              </p>
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 mb-8">
                <button
                  type="button"
                  data-section="cta"
                  onClick={() => scrollTo(isToolFirst ? "try-it" : "signup")}
                  className={`px-7 py-3 rounded-xl text-sm font-semibold shadow-lg ${saasPrimaryButtonClass}`}
                >
                  {ctaText}
                </button>
                <button onClick={() => scrollTo("how-it-works")} className={`px-7 py-3 rounded-xl text-sm ${saasSecondaryButtonClass}`}>
                  {family.sectionLabels.secondaryCta}
                </button>
              </div>
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-5 text-[11px] text-muted-foreground">
                {copy.bullets.slice(0, 3).map(b => (
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
        {productType !== "growth_tool" && <FounderLoopPreview projectId={projectId} />}
      </Section>

      {/* Tool-first: Try it section */}
      {isToolFirst && (
        <Section id="try-it" className="!bg-slate-900/20">
          <div className="max-w-md mx-auto text-center">
            <h2 className="text-xl font-bold mb-2 text-white">
              {family.sectionLabels.tryItTitle || "Try it now — no signup needed"}
            </h2>
            <p className="text-xs text-muted-foreground mb-6">
              {family.sectionLabels.tryItSubtitle || "See the result instantly. Sign up to save your work."}
            </p>
            <div className={`p-6 ${saasCardClass}`}>
              {!toolProcessing && !toolUsed ? (
                <>
                  <div
                    className="border-2 border-dashed border-border rounded-lg p-8 mb-4 hover:border-foreground/20 transition-colors cursor-pointer"
                    onClick={() => {
                      setToolProcessing(true);
                      setToolProgress(0);
                      let p = 0;
                      const iv = setInterval(() => {
                        p += Math.random() * 25 + 10;
                        if (p >= 100) { p = 100; clearInterval(iv); setTimeout(() => { setToolProcessing(false); setToolUsed(true); }, 400); }
                        setToolProgress(Math.min(p, 100));
                      }, 500);
                    }}
                  >
                    <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">Click to upload or paste your input</p>
                    <p className="text-[10px] text-muted-foreground mt-1">Or click to see a demo result</p>
                  </div>
                  <button
                    onClick={() => {
                      setToolProcessing(true);
                      setToolProgress(0);
                      let p = 0;
                      const iv = setInterval(() => {
                        p += Math.random() * 25 + 10;
                        if (p >= 100) { p = 100; clearInterval(iv); setTimeout(() => { setToolProcessing(false); setToolUsed(true); }, 400); }
                        setToolProgress(Math.min(p, 100));
                      }, 500);
                    }}
                    className={`w-full py-3 rounded-xl text-sm font-semibold ${saasPrimaryButtonClass}`}
                  >
                    {productType === "ai-tool" ? "Generate with AI" : "Process now"}
                  </button>
                </>
              ) : toolProcessing ? (
                <div className="py-6">
                  <div className="w-10 h-10 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-sm font-medium mb-3">{productType === "ai-tool" ? "Generating..." : "Processing your file..."}</p>
                  <div className="w-full h-2 rounded-full bg-secondary overflow-hidden mb-2">
                    <div className="h-full rounded-full bg-foreground transition-all duration-300" style={{ width: `${toolProgress}%` }} />
                  </div>
                  <p className="text-[10px] text-muted-foreground">{Math.round(toolProgress)}% complete</p>
                </div>
              ) : (
                <>
                  <div className="rounded-lg bg-secondary/20 p-5 mb-4 text-left">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-2">Result</p>
                    <div className="space-y-2">
                      <div className="h-3 rounded bg-foreground/10 w-full" />
                      <div className="h-3 rounded bg-foreground/10 w-4/5" />
                      <div className="h-3 rounded bg-foreground/10 w-3/5" />
                    </div>
                    <p className="text-xs text-foreground mt-3 font-medium">✓ Processing complete — your result is ready</p>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">Enter your email to download the result</p>
                  <input
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="Email address"
                    className="w-full px-4 py-3 rounded-lg border border-border bg-secondary/30 text-sm mb-3 focus:outline-none focus:border-foreground/30 transition-colors"
                  />
                  <button
                    onClick={() => {
                      if (!emailInput.trim() || !emailInput.includes("@")) { toast.error("Please enter a valid email"); return; }
                      handleEmailSave();
                      toast.success("Result sent to your email!");
                    }}
                    className={`w-full py-3 rounded-xl text-sm font-semibold ${saasPrimaryButtonClass}`}
                  >
                    Download result
                  </button>
                </>
              )}
            </div>
          </div>
        </Section>
      )}

      {/* Marketplace: Browse section */}
      {isMarketplace && (
        <Section id="browse" className="!bg-slate-900/20">
          <h2 className="text-xl font-bold text-center mb-2 text-white">
            {family.sectionLabels.browseTitle || "Browse listings"}
          </h2>
          <p className="text-xs text-muted-foreground text-center mb-6">
            {family.sectionLabels.browseSubtitle || "Find exactly what you're looking for"}
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-lg mx-auto">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className={`overflow-hidden cursor-pointer ${saasCardClass}`} onClick={() => toast.info("Sign up to view full details")}>
                <div className="h-28 overflow-hidden">
                  <img src={visual.featureThumbUrl(i + 10)} alt="" className="h-full w-full object-cover transition-transform duration-300 hover:scale-105" />
                </div>
                <div className="p-3">
                  <div className="h-3 rounded bg-secondary/40 w-3/4 mb-2" />
                  <div className="h-2.5 rounded bg-secondary/30 w-1/2" />
                  <p className="text-xs font-semibold mt-2 text-foreground">$---</p>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-6">
            <button onClick={() => scrollTo("signup")} className={`px-6 py-2.5 rounded-xl text-sm font-semibold ${saasPrimaryButtonClass}`}>
              Sign up to see all listings
            </button>
          </div>
        </Section>
      )}

      {/* How it works */}
      <Section id="how-it-works">
        <h2 className="text-xl font-bold text-center mb-2 text-white">{family.sectionLabels.howItWorksTitle}</h2>
        <p className="text-xs text-muted-foreground text-center mb-8">
          {interpolateFamilyString(family.sectionLabels.howItWorksSubtitle, idea, projectName)}
        </p>
        <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto">
          {copy.howItWorks.map((s, idx) => (
            <div key={s.step} className={`text-center p-4 ${saasCardClass}`}>
              <div className="mb-3 mx-auto h-14 w-full max-w-[5.5rem] overflow-hidden rounded-lg ring-1 ring-white/10">
                <img src={visual.featureThumbUrl(idx)} alt="" className="h-full w-full object-cover" />
              </div>
              <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center mx-auto mb-3 text-xs font-bold text-white">{s.step}</div>
              <p className="text-sm font-semibold mb-1">{s.title}</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Testimonials */}
      {customizations.showTestimonials && (
        <Section dataSection="testimonials">
          <h2 className="text-xl font-bold text-center mb-6 text-white">What people are saying</h2>
          <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
            {[
              { name: "Sarah K.", text: "This changed how I work. Highly recommended!" },
              { name: "Mike T.", text: "Simple, effective, and saves me hours every week." },
            ].map((t, ti) => (
              <div key={t.name} className={`p-5 ${saasCardClass}`}>
                <p className="text-xs text-muted-foreground mb-3 leading-relaxed">"{t.text}"</p>
                <div className="flex items-center gap-2.5">
                  <img src={visual.avatarUrl(ti)} alt="" className="h-9 w-9 rounded-full object-cover ring-2 ring-white/10 shrink-0" />
                  <p className="text-[11px] font-semibold text-white">— {t.name}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* 2. Sign Up */}
      <Section id="signup">
        <div className="max-w-xs mx-auto">
          <h2 className="text-xl font-bold text-center mb-1">
            {isLanding ? "Get early access" : isToolFirst && toolUsed ? "Save your work" : "Create your account"}
          </h2>
          <p className="text-xs text-muted-foreground text-center mb-5">
            {isLanding ? `Be the first to know when ${projectName} launches` : `Start using ${projectName} in under a minute`}
          </p>
          <div className="space-y-2.5">
            {!isLanding && (
              <input
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="Your name"
                className="w-full px-4 py-3 rounded-lg border border-border bg-secondary/30 text-sm focus:outline-none focus:border-foreground/30 transition-colors"
              />
            )}
            <input
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="Email address"
              className="w-full px-4 py-3 rounded-lg border border-border bg-secondary/30 text-sm focus:outline-none focus:border-foreground/30 transition-colors"
            />
            {!isLanding && (
              <input
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="Password"
                type="password"
                className="w-full px-4 py-3 rounded-lg border border-border bg-secondary/30 text-sm focus:outline-none focus:border-foreground/30 transition-colors"
              />
            )}
          </div>
          <button
            onClick={() => {
              if (!emailInput.trim() || !emailInput.includes("@")) {
                toast.error("Please enter a valid email");
                return;
              }
              if (!isLanding && !nameInput.trim()) {
                toast.error("Please enter your name");
                return;
              }
              handleEmailSave();
              setSignedUp(true);
              toast.success(isLanding ? "You're on the list! We'll notify you at launch." : "Account created! Welcome aboard.");
            }}
            className="w-full bg-foreground text-background py-3 rounded-lg text-sm font-semibold mt-4 hover:opacity-90 transition-opacity"
          >
            {isLanding ? "Notify me" : "Create account"}
          </button>
          {/* Post-signup confirmation */}
          {signedUp && (
            <div className="mt-4 p-4 rounded-xl border border-border bg-secondary/20 text-center space-y-2">
              <p className="text-xs font-semibold text-foreground">✓ {isLanding ? "You're on the list!" : "Account created!"}</p>
              <p className="text-[10px] text-muted-foreground">What would you like to do next?</p>
              <div className="flex gap-2">
                <button onClick={() => scrollTo("how-it-works")} className="flex-1 text-[10px] py-2 rounded-lg border border-border hover:bg-secondary/50 transition-colors">
                  Explore product
                </button>
                <button onClick={() => setFeedbackOpen(true)} className="flex-1 text-[10px] py-2 rounded-lg bg-foreground text-background hover:opacity-90 transition-opacity">
                  Give feedback
                </button>
              </div>
            </div>
          )}
          {!isLanding && (
            <p className="text-[10px] text-muted-foreground text-center mt-3">Already have an account? <span className="underline cursor-pointer">Log in</span></p>
          )}
        </div>
      </Section>

      {/* 3. Onboarding — template family */}
      {family.onboarding.length > 0 && (
        <Section>
          <h2 className="text-xl font-bold mb-1">
            {interpolateFamilyString(family.sectionLabels.onboardingTitle, idea, projectName)}
          </h2>
          <p className="text-xs text-muted-foreground mb-5">
            {interpolateFamilyString(family.sectionLabels.onboardingSubtitle, idea, projectName)}
          </p>
          <div className="space-y-3 max-w-lg">
            {family.onboarding.map((item, i) => (
              <div key={i} className="p-4 rounded-xl border border-border bg-card">
                <p className="text-[10px] text-muted-foreground mb-2">
                  Step {i + 1} of {family.onboarding.length}
                </p>
                <p className="text-sm font-medium mb-3">{interpolateFamilyString(item.q, idea, projectName)}</p>
                <div className="flex flex-wrap gap-2">
                  {item.options.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => {
                        const next = { ...selectedOnboarding, [i]: opt };
                        setSelectedOnboarding(next);
                        if (Object.keys(next).length === family.onboarding.length) setOnboarded(true);
                      }}
                      className={`text-xs px-3 py-2 rounded-lg border transition-all ${
                        selectedOnboarding[i] === opt
                          ? "border-foreground bg-foreground/5 font-semibold"
                          : "border-border bg-secondary/30 hover:bg-secondary/60"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {Object.keys(selectedOnboarding).length === family.onboarding.length && (
            <button
              type="button"
              onClick={() => { setOnboarded(true); toast.success("Onboarding complete!"); }}
              className="mt-5 bg-foreground text-background px-6 py-2.5 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              Continue to dashboard →
            </button>
          )}
        </Section>
      )}

      {/* 4. Core Product — template family actions */}
      {family.productActions.length > 0 && (
        <Section>
          <h2 className="text-xl font-bold mb-1">
            {interpolateFamilyString(family.sectionLabels.coreProductTitle, idea, projectName)}
          </h2>
          <p className="text-xs text-muted-foreground mb-5">
            {interpolateFamilyString(family.sectionLabels.coreProductSubtitle, idea, projectName)}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {family.productActions.map((action) => (
              <button
                key={action}
                type="button"
                onClick={() => {
                  toast.success(`${action} — feature ready`);
                  if (!showEmailCapture) setShowEmailCapture(true);
                }}
                className="p-3 rounded-lg border border-border bg-card hover:bg-secondary/30 text-xs font-medium text-center transition-colors"
              >
                {action}
              </button>
            ))}
          </div>
        </Section>
      )}

      {/* 5. In-Product Feedback */}
      <Section>
        <div className="max-w-sm mx-auto">
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-bold">How's your experience?</p>
              <X className="h-3.5 w-3.5 text-muted-foreground cursor-pointer" />
            </div>
            <p className="text-xs text-muted-foreground mb-4">Your feedback helps us improve {projectName}</p>
            <div className="flex gap-2 mb-4">
              {["😞", "😐", "🙂", "😊", "🤩"].map((e) => (
                <button key={e} onClick={() => handleFeedbackEmoji(e)} className="text-xl p-2.5 rounded-xl border border-border hover:bg-secondary/50 flex-1 transition-colors">{e}</button>
              ))}
            </div>
            <textarea
              value={feedbackComment}
              onChange={(e) => setFeedbackComment(e.target.value)}
              placeholder="Tell us what you think..."
              className="w-full px-4 py-3 rounded-lg border border-border bg-secondary/30 text-sm resize-none focus:outline-none focus:border-foreground/30 transition-colors"
              rows={2}
            />
            <button onClick={handleFeedbackSubmit} className="w-full mt-3 bg-foreground text-background py-2.5 rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity">Send feedback</button>
          </div>
        </div>
      </Section>

      {/* 6. Email Capture */}
      {showEmailCapture && (
        <Section>
          <div className="max-w-sm mx-auto p-6 rounded-xl border border-border bg-card shadow-sm">
            <h3 className="text-sm font-bold mb-1">Save your progress</h3>
            <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
              Enter your email to save your work, get product updates, and continue where you left off.
            </p>
            <div className="flex gap-2">
              <input
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleEmailSave()}
                placeholder="your@email.com"
                className="flex-1 px-4 py-3 rounded-lg border border-border bg-secondary/30 text-sm focus:outline-none focus:border-foreground/30 transition-colors"
              />
              <button onClick={handleEmailSave} className="bg-foreground text-background px-5 py-3 rounded-lg text-sm font-semibold shrink-0 hover:opacity-90 transition-opacity">Save</button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">No spam. Only product updates and early access.</p>
          </div>
        </Section>
      )}

      {/* 7. Pricing — Interest Capture (type-aware) */}
      {includePricing && (
        <Section id="pricing" dataSection="pricing" className="relative overflow-hidden !bg-gradient-to-br !from-indigo-950/40 !via-slate-900/50 !to-violet-950/30">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_rgba(99,102,241,0.12),_transparent_55%)]" />
          <div className="relative">
          <h2 className="text-xl font-bold text-center mb-1 text-white">
            {isToolFirst
              ? family.sectionLabels.pricingTitleTool
              : isMarketplace
                ? family.sectionLabels.pricingTitleMarketplace
                : family.sectionLabels.pricingTitleDefault}
          </h2>
          <p className="text-xs text-muted-foreground text-center mb-8">
            {customizations.pricingCopy || (isToolFirst ? "Try free. Pay only when you need more." : "Start free. Upgrade when you're ready.")}
          </p>
          <div className={`grid gap-4 max-w-lg mx-auto ${copy.pricingPlans.length === 1 ? "max-w-xs" : "grid-cols-2"}`}>
            {copy.pricingPlans.map((plan) => (
              <div
                key={plan.name}
                onClick={() => handlePlanSelect(plan.name)}
                className={`p-6 rounded-2xl border-2 text-center cursor-pointer transition-all ${saasCardClass} ${
                  selectedPlan === plan.name
                    ? "!border-indigo-400/50 shadow-indigo-500/10"
                    : "border-white/10 hover:border-white/25"
                }`}
              >
                <p className="text-sm font-bold">{plan.name}</p>
                <p className="text-3xl font-bold my-3">{plan.price}</p>
                <p className="text-[11px] text-muted-foreground mb-4">{plan.desc}</p>
                <div className="space-y-2 mb-5">
                  {plan.features.map((f) => (
                    <p key={f} className="text-[11px] text-muted-foreground flex items-center gap-1.5 justify-center">
                      <Check className="w-3 h-3 text-foreground/50" />
                      {f}
                    </p>
                  ))}
                </div>
                {selectedPlan === plan.name && planInterest !== plan.name ? (
                  <button
                    onClick={(e) => { e.stopPropagation(); handlePlanInterest(plan.name, plan.cta); }}
                    className={`w-full py-2.5 text-xs rounded-xl font-semibold ${saasPrimaryButtonClass}`}
                  >
                    {plan.cta}
                  </button>
                ) : planInterest === plan.name ? (
                  <div className="py-2.5 text-xs rounded-lg bg-secondary text-foreground font-semibold flex items-center justify-center gap-1.5">
                    <Check className="w-3.5 h-3.5" />
                    Interest registered
                  </div>
                ) : (
                  <button className="w-full py-2.5 text-xs rounded-lg border border-border hover:bg-secondary/50 font-medium transition-colors">
                    {plan.cta}
                  </button>
                )}
              </div>
            ))}
          </div>
          </div>
        </Section>
      )}

      {/* 8. End */}
      <Section className="py-14">
        <div className="text-center max-w-sm mx-auto">
          <p className="text-3xl mb-4">🎉</p>
          <h2 className="text-xl font-bold mb-2">You've seen the full product</h2>
          <p className="text-sm text-muted-foreground mb-6">Thanks for trying {projectName}. We improve every week based on your feedback.</p>
          <div className="flex items-center justify-center gap-3">
            <button onClick={() => setFeedbackOpen(true)} className={`px-6 py-2.5 rounded-xl text-sm font-semibold ${saasPrimaryButtonClass}`}>Give feedback</button>
            <button onClick={() => scrollTo("how-it-works")} className={`px-6 py-2.5 rounded-xl text-sm ${saasSecondaryButtonClass}`}>Go to product dashboard</button>
          </div>
        </div>
      </Section>

      {/* Built with Alizé footer */}
      <div className="px-6 py-5 text-center border-t border-white/10 bg-slate-950/60">
        <p className="text-[10px] text-muted-foreground">
          Built with <span className="font-semibold text-foreground">Alizé</span> · Build your own MVP and know exactly what to do next
        </p>
        <button
          type="button"
          onClick={() => { window.location.href = hashAppUrl("/"); }}
          className="text-[10px] text-muted-foreground underline hover:text-foreground mt-1 transition-colors"
        >
          Build with Alizé →
        </button>
      </div>

      {/* Floating Chatbot Widget */}
      {chatOpen && (
        <div className="fixed bottom-20 right-8 w-80 bg-card border border-border rounded-xl shadow-2xl flex flex-col z-50" style={{ height: "380px" }}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-foreground" />
              <span className="text-sm font-semibold">{projectName} Support</span>
            </div>
            <button onClick={() => setChatOpen(false)}>
              <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {chatMessages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-lg px-3 py-2 text-xs ${
                  msg.role === "user"
                    ? "bg-foreground text-background"
                    : "bg-secondary text-secondary-foreground"
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
          </div>
          <div className="p-3 border-t border-border flex gap-2">
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleChatSend()}
              placeholder="Ask a question..."
              className="flex-1 bg-secondary rounded-md px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-foreground/20"
            />
            <button onClick={handleChatSend} className="p-2 rounded-md bg-foreground text-background hover:bg-foreground/90">
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Floating chat button */}
      <div className="sticky bottom-4 flex justify-end px-4">
        <button
          onClick={() => setChatOpen(!chatOpen)}
          className="bg-foreground text-background rounded-full p-3 shadow-lg cursor-pointer hover:opacity-90 transition-opacity"
        >
          <MessageCircle className="h-5 w-5" />
        </button>
      </div>

      {/* Floating feedback modal */}
      {feedbackOpen && (
        <div className="fixed inset-0 bg-background/60 flex items-center justify-center z-50" onClick={() => setFeedbackOpen(false)}>
          <div className="bg-card border border-border rounded-xl p-6 w-80 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-bold">Quick feedback</p>
              <button onClick={() => setFeedbackOpen(false)}>
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground mb-3">How was your experience so far?</p>
            <div className="flex gap-1.5 mb-3">
              {[1, 2, 3, 4, 5].map((s) => (
                <button key={s} onClick={() => handleFeedbackModal(s)} className="flex-1 p-2.5 rounded-lg border border-border hover:bg-secondary/50 transition-colors">
                  <Star className="h-4 w-4 mx-auto text-muted-foreground" />
                </button>
              ))}
            </div>
            <textarea
              value={feedbackComment}
              onChange={(e) => setFeedbackComment(e.target.value)}
              placeholder="Any comments?"
              className="w-full px-3 py-2 rounded-lg border border-border bg-secondary/30 text-sm resize-none focus:outline-none focus:border-foreground/30 transition-colors"
              rows={2}
            />
            <button onClick={handleFeedbackModalSubmit} className="w-full mt-3 bg-foreground text-background py-2.5 rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity">Submit</button>
          </div>
        </div>
      )}
    </div>
  );
}
