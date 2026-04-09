export default function TrackingView() {
  const events = [
    { event: "page_view", desc: "Every page visited" },
    { event: "signup", desc: "User creates account" },
    { event: "onboarding_complete", desc: "Finished onboarding flow" },
    { event: "feature_used", desc: "Core feature interaction" },
    { event: "session_start", desc: "New session begins" },
    { event: "session_end", desc: "Session ends" },
    { event: "time_on_product", desc: "Duration per session" },
    { event: "drop_off", desc: "User leaves without completing" },
    { event: "return_visit", desc: "User comes back" },
    { event: "feedback_submitted", desc: "User submits feedback" },
    { event: "survey_completed", desc: "User finishes survey" },
    { event: "share_referral", desc: "User shares or refers" },
    { event: "pricing_viewed", desc: "Pricing page opened" },
    { event: "conversion", desc: "Pre-order or payment" },
    { event: "email_captured", desc: "Email collected" },
    { event: "chatbot_interaction", desc: "Chatbot conversation" },
  ];

  return (
    <div className="text-foreground space-y-4 p-6">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Automatic Tracking</h2>
        <p className="text-xs text-muted-foreground mt-1">These events are tracked automatically · No setup needed</p>
      </div>

      <div className="space-y-1.5">
        {events.map((e) => (
          <div key={e.event} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60" />
              <span className="text-xs font-mono text-foreground">{e.event}</span>
            </div>
            <span className="text-[11px] text-muted-foreground">{e.desc}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
