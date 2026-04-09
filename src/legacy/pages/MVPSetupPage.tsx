import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Rocket, CheckCircle2 } from "lucide-react";
import { detectProductType, getProductTypeInfo } from "@/lib/productType";

const autoTracking = [
  "Number of visitors",
  "Number of signups",
  "Feature usage",
  "Time on product",
  "Drop-off points",
  "Return users",
  "User feedback and comments",
  "Survey responses",
  "User conversations and questions",
  "Shares and referrals",
  "Conversion rate",
  "Revenue or pre-orders (if enabled)",
];

const buildPlanItems = [
  "Create a working version of your product so users can sign up and use it",
  "Guide users through the core feature so you can test if the product is actually useful",
  "Collect feedback from users while they are using the product",
  "Ask survey questions inside the product",
  "Track user behavior such as signups, feature usage, time on product, and drop-off points",
  "Track if users return and continue using the product",
  "Track pricing interest, pre-orders, or payments if enabled",
  "Show all results on your dashboard",
  "Suggest what to improve next based on real user behavior",
  "Allow you to run tests, improve the product, and create new versions",
  "Repeat this loop until you reach product market fit",
];

type PricingChoice = "yes" | "no" | "not-sure";

export default function MVPSetupPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const startupIdeaFromState =
    typeof location.state === "object" &&
    location.state !== null &&
    "startupIdea" in location.state &&
    typeof (location.state as { startupIdea?: unknown }).startupIdea === "string"
      ? (location.state as { startupIdea: string }).startupIdea
      : "";

  const idea =
    startupIdeaFromState.trim() ||
    (typeof window !== "undefined" ? localStorage.getItem("alize_idea")?.trim() || "" : "");

  useEffect(() => {
    if (startupIdeaFromState.trim()) {
      localStorage.setItem("alize_idea", startupIdeaFromState.trim());
    }
  }, [startupIdeaFromState]);

  const projectName = idea.split(/\s+/).filter(Boolean).slice(0, 5).join(" ") || "Untitled";
  const productType = detectProductType(idea);
  const typeInfo = getProductTypeInfo(productType);

  const [pricingChoice, setPricingChoice] = useState<PricingChoice>("no");

  const selectedMVP = "Landing Page MVP";
  const selectedStyle = "Luxury Black";

  const handleBuild = () => {
    if (!idea.trim()) return;
    localStorage.setItem("alize_projectMode", "growth");
    localStorage.setItem("alize_productType", productType);
    localStorage.setItem("alize_includePricing", pricingChoice === "yes" ? "true" : "false");

    navigate("/project", {
      state: {
        startupIdea: idea.trim(),
        selectedMVP,
        selectedStyle,
        answers: {
          pricingChoice,
          productType,
          northStar: "Email Signups",
        },
      },
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-xl mx-auto px-4 pt-6 pb-16">
        {/* Back — founder home */}
        <button
          type="button"
          onClick={() => navigate("/")}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="h-3 w-3" /> Back
        </button>

        {/* ── Top: Your Idea ── */}
        <div className="mb-8">
          <p className="text-[10px] text-muted-foreground tracking-widest uppercase mb-1">Your Idea</p>
          <h2 className="text-lg font-medium text-foreground truncate mb-4" title={idea || undefined}>
            {idea || "No startup idea provided yet."}
          </h2>

          <h1 className="text-xl font-bold text-foreground mb-2">Step 1 — Validate Your Idea</h1>
          <p className="text-sm text-muted-foreground leading-relaxed mb-1">
            We are going to test this idea with real people using a working product.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Alizé will build your MVP, track what people do, and show you if people actually use your product.
          </p>
        </div>

        {/* ── Automatic Tracking ── */}
        <div className="bg-card border border-border rounded-xl p-5 mb-8">
          <p className="text-xs font-semibold text-foreground uppercase tracking-widest mb-3">We automatically track:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
            {autoTracking.map((item) => (
              <div key={item} className="flex items-center gap-2">
                <CheckCircle2 className="h-3 w-3 text-muted-foreground shrink-0" />
                <span className="text-xs text-foreground">{item}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-4 pt-3 border-t border-border">
            This data becomes your validation and product market fit evidence.
          </p>
        </div>

        {/* ── What Are You Building? ── */}
        <div className="bg-card border border-border rounded-xl p-5 mb-8">
          <p className="text-xs font-semibold text-foreground uppercase tracking-widest mb-3">What are you building?</p>
          <div className="flex items-center gap-3 p-3 rounded-lg border-2 border-foreground bg-foreground/5">
            <Rocket className="h-5 w-5 text-foreground shrink-0" />
            <div>
              <p className="text-sm font-bold text-foreground">{typeInfo.label}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{typeInfo.description}</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            <span className="font-medium text-foreground">Flow:</span> {typeInfo.flow.join(" → ")}
          </p>
          <p className="text-xs text-muted-foreground mt-1">{typeInfo.firstStep}</p>
        </div>

        {/* ── Pricing Question ── */}
        <div className="bg-card border border-border rounded-xl p-5 mb-8">
          <p className="text-sm font-semibold text-foreground mb-1">Are you testing if people will pay for this?</p>
          <p className="text-[10px] text-muted-foreground mb-4">
            This decides whether we include pricing/pre-order in the MVP.
          </p>
          <div className="space-y-2">
            {(
              [
                { value: "yes" as PricingChoice, label: "Yes — I want to test pricing / pre-orders" },
                { value: "no" as PricingChoice, label: "No — I only want to test usage first" },
                { value: "not-sure" as PricingChoice, label: "Not sure yet" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setPricingChoice(opt.value)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left ${
                  pricingChoice === opt.value
                    ? "border-foreground bg-foreground/5"
                    : "border-border hover:border-foreground/30"
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${
                    pricingChoice === opt.value ? "border-foreground" : "border-border"
                  }`}
                >
                  {pricingChoice === opt.value && <div className="w-2 h-2 rounded-full bg-foreground" />}
                </div>
                <span className="text-xs font-medium text-foreground">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Your Build Plan ── */}
        <div className="bg-card border border-border rounded-xl p-5 mb-8">
          <p className="text-xs font-semibold text-foreground uppercase tracking-widest mb-1">Your Build Plan</p>
          <p className="text-sm text-muted-foreground mb-4">
            We will create your MVP for <span className="text-foreground font-medium">{projectName}</span>.
          </p>

          <p className="text-xs font-semibold text-foreground mb-3">This MVP will:</p>
          <div className="space-y-2">
            {buildPlanItems.map((item, i) => (
              <div key={i} className="flex items-start gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                <span className="text-xs text-foreground leading-relaxed">{item}</span>
              </div>
            ))}
          </div>

          <div className="mt-5 pt-4 border-t border-border space-y-1.5">
            <p className="text-xs font-semibold text-foreground">This is a working product test, not just a landing page.</p>
            <p className="text-xs text-muted-foreground">
              The goal is to see if people use the product and improve it until you reach product market fit.
            </p>
          </div>
        </div>

        {/* ── Build Button — next founder step */}
        <button
          type="button"
          onClick={handleBuild}
          disabled={!idea.trim()}
          className="w-full flex items-center justify-center gap-2 py-3.5 text-sm font-semibold bg-foreground text-background hover:bg-foreground/90 rounded-xl transition-colors disabled:opacity-30"
        >
          Build My MVP <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
