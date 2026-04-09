import { BrainCircuit } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useProjectId } from "@/hooks/useProject";
import { toast } from "sonner";

const insights = [
  { category: "Top Problems", items: ["Users find onboarding confusing", "Pricing page has high drop-off", "Mobile experience is poor"] },
  { category: "Top Requested Features", items: ["Dark mode", "Export to PDF", "Team collaboration"] },
  { category: "Where Users Drop Off", items: ["After sign-up (62%)", "On pricing page (45%)", "During onboarding step 3 (38%)"] },
  { category: "Suggested Tests", items: ["Simplify onboarding to 2 steps", "A/B test pricing at $9 vs $19", "Add social proof to hero section"] },
];

const AIInsights = () => {
  const projectId = useProjectId();
  const navigate = useNavigate();

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
          <BrainCircuit className="w-5 h-5 text-foreground" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">AI Insights</h2>
          <p className="text-sm text-muted-foreground">Automated analysis of all your data</p>
        </div>
      </div>

      <div className="space-y-4">
        {insights.map((section) => (
          <div key={section.category} className="rounded-lg border border-border bg-card p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">{section.category}</h3>
            <ul className="space-y-1.5">
              {section.items.map((item) => (
                <li key={item} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="flex gap-3 mt-6">
        <button onClick={() => navigate(`/tests/${projectId}`)} className="rounded-md bg-foreground text-background px-4 py-2 text-sm font-semibold hover:opacity-90 transition-opacity">
          Run Test
        </button>
        <button onClick={() => { toast.success("Changes queued for preview"); navigate(`/preview/${projectId}`); }} className="rounded-md border border-border bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors">
          Apply Change
        </button>
        <button onClick={() => { toast.success("New version created!"); navigate(`/versions/${projectId}`); }} className="rounded-md border border-border bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors">
          Create New Version
        </button>
      </div>
    </div>
  );
};

export default AIInsights;
