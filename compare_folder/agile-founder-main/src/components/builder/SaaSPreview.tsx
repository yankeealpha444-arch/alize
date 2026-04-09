import React, { useState, useEffect } from "react";
import { MessageCircle, X, Send, Star, ArrowRight, Check, Sparkles, Upload } from "lucide-react";
import { toast } from "sonner";
import { addEmailCapture, addFeedback, getMvpCustomizations, MvpCustomizations } from "@/lib/projectData";
import { generateCopy } from "@/lib/copyGenerator";
import { detectProductType, getProductTypeInfo } from "@/lib/productType";

interface SaaSPreviewProps {
  projectName: string;
  activeSection: string;
  includePricing: boolean;
}

function Section({ children, className = "", id }: { children: React.ReactNode; className?: string; id?: string }) {
  return <div id={id} className={`px-6 py-10 border-b border-border ${className}`}>{children}</div>;
}

export default function SaaSPreview({ projectName, activeSection, includePricing }: SaaSPreviewProps) {
  const idea = localStorage.getItem("alize_idea") || projectName;
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
  const [customizations, setCustomizations] = useState<MvpCustomizations>(getMvpCustomizations());

  const productType = detectProductType(idea);
  const isToolFirst = productType === "tool" || productType === "ai-tool";
  const isMarketplace = productType === "marketplace";
  const isLanding = productType === "landing";

  useEffect(() => {
    const handler = () => setCustomizations(getMvpCustomizations());
    window.addEventListener("alize-mvp-updated", handler);
    return () => window.removeEventListener("alize-mvp-updated", handler);
  }, []);

  const copy = generateCopy(idea, projectName);
  const headline = customizations.headline || copy.headline;
  const subtitle = customizations.subtitle || copy.subtitle;
  const ctaText = customizations.ctaText || copy.cta;

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
    addEmailCapture(emailInput.trim());
    toast.success("Email saved!");
    setEmailInput("");
    setShowEmailCapture(false);
  };

  const handleFeedbackEmoji = (emoji: string) => {
    addFeedback({ emoji });
    toast.success(`Feedback: ${emoji} recorded!`);
  };

  const handleFeedbackSubmit = () => {
    if (!feedbackComment.trim()) return;
    addFeedback({ comment: feedbackComment });
    toast.success("Feedback submitted!");
    setFeedbackComment("");
  };

  const handleFeedbackModal = (rating: number) => {
    addFeedback({ rating });
    toast.success(`Rated ${rating}/5!`);
  };

  const handleFeedbackModalSubmit = () => {
    addFeedback({ comment: feedbackComment, rating: undefined });
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
    addFeedback({ comment: `Pricing interest: ${planName} — ${action}` });
    toast.success(`Interest in ${planName} plan registered!`);
  };

  return (
    <div className="text-foreground relative">
      {/* Nav */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <span className="text-sm font-semibold tracking-tight">{projectName}</span>
        <div className="flex items-center gap-4">
          <span onClick={() => scrollTo("how-it-works")} className="text-xs text-muted-foreground hover:text-foreground cursor-pointer transition-colors">How it works</span>
          {includePricing && <span onClick={() => scrollTo("pricing")} className="text-xs text-muted-foreground hover:text-foreground cursor-pointer transition-colors">Pricing</span>}
          <button onClick={() => scrollTo(isToolFirst ? "try-it" : "signup")} className="text-xs bg-foreground text-background px-4 py-1.5 rounded-md font-medium hover:opacity-90 transition-opacity">
            {isToolFirst ? "Try it free" : isLanding ? "Get early access" : "Get Started"}
          </button>
        </div>
      </div>

      {/* 1. Hero */}
      <Section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-secondary/40 via-transparent to-primary/5 pointer-events-none" />
        <div className="absolute top-10 right-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 left-10 w-48 h-48 bg-foreground/3 rounded-full blur-2xl pointer-events-none" />
        <div className="max-w-lg mx-auto text-center relative">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-border bg-secondary/40 text-[10px] text-muted-foreground mb-5">
            <Sparkles className="w-3 h-3" />
            {copy.tagline}
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 leading-tight capitalize">{headline}</h1>
          <p className="text-sm text-muted-foreground mb-8 leading-relaxed max-w-md mx-auto">{subtitle}</p>
          <div className="flex items-center justify-center gap-3 mb-8">
            <button onClick={() => scrollTo(isToolFirst ? "try-it" : "signup")} className="bg-foreground text-background px-7 py-3 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity shadow-lg">
              {ctaText}
            </button>
            <button onClick={() => scrollTo("how-it-works")} className="border border-border px-7 py-3 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors">
              See how it works
            </button>
          </div>
          <div className="flex items-center justify-center gap-5 text-[11px] text-muted-foreground">
            {copy.bullets.slice(0, 3).map(b => (
              <span key={b} className="flex items-center gap-1.5">
                <Check className="w-3 h-3 text-foreground/50" />
                {b}
              </span>
            ))}
          </div>
        </div>
        {/* Product mockup — polished browser window */}
        <div className="mt-12 max-w-lg mx-auto perspective-1000">
          <div className="rounded-xl border border-border bg-card shadow-2xl overflow-hidden transform hover:scale-[1.01] transition-transform duration-500">
            <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-border bg-secondary/30">
              <div className="w-2.5 h-2.5 rounded-full bg-destructive/40" />
              <div className="w-2.5 h-2.5 rounded-full bg-[hsl(var(--warning))]/40" />
              <div className="w-2.5 h-2.5 rounded-full bg-[hsl(var(--success))]/40" />
              <div className="ml-3 flex-1 h-5 rounded bg-secondary/50 flex items-center px-2">
                <span className="text-[8px] text-muted-foreground">{projectName.toLowerCase().replace(/\s+/g, '')}.com</span>
              </div>
            </div>
            <div className="p-5 space-y-4">
              {/* Simulated app UI */}
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <div className="h-3 rounded bg-foreground/15 w-24 mb-1" />
                  <div className="h-2 rounded bg-foreground/8 w-16" />
                </div>
                <div className="ml-auto flex gap-1.5">
                  <div className="h-6 w-14 rounded bg-secondary/60 flex items-center justify-center">
                    <span className="text-[7px] text-muted-foreground">Dashboard</span>
                  </div>
                  <div className="h-6 w-14 rounded bg-foreground/10 flex items-center justify-center">
                    <span className="text-[7px] text-foreground">+ New</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {["Active", "Pending", "Complete"].map(label => (
                  <div key={label} className="rounded-lg bg-secondary/30 p-3 text-center">
                    <p className="text-lg font-bold text-foreground">{Math.floor(Math.random() * 50 + 10)}</p>
                    <p className="text-[8px] text-muted-foreground mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                {[85, 60, 40].map((w, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-secondary/40" />
                    <div className="flex-1">
                      <div className="h-2.5 rounded bg-foreground/8 mb-1" style={{ width: `${w}%` }} />
                      <div className="h-2 rounded bg-foreground/5 w-1/3" />
                    </div>
                    <div className="h-5 w-12 rounded bg-secondary/40" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* Tool-first: Try it section */}
      {isToolFirst && (
        <Section id="try-it" className="bg-secondary/5">
          <div className="max-w-md mx-auto text-center">
            <h2 className="text-xl font-bold mb-2">Try it now — no signup needed</h2>
            <p className="text-xs text-muted-foreground mb-6">See the result instantly. Sign up to save your work.</p>
            <div className="rounded-xl border border-border bg-card p-6">
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
                    className="w-full bg-foreground text-background py-3 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
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
                    className="w-full bg-foreground text-background py-3 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
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
        <Section id="browse" className="bg-secondary/5">
          <h2 className="text-xl font-bold text-center mb-2">Browse listings</h2>
          <p className="text-xs text-muted-foreground text-center mb-6">Find exactly what you're looking for</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-lg mx-auto">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="rounded-xl border border-border bg-card overflow-hidden cursor-pointer hover:border-foreground/20 transition-colors" onClick={() => toast.info("Sign up to view full details")}>
                <div className="h-28 bg-secondary/30" />
                <div className="p-3">
                  <div className="h-3 rounded bg-secondary/40 w-3/4 mb-2" />
                  <div className="h-2.5 rounded bg-secondary/30 w-1/2" />
                  <p className="text-xs font-semibold mt-2 text-foreground">$---</p>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-6">
            <button onClick={() => scrollTo("signup")} className="bg-foreground text-background px-6 py-2.5 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity">
              Sign up to see all listings
            </button>
          </div>
        </Section>
      )}

      {/* How it works */}
      <Section id="how-it-works">
        <h2 className="text-xl font-bold text-center mb-2">How it works</h2>
        <p className="text-xs text-muted-foreground text-center mb-8">Get started in {copy.howItWorks.length} simple steps</p>
        <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto">
          {copy.howItWorks.map(s => (
            <div key={s.step} className="text-center p-4 rounded-xl border border-border bg-card">
              <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center mx-auto mb-3 text-xs font-bold text-foreground">{s.step}</div>
              <p className="text-sm font-semibold mb-1">{s.title}</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Testimonials */}
      {customizations.showTestimonials && (
        <Section>
          <h2 className="text-xl font-bold text-center mb-6">What people are saying</h2>
          <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
            {[
              { name: "Sarah K.", text: "This changed how I work. Highly recommended!" },
              { name: "Mike T.", text: "Simple, effective, and saves me hours every week." },
            ].map((t) => (
              <div key={t.name} className="p-5 rounded-xl border border-border bg-card">
                <p className="text-xs text-muted-foreground mb-3 leading-relaxed">"{t.text}"</p>
                <p className="text-[11px] font-semibold text-foreground">— {t.name}</p>
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

      {/* 3. Onboarding — SaaS only */}
      {productType === "saas" && (
        <Section>
          <h2 className="text-xl font-bold mb-1">Personalize your experience</h2>
          <p className="text-xs text-muted-foreground mb-5">Quick setup so we can tailor things for you</p>
          <div className="space-y-3 max-w-lg">
            {[
              { q: `What do you want to achieve with ${projectName}?`, options: ["Track progress", "Save time", "Grow revenue", "Stay organized"] },
              { q: "How are you currently solving this?", options: ["Spreadsheets", "Another tool", "Manual process", "Not solving it yet"] },
              { q: "What describes you best?", options: ["Individual", "Small team", "Company", "Just exploring"] },
            ].map((item, i) => (
              <div key={i} className="p-4 rounded-xl border border-border bg-card">
                <p className="text-[10px] text-muted-foreground mb-2">Step {i + 1} of 3</p>
                <p className="text-sm font-medium mb-3">{item.q}</p>
                <div className="flex flex-wrap gap-2">
                  {item.options.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => {
                        setSelectedOnboarding({ ...selectedOnboarding, [i]: opt });
                        if (Object.keys(selectedOnboarding).length >= 2) setOnboarded(true);
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
          {Object.keys(selectedOnboarding).length === 3 && (
            <button
              onClick={() => { setOnboarded(true); toast.success("Onboarding complete!"); }}
              className="mt-5 bg-foreground text-background px-6 py-2.5 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              Continue to dashboard →
            </button>
          )}
        </Section>
      )}

      {/* 4. Core Product — SaaS only */}
      {productType === "saas" && (
        <Section>
          <h2 className="text-xl font-bold mb-1">Your {idea.toLowerCase()} at a glance</h2>
          <p className="text-xs text-muted-foreground mb-5">Here's what you can do with {projectName}</p>
          <div className="grid grid-cols-3 gap-2">
            {["Create item", "View reports", "Invite team"].map((action) => (
              <button
                key={action}
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
        <Section id="pricing">
          <h2 className="text-xl font-bold text-center mb-1">
            {isToolFirst ? "Pricing" : isMarketplace ? "How it works" : "Choose your plan"}
          </h2>
          <p className="text-xs text-muted-foreground text-center mb-8">
            {customizations.pricingCopy || (isToolFirst ? "Try free. Pay only when you need more." : "Start free. Upgrade when you're ready.")}
          </p>
          <div className={`grid gap-4 max-w-lg mx-auto ${copy.pricingPlans.length === 1 ? "max-w-xs" : "grid-cols-2"}`}>
            {copy.pricingPlans.map((plan) => (
              <div
                key={plan.name}
                onClick={() => handlePlanSelect(plan.name)}
                className={`p-6 rounded-xl border-2 text-center cursor-pointer transition-all ${
                  selectedPlan === plan.name
                    ? "border-foreground bg-foreground/[0.03] shadow-lg"
                    : "border-border hover:border-foreground/20"
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
                    className="w-full py-2.5 text-xs rounded-lg bg-foreground text-background font-semibold hover:opacity-90 transition-opacity"
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
        </Section>
      )}

      {/* 8. End */}
      <Section className="py-14">
        <div className="text-center max-w-sm mx-auto">
          <p className="text-3xl mb-4">🎉</p>
          <h2 className="text-xl font-bold mb-2">You've seen the full product</h2>
          <p className="text-sm text-muted-foreground mb-6">Thanks for trying {projectName}. We improve every week based on your feedback.</p>
          <div className="flex items-center justify-center gap-3">
            <button onClick={() => setFeedbackOpen(true)} className="bg-foreground text-background px-6 py-2.5 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity">Give feedback</button>
            <button onClick={() => scrollTo("how-it-works")} className="border border-border px-6 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground transition-colors">Go to product dashboard</button>
          </div>
        </div>
      </Section>

      {/* Built with Alizé footer */}
      <div className="px-6 py-5 text-center border-t border-border bg-secondary/10">
        <p className="text-[10px] text-muted-foreground">
          Built with <span className="font-semibold text-foreground">Alizé</span> · Build your own MVP and know exactly what to do next
        </p>
        <button onClick={() => window.location.href = "/"} className="text-[10px] text-muted-foreground underline hover:text-foreground mt-1 transition-colors">
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
