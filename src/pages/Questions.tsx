import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { detectProductType } from "@/lib/productType";
import { sanitizeIdeaForPersistence } from "@/lib/mvp/ideaContentSafety";

export default function Questions() {
  const navigate = useNavigate();
  const idea = sanitizeIdeaForPersistence(localStorage.getItem("alize_idea") || "");
  const productType = detectProductType(idea);

  const handleBuild = () => {
    if (!idea.trim()) return;
    localStorage.setItem("alize_projectMode", "growth");
    localStorage.setItem("alize_productType", productType);
    localStorage.setItem("alize_includePricing", "false");
    navigate("/generate");
  };

  return (
    <div className="max-w-xl mx-auto px-4 min-h-screen flex flex-col justify-center py-16">
      <div className="mb-8 text-center">
        <h1 className="text-xl font-bold text-foreground mb-2">See your MVP come to life</h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          We are generating your MVP now. This takes a few seconds.
        </p>
      </div>

      <button
        type="button"
        onClick={handleBuild}
        disabled={!idea.trim()}
        className="w-full flex items-center justify-center gap-2 py-3.5 text-sm font-semibold bg-foreground text-background hover:bg-foreground/90 rounded-xl transition-colors disabled:opacity-30"
      >
        Build my MVP <ArrowRight className="h-4 w-4" />
      </button>
      <p className="mt-2 text-[11px] text-muted-foreground text-center">
        No setup required. You can edit everything later.
      </p>
    </div>
  );
}
