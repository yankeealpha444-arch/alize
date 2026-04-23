import { Zap, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface NextBestActionProps {
  action: string;
  detail: string;
  nextStep?: string;
  expectedImpact?: string;
  testName?: string;
  projectId?: string;
}

function getActionRoute(action: string, projectId: string): string {
  const lower = action.toLowerCase();
  if (lower.includes("landing") || lower.includes("headline") || lower.includes("hero")) return `/builder/${projectId}`;
  if (lower.includes("user") || lower.includes("traffic") || lower.includes("first")) return `/get-users/${projectId}`;
  if (lower.includes("validation") || lower.includes("survey")) return `/get-users/${projectId}`;
  if (lower.includes("crushing")) return `/founder/${projectId}`;
  return `/preview/${projectId}`;
}

function getActionLabel(action: string): string {
  const lower = action.toLowerCase();
  if (lower.includes("landing") || lower.includes("headline")) return "Edit MVP";
  if (lower.includes("user") || lower.includes("traffic") || lower.includes("first")) return "Get Users";
  if (lower.includes("validation") || lower.includes("survey")) return "Share Survey";
  if (lower.includes("crushing")) return "View dashboard";
  return "Preview changes";
}

const NextBestAction = ({ action, detail, nextStep, expectedImpact, testName, projectId = "default" }: NextBestActionProps) => {
  const navigate = useNavigate();
  const route = getActionRoute(action, projectId);
  const label = getActionLabel(action);

  return (
    <div className="rounded-lg border border-foreground/10 bg-secondary/30 p-5">
      <div className="flex items-center gap-2 mb-3">
        <Zap className="w-4 h-4 text-foreground" />
        <h3 className="text-sm font-bold text-foreground">Next Best Action</h3>
      </div>

      <div className="space-y-3">
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-1">Problem</p>
          <p className="text-base font-bold text-foreground">{action}</p>
        </div>

        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-1">Why it matters</p>
          <p className="text-sm text-foreground">{detail}</p>
        </div>

        {nextStep && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-1">What to do</p>
            <p className="text-sm text-foreground">{nextStep}</p>
          </div>
        )}

        {expectedImpact && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-1">Expected impact</p>
            <p className="text-sm text-[hsl(var(--success))] font-semibold">{expectedImpact}</p>
          </div>
        )}

        <button
          onClick={() => navigate(route)}
          className="flex items-center gap-2 mt-2 text-sm font-semibold text-foreground bg-secondary hover:bg-secondary/70 px-5 py-2.5 rounded-lg transition-colors"
        >
          {testName ? `${label}: ${testName}` : label}
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default NextBestAction;
