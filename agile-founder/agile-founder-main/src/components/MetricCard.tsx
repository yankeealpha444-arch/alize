import { useNavigate } from "react-router-dom";
import { useProjectId } from "@/hooks/useProject";

interface MetricCardProps {
  label: string;
  value: string | number;
  target?: string | number;
  suffix?: string;
  clickable?: boolean;
  detailRoute?: string;
}

const MetricCard = ({ label, value, target, suffix = "", clickable, detailRoute }: MetricCardProps) => {
  const navigate = useNavigate();
  const projectId = useProjectId();

  const routeMap: Record<string, string> = {
    "Surveys / Interviews": `/detail/surveys/${projectId}`,
    "Feedback": `/detail/feedback/${projectId}`,
    "Price Intent": `/detail/price-intent/${projectId}`,
    "Emails": `/detail/emails/${projectId}`,
    "Activation Rate": `/detail/drop-off/${projectId}`,
    "Retention Rate": `/detail/drop-off/${projectId}`,
    "Conversion Rate": `/detail/drop-off/${projectId}`,
    "Usage": `/detail/usage/${projectId}`,
    "Drop-off": `/detail/drop-off/${projectId}`,
    "Avg Time on Product": `/detail/usage/${projectId}`,
  };

  const route = detailRoute || routeMap[label];
  const isClickable = clickable || !!route;

  return (
    <div
      className={`rounded-lg border border-border bg-card p-4 ${isClickable ? "cursor-pointer hover:border-primary/40 transition-colors" : ""}`}
      onClick={() => isClickable && route && navigate(route)}
    >
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-2xl font-bold font-mono text-foreground">
        {value}{suffix}
      </p>
      {target !== undefined && (
        <p className="text-xs text-muted-foreground mt-1">Target: {target}{suffix}</p>
      )}
      {isClickable && (
        <p className="text-xs text-primary mt-2">View details →</p>
      )}
    </div>
  );
};

export default MetricCard;
