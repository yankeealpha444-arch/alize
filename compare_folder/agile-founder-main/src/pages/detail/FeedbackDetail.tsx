import { useNavigate } from "react-router-dom";
import { ArrowLeft, MessageSquare } from "lucide-react";
import { useProjectId } from "@/hooks/useProject";
import { getProjectData } from "@/lib/projectData";

const FeedbackDetail = () => {
  const projectId = useProjectId();
  const data = getProjectData(projectId);
  const navigate = useNavigate();
  const feedback = data.feedback;

  // AI summary: group by common themes (simple keyword match)
  const themes: Record<string, number> = {};
  feedback.forEach((f) => {
    const text = (f.comment || "").toLowerCase();
    const words = text.split(/\s+/).filter((w) => w.length > 4);
    words.forEach((w) => { themes[w] = (themes[w] || 0) + 1; });
  });
  const topThemes = Object.entries(themes)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const avgRating = feedback.length > 0
    ? (feedback.reduce((s, f) => s + (f.rating || 0), 0) / feedback.filter(f => f.rating).length).toFixed(1)
    : "—";

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </button>

      <div className="flex items-center gap-3">
        <MessageSquare className="w-5 h-5 text-foreground" />
        <h1 className="text-xl font-bold text-foreground">Feedback ({feedback.length})</h1>
      </div>

      {/* AI Summary */}
      <div className="rounded-lg border border-border bg-card p-5 space-y-3">
        <h2 className="text-sm font-bold text-foreground">AI Summary</h2>
        {feedback.length === 0 ? (
          <p className="text-sm text-muted-foreground">No feedback collected yet. Share your MVP to start getting feedback.</p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">Average rating: <span className="text-foreground font-semibold">{avgRating}/5</span></p>
            {topThemes.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground">Most mentioned topics</p>
                {topThemes.map(([word, count]) => (
                  <div key={word} className="flex items-center justify-between text-xs">
                    <span className="text-foreground capitalize">"{word}"</span>
                    <span className="text-muted-foreground">mentioned {count}×</span>
                  </div>
                ))}
              </div>
            )}
            <div className="pt-2 border-t border-border">
              <p className="text-xs text-muted-foreground">
                {feedback.length < 10
                  ? `Need ${10 - feedback.length} more responses for stronger insights. Target: 40.`
                  : feedback.length < 40
                  ? `Good progress. ${40 - feedback.length} more to reach validation target of 40.`
                  : "✓ Validation target reached. Review themes to prioritize fixes."}
              </p>
            </div>
          </>
        )}
      </div>

      {/* Raw Evidence */}
      <div className="rounded-lg border border-border bg-card">
        <div className="px-5 py-3 border-b border-border">
          <h2 className="text-sm font-bold text-foreground">All Feedback (Raw Evidence)</h2>
        </div>
        {feedback.length === 0 ? (
          <p className="px-5 py-8 text-sm text-muted-foreground text-center">No feedback yet</p>
        ) : (
          <div className="divide-y divide-border">
            {feedback.slice().reverse().map((f, i) => (
              <div key={i} className="px-5 py-3 space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {f.emoji && <span className="text-lg">{f.emoji}</span>}
                    {f.rating && (
                      <span className="text-xs font-mono text-foreground">{f.rating}/5</span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(f.timestamp).toLocaleDateString()}
                  </span>
                </div>
                {f.comment && (
                  <p className="text-sm text-foreground">"{f.comment}"</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FeedbackDetail;
