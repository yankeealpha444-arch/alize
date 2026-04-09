import { useNavigate } from "react-router-dom";
import { ArrowLeft, DollarSign } from "lucide-react";
import { useProjectId } from "@/hooks/useProject";
import { getProjectData } from "@/lib/projectData";
import { getTrackingEvents } from "@/lib/trackingEvents";

const PriceIntentDetail = () => {
  const projectId = useProjectId();
  const data = getProjectData(projectId);
  const navigate = useNavigate();
  const events = getTrackingEvents(projectId);

  // Price intent from surveys
  const priceAnswers = data.surveys.flatMap((s) =>
    Object.entries(s.answers)
      .filter(([, a]) => a === "Yes" || a === "Yes, definitely" || a === "Probably yes" || a.includes("$"))
      .map(([, a]) => ({ answer: a, date: s.timestamp }))
  );

  // Price views from tracking
  const pricingViews = events.filter((e) => e.type === "pricing_viewed");
  const preorders = events.filter((e) => e.type === "preorder");

  const totalSignals = priceAnswers.length + preorders.length;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </button>

      <div className="flex items-center gap-3">
        <DollarSign className="w-5 h-5 text-foreground" />
        <h1 className="text-xl font-bold text-foreground">Price Intent ({totalSignals} signals)</h1>
      </div>

      {/* AI Summary */}
      <div className="rounded-lg border border-border bg-card p-5 space-y-3">
        <h2 className="text-sm font-bold text-foreground">AI Summary — Will They Pay?</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Survey "Would Pay"</p>
            <p className="text-2xl font-bold font-mono text-foreground">{priceAnswers.length}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Pricing Page Views</p>
            <p className="text-2xl font-bold font-mono text-foreground">{pricingViews.length}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Pre-orders</p>
            <p className="text-2xl font-bold font-mono text-foreground">{preorders.length}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Target</p>
            <p className="text-2xl font-bold font-mono text-muted-foreground">3+</p>
          </div>
        </div>
        <div className="pt-2 border-t border-border">
          <p className="text-xs text-muted-foreground">
            {totalSignals < 3
              ? `Need ${3 - totalSignals} more price intent signals. Share your MVP with pricing visible.`
              : "✓ Price intent validated. Users are willing to pay."}
          </p>
        </div>
      </div>

      {/* Evidence */}
      <div className="rounded-lg border border-border bg-card">
        <div className="px-5 py-3 border-b border-border">
          <h2 className="text-sm font-bold text-foreground">Price Intent Evidence</h2>
        </div>
        {totalSignals === 0 ? (
          <p className="px-5 py-8 text-sm text-muted-foreground text-center">No price intent signals yet</p>
        ) : (
          <div className="divide-y divide-border">
            {priceAnswers.map((p, i) => (
              <div key={`s-${i}`} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <span className="text-xs px-2 py-0.5 rounded bg-secondary text-secondary-foreground mr-2">Survey</span>
                  <span className="text-sm text-foreground">"{p.answer}"</span>
                </div>
                <span className="text-xs text-muted-foreground">{new Date(p.date).toLocaleDateString()}</span>
              </div>
            ))}
            {preorders.map((e, i) => (
              <div key={`p-${i}`} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <span className="text-xs px-2 py-0.5 rounded bg-[hsl(var(--success))]/20 text-[hsl(var(--success))] mr-2">Pre-order</span>
                  <span className="text-sm text-foreground">{e.label || "Pre-order submitted"}</span>
                </div>
                <span className="text-xs text-muted-foreground">{new Date(e.timestamp).toLocaleDateString()}</span>
              </div>
            ))}
            {pricingViews.map((e, i) => (
              <div key={`v-${i}`} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <span className="text-xs px-2 py-0.5 rounded bg-secondary text-secondary-foreground mr-2">View</span>
                  <span className="text-sm text-muted-foreground">Viewed pricing page</span>
                </div>
                <span className="text-xs text-muted-foreground">{new Date(e.timestamp).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PriceIntentDetail;
