import React, { useState, useEffect } from "react";
import { MessageCircle, X, Send, Star, ArrowRight, Check, Sparkles, Upload, Shield, Lock, Zap, ChevronRight, Share2, Globe, BarChart3, Layers } from "lucide-react";
import { toast } from "sonner";
import { addEmailCapture, addFeedback, addSurveyResponse } from "@/lib/projectData";
import { generateCopy } from "@/lib/copyGenerator";
import { detectProductType, getProductTypeInfo, ProductType } from "@/lib/productType";
import { trackEvent } from "@/lib/trackingEvents";

function Section({ children, className = "", id }: { children: React.ReactNode; className?: string; id?: string }) {
  return <div id={id} className={`px-6 py-16 ${className}`}>{children}</div>;
}

// Feature icons per product type
const featureIcons = [Zap, Globe, BarChart3, Layers, Shield, Lock];

export default function PublicMVP() {
  const idea = localStorage.getItem("alize_idea") || "My Product";
  const projectId = localStorage.getItem("alize_projectId") || "default";
  const projectName = idea.split(" ").slice(0, 4).join(" ");
  const includePricing = localStorage.getItem("alize_includePricing") === "true";
  const productType = detectProductType(idea);
  const typeInfo = getProductTypeInfo(productType);
  const copy = generateCopy(idea, projectName);

  // Track page view on mount
  useEffect(() => {
    trackEvent("page_view", projectId, "public_mvp");
  }, [projectId]);

  // Flow state
  const [step, setStep] = useState<"landing" | "use" | "signup" | "feedback" | "done">("landing");
  const [chatOpen, setChatOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [feedbackComment, setFeedbackComment] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [planInterest, setPlanInterest] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<Array<{ role: "bot" | "user"; text: string }>>([
    { role: "bot", text: `Hi! Welcome to ${projectName}. How can I help you?` },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [toolUsed, setToolUsed] = useState(false);

  // Survey state
  const surveyQuestions = [
    "What are you trying to do?",
    "How do you currently solve this problem?",
    "How often do you have this problem?",
    "Would you pay for a solution like this?",
    "How much would you pay?",
    "What is the most important feature?",
    "Any other feedback?",
  ];
  const [surveyStep, setSurveyStep] = useState(0);
  const [surveyAnswers, setSurveyAnswers] = useState<Record<number, string>>({});
  const [surveyDone, setSurveyDone] = useState(false);
  const [currentSurveyInput, setCurrentSurveyInput] = useState("");

  const isToolFirst = productType === "tool" || productType === "ai-tool";
  const isMarketplace = productType === "marketplace";
  const isLanding = productType === "landing";

  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  const handleEmailSave = () => {
    if (!emailInput.trim() || !emailInput.includes("@")) {
      toast.error("Please enter a valid email");
      return;
    }
    addEmailCapture(emailInput.trim(), projectId);
    trackEvent("email_entered", projectId, emailInput.trim());
    toast.success("Email saved!");
    setEmailInput("");
  };

  const handleChatSend = () => {
    if (!chatInput.trim()) return;
    trackEvent("chat_message", projectId, chatInput);
    const botResponses = [
      "Great question! Let me help you with that.",
      "You can find that in the dashboard once you're set up.",
      "Sure! I'd recommend starting with the quick setup.",
    ];
    setChatMessages([...chatMessages, { role: "user", text: chatInput }, { role: "bot", text: botResponses[Math.floor(Math.random() * botResponses.length)] }]);
    setChatInput("");
  };

  const handlePlanInterest = (planName: string, action: string) => {
    setPlanInterest(planName);
    addFeedback({ comment: `Pricing interest: ${planName} — ${action}` }, projectId);
    trackEvent("pricing_viewed", projectId, planName);
    toast.success(`Interest in ${planName} plan registered!`);
  };

  const handleSurveyNext = () => {
    if (!currentSurveyInput.trim()) return;
    const newAnswers = { ...surveyAnswers, [surveyStep]: currentSurveyInput };
    setSurveyAnswers(newAnswers);
    setCurrentSurveyInput("");
    if (surveyStep < surveyQuestions.length - 1) {
      setSurveyStep(surveyStep + 1);
    } else {
      addSurveyResponse(newAnswers, projectId);
      trackEvent("survey_completed", projectId);
      setSurveyDone(true);
      toast.success("Survey complete! Thank you for your time.");
    }
  };

  return (
    <div className="text-foreground min-h-screen bg-background">
      {/* User Mode indicator */}
      <div className="bg-secondary/50 border-b border-border px-6 py-1.5 flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground">You are in <span className="font-bold text-foreground">User Mode</span> — this is what your users see</span>
        <button
          onClick={() => window.open(`/builder/${projectId}`, "_self")}
          className="text-[10px] font-semibold text-primary hover:underline flex items-center gap-1"
        >
          ✏️ Edit with Alizé
        </button>
      </div>

      {/* Nav */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="text-sm font-bold tracking-tight hover:opacity-80 transition-opacity">{projectName}</button>
        <div className="flex items-center gap-5">
          <span onClick={() => scrollTo("how-it-works")} className="text-xs text-muted-foreground hover:text-foreground cursor-pointer transition-colors">How it works</span>
          <span onClick={() => scrollTo("features")} className="text-xs text-muted-foreground hover:text-foreground cursor-pointer transition-colors">Features</span>
          {includePricing && <span onClick={() => scrollTo("pricing")} className="text-xs text-muted-foreground hover:text-foreground cursor-pointer transition-colors">Pricing</span>}
          <span onClick={() => scrollTo("survey")} className="text-xs text-muted-foreground hover:text-foreground cursor-pointer transition-colors">Survey</span>
          <button onClick={() => scrollTo(isToolFirst ? "try-it" : "signup")} className="text-xs bg-foreground text-background px-4 py-1.5 rounded-md font-medium hover:opacity-90 transition-opacity">
            {isToolFirst ? "See demo" : isLanding ? "Get early access" : "Get Started"}
          </button>
        </div>
      </div>

      {/* ═══════════════ HERO ═══════════════ */}
      <Section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-gradient-to-b from-secondary/40 via-transparent to-transparent blur-3xl" />
        </div>
        <div className="max-w-2xl mx-auto text-center relative">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-border bg-secondary/40 text-[10px] text-muted-foreground mb-6">
            <Sparkles className="w-3 h-3" />
            {copy.tagline}
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-5 leading-[1.1] capitalize">{copy.headline}</h1>
          <p className="text-base text-muted-foreground mb-10 leading-relaxed max-w-lg mx-auto">{copy.subtitle}</p>
          <div className="flex items-center justify-center gap-4 mb-10">
            <button
              onClick={() => { trackEvent("button_click", projectId, "hero_cta"); scrollTo(isToolFirst ? "try-it" : "signup"); }}
              className="bg-foreground text-background px-8 py-3.5 rounded-lg text-sm font-bold hover:opacity-90 transition-opacity shadow-lg shadow-foreground/10"
            >
              {copy.cta}
            </button>
            <button onClick={() => scrollTo("how-it-works")} className="border border-border px-8 py-3.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors">
              See how it works
            </button>
          </div>
          <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground">
            {copy.bullets.slice(0, 3).map(b => (
              <span key={b} className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-[hsl(var(--success))]" />
                {b}
              </span>
            ))}
          </div>
        </div>

        {/* Product mockup / hero image */}
        <div className="mt-16 max-w-xl mx-auto">
          <div className="rounded-2xl border border-border bg-card shadow-2xl shadow-background/50 overflow-hidden">
            <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-border bg-secondary/20">
              <div className="w-2.5 h-2.5 rounded-full bg-destructive/60" />
              <div className="w-2.5 h-2.5 rounded-full bg-[hsl(var(--warning))]/60" />
              <div className="w-2.5 h-2.5 rounded-full bg-[hsl(var(--success))]/60" />
              <div className="ml-3 flex-1 h-5 rounded bg-secondary/40 max-w-[200px]" />
            </div>
            <div className="p-6 space-y-4">
              <div className="flex gap-3">
                <div className="w-1/3 h-24 rounded-lg bg-gradient-to-br from-secondary/60 to-secondary/20" />
                <div className="w-1/3 h-24 rounded-lg bg-gradient-to-br from-secondary/50 to-secondary/10" />
                <div className="w-1/3 h-24 rounded-lg bg-gradient-to-br from-secondary/40 to-secondary/5" />
              </div>
              <div className="h-3 rounded bg-secondary/30 w-3/4" />
              <div className="h-3 rounded bg-secondary/20 w-1/2" />
              <div className="flex gap-3 mt-2">
                <div className="h-10 rounded-lg bg-foreground/10 flex-1" />
                <div className="h-10 rounded-lg bg-secondary/20 w-24" />
              </div>
              <div className="h-28 rounded-lg bg-gradient-to-b from-secondary/15 to-secondary/5" />
            </div>
          </div>
        </div>
      </Section>

      {/* ═══════════════ TOOL TRY-IT SECTION ═══════════════ */}
      {isToolFirst && (
        <Section id="try-it" className="border-t border-border">
          <div className="max-w-lg mx-auto text-center">
            <h2 className="text-2xl font-bold mb-2">See how it works</h2>
            <p className="text-sm text-muted-foreground mb-8">This product is in early development. See a demo result and join early access.</p>
            <div className="rounded-2xl border border-border bg-card p-8">
              {!toolUsed ? (
                <>
                  {/* Before / After demo */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="rounded-xl border border-border bg-secondary/20 p-5 text-left">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-3">Before</p>
                      <div className="space-y-2">
                        <div className="h-3 rounded bg-destructive/20 w-full" />
                        <div className="h-3 rounded bg-destructive/15 w-4/5" />
                        <div className="h-3 rounded bg-destructive/10 w-3/5" />
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-3">Raw, unprocessed input</p>
                    </div>
                    <div className="rounded-xl border border-foreground/20 bg-foreground/[0.03] p-5 text-left">
                      <p className="text-[10px] font-bold text-foreground uppercase tracking-wide mb-3">After</p>
                      <div className="space-y-2">
                        <div className="h-3 rounded bg-[hsl(var(--success))]/30 w-full" />
                        <div className="h-3 rounded bg-[hsl(var(--success))]/20 w-4/5" />
                        <div className="h-3 rounded bg-[hsl(var(--success))]/15 w-3/5" />
                      </div>
                      <p className="text-[10px] text-foreground font-medium mt-3">Clean, ready-to-use result</p>
                    </div>
                  </div>
                  <button
                    onClick={() => { setToolUsed(true); trackEvent("demo_viewed", projectId); }}
                    className="w-full bg-foreground text-background py-3.5 rounded-lg text-sm font-bold hover:opacity-90 transition-opacity mb-3"
                  >
                    {productType === "ai-tool" ? "See AI demo result" : "See sample result"}
                  </button>
                  <p className="text-[10px] text-muted-foreground">No signup required · See a real example</p>
                </>
              ) : (
                <>
                  <div className="rounded-xl bg-secondary/20 p-6 mb-5 text-left">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-3 font-semibold">✓ Sample result</p>
                    <div className="space-y-2.5">
                      <div className="h-3.5 rounded bg-[hsl(var(--success))]/20 w-full" />
                      <div className="h-3.5 rounded bg-[hsl(var(--success))]/15 w-4/5" />
                      <div className="h-3.5 rounded bg-[hsl(var(--success))]/10 w-3/5" />
                    </div>
                    <p className="text-xs text-foreground mt-4 font-medium">✓ This is a preview of what the full tool produces</p>
                    <p className="text-[10px] text-muted-foreground mt-1">The full product is under development. Join early access to be first in line.</p>
                  </div>
                  <p className="text-sm font-bold mb-2">Want this when it launches?</p>
                  <p className="text-xs text-muted-foreground mb-4">Enter your email and we'll notify you when it's ready.</p>
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
                      toast.success("You're on the early access list!");
                    }}
                    className="w-full bg-foreground text-background py-3.5 rounded-lg text-sm font-bold hover:opacity-90 transition-opacity"
                  >
                    Get early access
                  </button>
                  <div className="mt-4 flex gap-2">
                    <button onClick={() => scrollTo("survey")} className="flex-1 text-[10px] py-2.5 rounded-lg border border-border hover:bg-secondary/50 transition-colors">Take survey</button>
                    <button onClick={() => scrollTo("pricing")} className="flex-1 text-[10px] py-2.5 rounded-lg border border-border hover:bg-secondary/50 transition-colors">See pricing</button>
                  </div>
                </>
              )}
            </div>
          </div>
        </Section>
      )}

      {/* ═══════════════ MARKETPLACE BROWSE ═══════════════ */}
      {isMarketplace && (
        <Section id="browse" className="border-t border-border">
          <h2 className="text-2xl font-bold text-center mb-2">Browse listings</h2>
          <p className="text-sm text-muted-foreground text-center mb-8">Find exactly what you're looking for</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-lg mx-auto">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="rounded-xl border border-border bg-card overflow-hidden cursor-pointer hover:border-foreground/20 hover:shadow-lg transition-all" onClick={() => toast.info("Sign up to view full details")}>
                <div className="h-32 bg-gradient-to-br from-secondary/40 to-secondary/10" />
                <div className="p-3">
                  <div className="h-3 rounded bg-secondary/40 w-3/4 mb-2" />
                  <div className="h-2.5 rounded bg-secondary/30 w-1/2" />
                  <p className="text-xs font-bold mt-2 text-foreground">$---</p>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <button onClick={() => scrollTo("signup")} className="bg-foreground text-background px-8 py-3 rounded-lg text-sm font-bold hover:opacity-90 transition-opacity">
              Sign up to see all listings
            </button>
          </div>
        </Section>
      )}

      {/* ═══════════════ HOW IT WORKS ═══════════════ */}
      <Section id="how-it-works" className="border-t border-border">
        <h2 className="text-2xl font-bold text-center mb-2">How it works</h2>
        <p className="text-sm text-muted-foreground text-center mb-10">Get started in {copy.howItWorks.length} simple steps</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-2xl mx-auto">
          {copy.howItWorks.map((s, i) => (
            <div key={s.step} className="text-center p-6 rounded-2xl border border-border bg-card hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center mx-auto mb-4 text-lg font-bold text-foreground">{s.step}</div>
              <p className="text-sm font-bold mb-2">{s.title}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* ═══════════════ FEATURES ═══════════════ */}
      <Section id="features" className="border-t border-border">
        <h2 className="text-2xl font-bold text-center mb-2">Everything you need</h2>
        <p className="text-sm text-muted-foreground text-center mb-10">{copy.tagline}</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-2xl mx-auto">
          {copy.bullets.map((b, i) => {
            const Icon = featureIcons[i % featureIcons.length];
            return (
              <div key={i} className="p-5 rounded-2xl border border-border bg-card hover:shadow-lg transition-shadow group">
                <div className="w-10 h-10 rounded-xl bg-secondary/60 flex items-center justify-center mb-4 group-hover:bg-secondary transition-colors">
                  <Icon className="w-5 h-5 text-foreground/70" />
                </div>
                <p className="text-sm font-bold mb-1">{b}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">Built to help you move faster and get better results with less effort.</p>
              </div>
            );
          })}
        </div>
      </Section>

      {/* ═══════════════ SURVEY (VALIDATION) ═══════════════ */}
      <Section id="survey" className="border-t border-border">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-2">Help us build what you need</h2>
            <p className="text-sm text-muted-foreground">5-minute survey · Your answers directly shape the product</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-8">
            {!surveyDone ? (
              <>
                {/* Progress */}
                <div className="flex items-center gap-2 mb-6">
                  <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                    <div className="h-full rounded-full bg-foreground transition-all" style={{ width: `${((surveyStep + 1) / surveyQuestions.length) * 100}%` }} />
                  </div>
                  <span className="text-[10px] text-muted-foreground font-mono">{surveyStep + 1}/{surveyQuestions.length}</span>
                </div>
                <p className="text-sm font-bold mb-4">{surveyQuestions[surveyStep]}</p>
                {surveyStep === 3 ? (
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {["Yes, definitely", "Probably yes", "Maybe", "No"].map(opt => (
                      <button
                        key={opt}
                        onClick={() => { setCurrentSurveyInput(opt); }}
                        className={`text-xs py-3 rounded-xl border transition-colors ${currentSurveyInput === opt ? "border-foreground bg-foreground/5 font-semibold" : "border-border hover:bg-secondary/50"}`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                ) : surveyStep === 4 ? (
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {["$0 (free only)", "$1–$9/mo", "$10–$29/mo", "$30+/mo"].map(opt => (
                      <button
                        key={opt}
                        onClick={() => { setCurrentSurveyInput(opt); }}
                        className={`text-xs py-3 rounded-xl border transition-colors ${currentSurveyInput === opt ? "border-foreground bg-foreground/5 font-semibold" : "border-border hover:bg-secondary/50"}`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                ) : surveyStep === 2 ? (
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {["Daily", "Weekly", "Monthly", "Rarely"].map(opt => (
                      <button
                        key={opt}
                        onClick={() => { setCurrentSurveyInput(opt); }}
                        className={`text-xs py-3 rounded-xl border transition-colors ${currentSurveyInput === opt ? "border-foreground bg-foreground/5 font-semibold" : "border-border hover:bg-secondary/50"}`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                ) : (
                  <textarea
                    value={currentSurveyInput}
                    onChange={(e) => setCurrentSurveyInput(e.target.value)}
                    placeholder="Type your answer..."
                    className="w-full px-4 py-3 rounded-xl border border-border bg-secondary/30 text-sm resize-none focus:outline-none focus:border-foreground/30 transition-colors mb-4"
                    rows={3}
                  />
                )}
                <div className="flex gap-3">
                  {surveyStep > 0 && (
                    <button onClick={() => { setSurveyStep(surveyStep - 1); setCurrentSurveyInput(surveyAnswers[surveyStep - 1] || ""); }} className="px-5 py-2.5 rounded-lg border border-border text-xs hover:bg-secondary/50 transition-colors">
                      Back
                    </button>
                  )}
                  <button
                    onClick={handleSurveyNext}
                    disabled={!currentSurveyInput.trim()}
                    className="flex-1 bg-foreground text-background py-2.5 rounded-lg text-xs font-bold hover:opacity-90 transition-opacity disabled:opacity-30"
                  >
                    {surveyStep === surveyQuestions.length - 1 ? "Submit survey" : "Next"}
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center py-6 space-y-3">
                <p className="text-3xl">🎉</p>
                <p className="text-sm font-bold">Thank you for your feedback!</p>
                <p className="text-xs text-muted-foreground">Your answers help us build a better product for you.</p>
                <div className="flex gap-3 mt-4">
                  <button onClick={() => scrollTo(isToolFirst ? "try-it" : "signup")} className="flex-1 bg-foreground text-background py-2.5 rounded-lg text-xs font-bold hover:opacity-90 transition-opacity">
                    {isToolFirst ? "Try the product" : "Create account"}
                  </button>
                  <button onClick={() => scrollTo("how-it-works")} className="flex-1 py-2.5 rounded-lg border border-border text-xs hover:bg-secondary/50 transition-colors">
                    Learn more
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </Section>

      {/* ═══════════════ TESTIMONIALS ═══════════════ */}
      <Section className="border-t border-border">
        <h2 className="text-2xl font-bold text-center mb-8">What people are saying</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-2xl mx-auto">
          {[
            { name: "Sarah K.", role: "Product Manager", text: "This changed how I work. Highly recommended!" },
            { name: "Mike T.", role: "Freelancer", text: "Simple, effective, and saves me hours every week." },
            { name: "Lisa R.", role: "Startup Founder", text: "Finally something that actually delivers on its promise." },
            { name: "James W.", role: "Designer", text: "The best tool I've found this year. Period." },
          ].map((t) => (
            <div key={t.name} className="p-6 rounded-2xl border border-border bg-card hover:shadow-lg transition-shadow">
              <div className="flex gap-0.5 mb-3">
                {[1,2,3,4,5].map(s => <Star key={s} className="w-4 h-4 fill-amber-400 text-amber-400" />)}
              </div>
              <p className="text-sm text-muted-foreground mb-4 leading-relaxed italic">"{t.text}"</p>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-foreground">{t.name[0]}</div>
                <div>
                  <p className="text-xs font-bold text-foreground">{t.name}</p>
                  <p className="text-[10px] text-muted-foreground">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ═══════════════ SIGNUP ═══════════════ */}
      <Section id="signup" className="border-t border-border">
        <div className="max-w-sm mx-auto">
          <h2 className="text-2xl font-bold text-center mb-2">
            {isLanding ? "Get early access" : isToolFirst && toolUsed ? "Save your work" : "Create your account"}
          </h2>
          <p className="text-sm text-muted-foreground text-center mb-6">
            {isLanding ? `Be the first to know when ${projectName} launches` : `Start using ${projectName} in under a minute`}
          </p>
          <div className="rounded-2xl border border-border bg-card p-8 space-y-3">
            {!isLanding && (
              <input value={nameInput} onChange={(e) => setNameInput(e.target.value)} placeholder="Your name"
                className="w-full px-4 py-3 rounded-lg border border-border bg-secondary/30 text-sm focus:outline-none focus:border-foreground/30 transition-colors" />
            )}
            <input value={emailInput} onChange={(e) => setEmailInput(e.target.value)} placeholder="Email address"
              className="w-full px-4 py-3 rounded-lg border border-border bg-secondary/30 text-sm focus:outline-none focus:border-foreground/30 transition-colors" />
            {!isLanding && (
              <input value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} placeholder="Password" type="password"
                className="w-full px-4 py-3 rounded-lg border border-border bg-secondary/30 text-sm focus:outline-none focus:border-foreground/30 transition-colors" />
            )}
            <button
              onClick={() => {
                if (!emailInput.trim() || !emailInput.includes("@")) { toast.error("Please enter a valid email"); return; }
                if (!isLanding && !nameInput.trim()) { toast.error("Please enter your name"); return; }
                handleEmailSave();
                trackEvent("account_created", projectId);
                setStep("feedback");
                toast.success(isLanding ? "You're on the list! We'll notify you at launch." : "Account created! Welcome aboard.");
              }}
              className="w-full bg-foreground text-background py-3.5 rounded-lg text-sm font-bold mt-2 hover:opacity-90 transition-opacity"
            >
              {isLanding ? "Notify me" : "Create account"}
            </button>
            {step === "feedback" && (
              <div className="mt-4 p-4 rounded-xl border border-border bg-secondary/20 text-center space-y-2">
                <p className="text-xs font-bold text-foreground">✓ {isLanding ? "You're on the list!" : "Account created!"}</p>
                <p className="text-[10px] text-muted-foreground">What would you like to do next?</p>
                <div className="flex gap-2">
                  <button onClick={() => scrollTo("how-it-works")} className="flex-1 text-[10px] py-2 rounded-lg border border-border hover:bg-secondary/50 transition-colors">Explore product</button>
                  <button onClick={() => setFeedbackOpen(true)} className="flex-1 text-[10px] py-2 rounded-lg bg-foreground text-background hover:opacity-90 transition-opacity">Give feedback</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </Section>

      {/* ═══════════════ PRICING ═══════════════ */}
      {includePricing && (
        <Section id="pricing" className="border-t border-border">
          <h2 className="text-2xl font-bold text-center mb-2">
            {isToolFirst ? "Pricing" : isMarketplace ? "How it works" : "Choose your plan"}
          </h2>
          <p className="text-sm text-muted-foreground text-center mb-10">
            {isToolFirst ? "Try free. Pay only when you need more." : "Start free. Upgrade when you're ready."}
          </p>
          <div className={`grid gap-5 max-w-2xl mx-auto ${copy.pricingPlans.length === 1 ? "max-w-sm" : "grid-cols-2"}`}>
            {copy.pricingPlans.map((plan, idx) => (
              <div
                key={plan.name}
                onClick={() => { setSelectedPlan(plan.name); trackEvent("pricing_viewed", projectId, plan.name); }}
                className={`p-7 rounded-2xl border-2 text-center cursor-pointer transition-all ${
                  selectedPlan === plan.name || idx === 1 ? "border-foreground bg-foreground/[0.03] shadow-xl" : "border-border hover:border-foreground/20"
                }`}
              >
                {idx === 1 && <p className="text-[10px] font-bold text-foreground mb-2 uppercase tracking-wide">Most popular</p>}
                <p className="text-sm font-bold">{plan.name}</p>
                <p className="text-4xl font-extrabold my-4">{plan.price}</p>
                <p className="text-xs text-muted-foreground mb-5">{plan.desc}</p>
                <div className="space-y-2.5 mb-6">
                  {plan.features.map((f) => (
                    <p key={f} className="text-xs text-muted-foreground flex items-center gap-2 justify-center">
                      <Check className="w-3.5 h-3.5 text-[hsl(var(--success))]" /> {f}
                    </p>
                  ))}
                </div>
                {planInterest === plan.name ? (
                  <div className="py-3 text-xs rounded-lg bg-secondary text-foreground font-bold flex items-center justify-center gap-1.5">
                    <Check className="w-3.5 h-3.5" /> Interest registered
                  </div>
                ) : (
                  <button
                    onClick={(e) => { e.stopPropagation(); handlePlanInterest(plan.name, plan.cta); }}
                    className={`w-full py-3 text-xs rounded-lg font-bold transition-opacity ${idx === 1 || selectedPlan === plan.name ? "bg-foreground text-background hover:opacity-90" : "border border-border hover:bg-secondary/50"}`}
                  >
                    {plan.cta}
                  </button>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ═══════════════ FEEDBACK ═══════════════ */}
      <Section className="border-t border-border">
        <div className="max-w-sm mx-auto rounded-2xl border border-border bg-card p-8">
          <p className="text-base font-bold mb-1">How's your experience?</p>
          <p className="text-xs text-muted-foreground mb-5">Your feedback helps us improve {projectName}</p>
          <div className="flex gap-2 mb-5">
            {["😞", "😐", "🙂", "😊", "🤩"].map((e) => (
              <button key={e} onClick={() => { addFeedback({ emoji: e }, projectId); trackEvent("feedback_submitted", projectId, e); setStep("done"); toast.success("Feedback recorded!"); }} className="text-2xl p-3 rounded-xl border border-border hover:bg-secondary/50 flex-1 transition-colors">{e}</button>
            ))}
          </div>
          <textarea
            value={feedbackComment}
            onChange={(e) => setFeedbackComment(e.target.value)}
            placeholder="Tell us what you think..."
            className="w-full px-4 py-3 rounded-xl border border-border bg-secondary/30 text-sm resize-none focus:outline-none focus:border-foreground/30 transition-colors"
            rows={3}
          />
          <button onClick={() => { if (feedbackComment.trim()) { addFeedback({ comment: feedbackComment }, projectId); trackEvent("feedback_submitted", projectId); toast.success("Feedback submitted!"); setFeedbackComment(""); setStep("done"); } }} className="w-full mt-4 bg-foreground text-background py-3 rounded-lg text-xs font-bold hover:opacity-90 transition-opacity">Send feedback</button>
          {step === "done" && (
            <div className="mt-4 flex gap-2">
              <button onClick={() => { setStep("landing"); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="flex-1 text-[10px] py-2.5 rounded-lg border border-border hover:bg-secondary/50 transition-colors">Back to product</button>
              <button onClick={() => setStep("feedback")} className="flex-1 text-[10px] py-2.5 rounded-lg border border-border hover:bg-secondary/50 transition-colors">Submit another</button>
            </div>
          )}
        </div>
      </Section>

      {/* ═══════════════ FAQ ═══════════════ */}
      <Section className="border-t border-border">
        <h2 className="text-2xl font-bold text-center mb-8">Frequently asked questions</h2>
        <div className="max-w-lg mx-auto space-y-3">
          {[
            { q: `What is ${projectName}?`, a: copy.subtitle },
            { q: "Is it free to try?", a: "Yes — you can get started completely free with no credit card required." },
            { q: "How long does setup take?", a: "Under 2 minutes. We've made it as simple as possible." },
            { q: "Can I cancel anytime?", a: "Absolutely. No contracts, no hidden fees. Cancel with one click." },
            { q: "Is my data secure?", a: "Yes — we use industry-standard encryption and never share your data with third parties." },
          ].map((faq, i) => (
            <details key={i} className="rounded-2xl border border-border bg-card p-5 cursor-pointer group">
              <summary className="text-sm font-bold text-foreground list-none flex items-center justify-between">
                {faq.q}
                <ChevronRight className="w-4 h-4 text-muted-foreground transition-transform group-open:rotate-90" />
              </summary>
              <p className="text-xs text-muted-foreground mt-3 leading-relaxed">{faq.a}</p>
            </details>
          ))}
        </div>
      </Section>

      {/* ═══════════════ TRUST ═══════════════ */}
      <Section className="border-t border-border">
        <div className="max-w-lg mx-auto text-center">
          <h2 className="text-2xl font-bold mb-8">Built with trust</h2>
          <div className="grid grid-cols-3 gap-6">
            {[
              { icon: Shield, title: "Privacy first", desc: "Your data stays yours. Always." },
              { icon: Lock, title: "Secure by default", desc: "Industry-standard encryption." },
              { icon: Check, title: "No lock-in", desc: "Cancel anytime. Export your data." },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="text-center">
                <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center mx-auto mb-3">
                  <Icon className="w-5 h-5 text-foreground/70" />
                </div>
                <p className="text-xs font-bold mb-1">{title}</p>
                <p className="text-[10px] text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ═══════════════ SHARE ═══════════════ */}
      <Section className="border-t border-border">
        <div className="max-w-sm mx-auto text-center">
          <Share2 className="w-8 h-8 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Know someone who'd love this?</h2>
          <p className="text-xs text-muted-foreground mb-6">Share {projectName} with friends and help us grow.</p>
          <div className="flex flex-wrap gap-2 justify-center mb-4">
            <button
              onClick={() => { navigator.clipboard.writeText(window.location.href); trackEvent("share", projectId, "copy_link"); toast.success("Link copied!"); }}
              className="bg-foreground text-background px-5 py-2.5 rounded-lg text-xs font-bold hover:opacity-90 transition-opacity"
            >
              📋 Copy link
            </button>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`Check out ${projectName}: ${window.location.href}`)}`}
              target="_blank" rel="noopener noreferrer"
              onClick={() => trackEvent("share", projectId, "whatsapp")}
              className="px-5 py-2.5 rounded-lg text-xs font-bold border border-border hover:bg-secondary/50 transition-colors"
            >
              💬 WhatsApp
            </a>
            <a
              href={`mailto:?subject=${encodeURIComponent(`Check out ${projectName}`)}&body=${encodeURIComponent(`I found this and thought you'd like it: ${window.location.href}`)}`}
              onClick={() => trackEvent("share", projectId, "email")}
              className="px-5 py-2.5 rounded-lg text-xs font-bold border border-border hover:bg-secondary/50 transition-colors"
            >
              ✉️ Email
            </a>
            <a
              href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`}
              target="_blank" rel="noopener noreferrer"
              onClick={() => trackEvent("share", projectId, "linkedin")}
              className="px-5 py-2.5 rounded-lg text-xs font-bold border border-border hover:bg-secondary/50 transition-colors"
            >
              💼 LinkedIn
            </a>
            <a
              href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`}
              target="_blank" rel="noopener noreferrer"
              onClick={() => trackEvent("share", projectId, "facebook")}
              className="px-5 py-2.5 rounded-lg text-xs font-bold border border-border hover:bg-secondary/50 transition-colors"
            >
              📘 Facebook
            </a>
          </div>
        </div>
      </Section>

      {/* ═══════════════ FINAL CTA ═══════════════ */}
      <Section className="py-20 border-t border-border">
        <div className="text-center max-w-sm mx-auto">
          <h2 className="text-2xl font-bold mb-3">Ready to get started?</h2>
          <p className="text-sm text-muted-foreground mb-8">{copy.subtitle}</p>
          <button onClick={() => scrollTo(isToolFirst ? "try-it" : "signup")} className="bg-foreground text-background px-10 py-3.5 rounded-lg text-sm font-bold hover:opacity-90 transition-opacity shadow-lg shadow-foreground/10">
            {copy.cta}
          </button>
        </div>
      </Section>

      {/* ═══════════════ FOOTER ═══════════════ */}
      <div className="px-6 py-6 text-center border-t border-border bg-secondary/10">
        <p className="text-xs text-muted-foreground">
          Built with <span className="font-bold text-foreground">Alizé</span> · Build your own MVP and know exactly what to do next
        </p>
        <button onClick={() => window.location.href = "/"} className="text-xs text-muted-foreground underline hover:text-foreground mt-2 transition-colors">
          Build with Alizé →
        </button>
      </div>

      {/* ═══════════════ FLOATING CHAT ═══════════════ */}
      {chatOpen && (
        <div className="fixed bottom-20 right-8 w-80 bg-card border border-border rounded-2xl shadow-2xl flex flex-col z-50" style={{ height: "400px" }}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-foreground" />
              <span className="text-sm font-bold">Chat with {projectName}</span>
            </div>
            <button onClick={() => setChatOpen(false)}><X className="h-4 w-4 text-muted-foreground" /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {chatMessages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-xl px-3.5 py-2.5 text-xs ${msg.role === "user" ? "bg-foreground text-background" : "bg-secondary text-secondary-foreground"}`}>
                  {msg.text}
                </div>
              </div>
            ))}
          </div>
          <div className="p-3 border-t border-border flex gap-2">
            <input value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleChatSend()} placeholder="Ask a question..." className="flex-1 bg-secondary rounded-lg px-3 py-2.5 text-xs text-foreground placeholder:text-muted-foreground outline-none" />
            <button onClick={handleChatSend} className="p-2.5 rounded-lg bg-foreground text-background"><Send className="h-3.5 w-3.5" /></button>
          </div>
        </div>
      )}
      <div className="sticky bottom-4 flex justify-end px-4">
        <button onClick={() => setChatOpen(!chatOpen)} className="bg-foreground text-background rounded-full p-3.5 shadow-xl hover:opacity-90 transition-opacity">
          <MessageCircle className="h-5 w-5" />
        </button>
      </div>

      {/* Feedback modal */}
      {feedbackOpen && (
        <div className="fixed inset-0 bg-background/60 flex items-center justify-center z-50" onClick={() => setFeedbackOpen(false)}>
          <div className="bg-card border border-border rounded-2xl p-8 w-80 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-base font-bold">Quick feedback</p>
              <button onClick={() => setFeedbackOpen(false)}><X className="h-4 w-4 text-muted-foreground" /></button>
            </div>
            <p className="text-xs text-muted-foreground mb-4">How was your experience?</p>
            <div className="flex gap-1.5 mb-4">
              {[1,2,3,4,5].map(s => (
                <button key={s} onClick={() => { addFeedback({ rating: s }, projectId); trackEvent("feedback_submitted", projectId, `${s}/5`); toast.success(`Rated ${s}/5!`); }} className="flex-1 p-3 rounded-xl border border-border hover:bg-secondary/50 transition-colors">
                  <Star className={`h-4 w-4 mx-auto ${s <= 3 ? "text-muted-foreground" : "text-amber-400 fill-amber-400"}`} />
                </button>
              ))}
            </div>
            <textarea value={feedbackComment} onChange={(e) => setFeedbackComment(e.target.value)} placeholder="Any comments?" className="w-full px-4 py-3 rounded-xl border border-border bg-secondary/30 text-sm resize-none focus:outline-none" rows={3} />
            <button onClick={() => { if (feedbackComment.trim()) { addFeedback({ comment: feedbackComment }, projectId); trackEvent("feedback_submitted", projectId); toast.success("Feedback submitted!"); setFeedbackComment(""); setFeedbackOpen(false); } }} className="w-full mt-4 bg-foreground text-background py-3 rounded-lg text-xs font-bold hover:opacity-90 transition-opacity">Submit</button>
          </div>
        </div>
      )}
    </div>
  );
}
