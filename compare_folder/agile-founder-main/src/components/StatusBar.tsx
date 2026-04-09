import { ValidationMetrics, PMFMetrics, isValidated, hasPMF } from "@/lib/store";
import { ShieldCheck, TrendingUp } from "lucide-react";

interface StatusBarProps {
  validation: ValidationMetrics;
  pmf: PMFMetrics;
}

const StatusBar = ({ validation, pmf }: StatusBarProps) => {
  const validated = isValidated(validation);
  const pmfAchieved = hasPMF(pmf);

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className={`flex items-center gap-3 rounded-lg border px-4 py-3 ${
        validated ? "border-success/30 bg-success/5" : "border-destructive/30 bg-destructive/5"
      }`}>
        <ShieldCheck className={`w-5 h-5 ${validated ? "text-success" : "text-destructive"}`} />
        <div>
          <p className="text-xs text-muted-foreground">Validation Status</p>
          <p className={`text-sm font-semibold ${validated ? "text-success" : "text-destructive"}`}>
            {validated ? "VALIDATED" : "NOT VALIDATED"}
          </p>
        </div>
      </div>
      <div className={`flex items-center gap-3 rounded-lg border px-4 py-3 ${
        pmfAchieved ? "border-success/30 bg-success/5" : "border-destructive/30 bg-destructive/5"
      }`}>
        <TrendingUp className={`w-5 h-5 ${pmfAchieved ? "text-success" : "text-destructive"}`} />
        <div>
          <p className="text-xs text-muted-foreground">Product Market Fit</p>
          <p className={`text-sm font-semibold ${pmfAchieved ? "text-success" : "text-destructive"}`}>
            {pmfAchieved ? "PMF ACHIEVED" : "NO PMF"}
          </p>
        </div>
      </div>
    </div>
  );
};

export default StatusBar;
