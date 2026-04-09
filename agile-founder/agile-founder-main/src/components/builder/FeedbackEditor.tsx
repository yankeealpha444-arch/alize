import { X } from "lucide-react";

interface FeedbackEditorProps {
  projectName: string;
}

const feedbackPrompts = [
  { trigger: "After signup", question: "What made you sign up today?", type: "open", note: "Appears as popup right after account creation" },
  { trigger: "After first use", question: "How was your first experience?", type: "emoji", options: ["😞", "😐", "🙂", "😊", "🤩"], note: "Shows after first core feature interaction" },
  { trigger: "After core feature", question: "Did the main feature work as you expected?", type: "choice", options: ["Yes, exactly", "Mostly", "Not really", "No"], note: "Triggers when user completes main action" },
  { trigger: "Day 3 return", question: "What brought you back?", type: "open", note: "Appears on user's third session" },
  { trigger: "Day 7 check-in", question: "Would you miss this product if it disappeared?", type: "choice", options: ["Definitely", "Probably", "Not sure", "No"], note: "Key PMF indicator question" },
  { trigger: "Before churn", question: "What would make you stay?", type: "open", note: "Shows when user hasn't returned in 5+ days" },
];

export default function FeedbackEditor({ projectName }: FeedbackEditorProps) {
  return (
    <div className="text-foreground space-y-5 p-6">
      <div>
        <h2 className="text-lg font-semibold">In-Product Feedback</h2>
        <p className="text-xs text-muted-foreground mt-1">These appear as popups inside {projectName} at key moments — not on a separate page</p>
      </div>

      {/* Visual example */}
      <div className="p-4 rounded-xl border border-dashed border-border bg-secondary/10">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-3">How it looks to users ↓</p>
        <div className="max-w-xs mx-auto rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold">Quick question</p>
            <X className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <p className="text-xs text-muted-foreground mb-3">How was your first experience?</p>
          <div className="flex gap-1.5 mb-2">
            {["😞", "😐", "🙂", "😊", "🤩"].map((e) => (
              <button key={e} className="text-lg p-1.5 rounded-lg border border-border hover:bg-secondary flex-1">{e}</button>
            ))}
          </div>
          <button className="w-full bg-foreground text-background py-1.5 rounded-lg text-xs font-medium mt-1">Send</button>
        </div>
        <p className="text-[9px] text-muted-foreground text-center mt-2">Small popup · Not a full page · Appears at the right moment</p>
      </div>

      {/* All feedback triggers */}
      <div>
        <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-3">All feedback triggers</p>
        {feedbackPrompts.map((item, i) => (
          <div key={i} className="p-4 rounded-lg border border-border bg-card mb-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground font-medium">{item.trigger}</span>
              <span className="text-[9px] text-muted-foreground">· {item.note}</span>
            </div>
            <p className="text-sm font-medium mb-3">{item.question}</p>

            {item.type === "emoji" && item.options && (
              <div className="flex gap-2">
                {item.options.map((e) => (
                  <button key={e} className="text-lg p-2 rounded-lg border border-border hover:bg-secondary">{e}</button>
                ))}
              </div>
            )}
            {item.type === "choice" && item.options && (
              <div className="flex flex-wrap gap-2">
                {item.options.map((opt) => (
                  <span key={opt} className="text-xs px-3 py-1.5 rounded-md border border-border bg-secondary/50">{opt}</span>
                ))}
              </div>
            )}
            {item.type === "open" && (
              <textarea className="w-full px-3 py-2 rounded-lg border border-border bg-secondary/50 text-sm resize-none" rows={2} placeholder="User's response..." readOnly />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
