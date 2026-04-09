import { useNavigate } from "react-router-dom";
import { ArrowLeft, Activity } from "lucide-react";
import { useProjectId } from "@/hooks/useProject";
import { getTrackingEvents } from "@/lib/trackingEvents";

const UsageDetail = () => {
  const projectId = useProjectId();
  const navigate = useNavigate();
  const events = getTrackingEvents(projectId);

  const sessions = new Set(events.map((e) => e.sessionId));
  const pageViews = events.filter((e) => e.type === "page_view");
  const buttonClicks = events.filter((e) => e.type === "button_click");
  const demoViews = events.filter((e) => e.type === "demo_viewed");
  const processClicks = events.filter((e) => e.type === "process_clicked");
  const fileUploads = events.filter((e) => e.type === "file_uploaded");
  const chatMessages = events.filter((e) => e.type === "chat_message");

  // Group events by type for feature usage
  const featureUsage = [
    { feature: "Page Views", count: pageViews.length },
    { feature: "Button Clicks", count: buttonClicks.length },
    { feature: "Demo Views", count: demoViews.length },
    { feature: "Process / Try", count: processClicks.length },
    { feature: "File Uploads", count: fileUploads.length },
    { feature: "Chat Messages", count: chatMessages.length },
  ].filter((f) => f.count > 0).sort((a, b) => b.count - a.count);

  // Biggest drop-off point
  const dropOffPoint = featureUsage.length > 1
    ? `Most used: ${featureUsage[0].feature}. Least used: ${featureUsage[featureUsage.length - 1].feature}.`
    : "Not enough data yet.";

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </button>

      <div className="flex items-center gap-3">
        <Activity className="w-5 h-5 text-foreground" />
        <h1 className="text-xl font-bold text-foreground">Usage ({sessions.size} users)</h1>
      </div>

      {/* AI Summary */}
      <div className="rounded-lg border border-border bg-card p-5 space-y-3">
        <h2 className="text-sm font-bold text-foreground">AI Summary</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Unique Users</p>
            <p className="text-2xl font-bold font-mono text-foreground">{sessions.size}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Events</p>
            <p className="text-2xl font-bold font-mono text-foreground">{events.length}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Most Used</p>
            <p className="text-sm font-semibold text-foreground">{featureUsage[0]?.feature || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Insight</p>
            <p className="text-xs text-muted-foreground">{dropOffPoint}</p>
          </div>
        </div>
      </div>

      {/* Feature Usage */}
      <div className="rounded-lg border border-border bg-card p-5 space-y-3">
        <h2 className="text-sm font-bold text-foreground">Feature Usage</h2>
        {featureUsage.length === 0 ? (
          <p className="text-sm text-muted-foreground">No usage data yet.</p>
        ) : (
          <div className="space-y-2">
            {featureUsage.map((f) => {
              const maxCount = featureUsage[0].count;
              const width = Math.max((f.count / maxCount) * 100, 8);
              return (
                <div key={f.feature} className="flex items-center gap-3">
                  <span className="w-32 text-xs text-muted-foreground shrink-0">{f.feature}</span>
                  <div className="flex-1 h-5 bg-secondary rounded overflow-hidden">
                    <div className="h-full bg-foreground/20 rounded" style={{ width: `${width}%` }} />
                  </div>
                  <span className="text-xs font-mono text-foreground w-8 text-right">{f.count}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent Events */}
      <div className="rounded-lg border border-border bg-card">
        <div className="px-5 py-3 border-b border-border">
          <h2 className="text-sm font-bold text-foreground">Recent Events</h2>
        </div>
        <div className="divide-y divide-border max-h-[400px] overflow-y-auto">
          {events.slice(-50).reverse().map((e, i) => (
            <div key={i} className="px-5 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-0.5 rounded bg-secondary text-secondary-foreground font-mono">{e.type}</span>
                {e.label && <span className="text-xs text-muted-foreground">{e.label}</span>}
              </div>
              <span className="text-xs text-muted-foreground">{new Date(e.timestamp).toLocaleString()}</span>
            </div>
          ))}
          {events.length === 0 && (
            <p className="px-5 py-8 text-sm text-muted-foreground text-center">No events tracked yet</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default UsageDetail;
