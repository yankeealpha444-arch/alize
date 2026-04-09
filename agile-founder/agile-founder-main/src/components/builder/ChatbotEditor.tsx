interface ChatbotEditorProps {
  projectName: string;
}

export default function ChatbotEditor({ projectName }: ChatbotEditorProps) {
  return (
    <div className="text-foreground space-y-5 p-6">
      <div>
        <h2 className="text-lg font-semibold">In-Product Chatbot</h2>
        <p className="text-xs text-muted-foreground mt-1">This chatbot lives inside {projectName} — it helps users onboard, give feedback, and get support</p>
      </div>

      {/* Live preview */}
      <div className="p-4 rounded-xl border border-dashed border-border bg-secondary/10">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-3">How it looks inside the product ↓</p>
        <div className="max-w-xs mx-auto rounded-xl border border-border bg-card overflow-hidden shadow-sm">
          {/* Chat header */}
          <div className="px-4 py-3 border-b border-border bg-secondary/30">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-foreground/10 flex items-center justify-center text-[10px]">🤖</div>
              <div>
                <p className="text-xs font-semibold">{projectName} Assistant</p>
                <p className="text-[9px] text-muted-foreground">Online · Ready to help</p>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="p-3 space-y-3 max-h-[300px]">
            <div className="bg-secondary/50 rounded-lg rounded-tl-none p-3 max-w-[85%]">
              <p className="text-xs leading-relaxed">Hi! 👋 Welcome to {projectName}. I'm here to help you get started. What would you like to do?</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {["Set up my account", "See how it works", "Give feedback", "Ask a question"].map((opt) => (
                <button key={opt} className="text-[10px] px-2.5 py-1.5 rounded-md border border-border bg-card hover:bg-secondary">{opt}</button>
              ))}
            </div>
          </div>

          {/* Input */}
          <div className="px-3 py-2 border-t border-border">
            <div className="flex gap-2">
              <input placeholder="Type a message..." className="flex-1 px-3 py-2 rounded-lg border border-border bg-secondary/50 text-xs" readOnly />
              <button className="bg-foreground text-background px-3 py-2 rounded-lg text-xs">Send</button>
            </div>
          </div>
        </div>
        <p className="text-[9px] text-muted-foreground text-center mt-2">Floating chat widget · Bottom-right corner of the product</p>
      </div>

      {/* All chatbot messages */}
      <div>
        <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-3">Chatbot conversation flow</p>
        {[
          { label: "Welcome", trigger: "First visit", text: `Hi! 👋 Welcome to ${projectName}. I'm here to help you get started. What would you like to do?`, actions: ["Set up my account", "See how it works", "Give feedback", "Ask a question"] },
          { label: "Onboarding help", trigger: "During setup", text: `Let me walk you through the main features. ${projectName} helps you organize and track everything in one place. Want me to show you the dashboard?`, actions: ["Show me", "I'll explore on my own"] },
          { label: "Feature guide", trigger: "First feature use", text: "Great job! You just used the core feature. Here are some tips to get the most out of it:", actions: ["Show tips", "I'm good"] },
          { label: "Feedback prompt", trigger: "After 3 minutes", text: "How's your experience so far? Your honest feedback helps us improve.", actions: ["Love it", "It's okay", "Needs work", "Write feedback"] },
          { label: "Support", trigger: "User asks question", text: "I'll make sure the team sees your message. In the meantime, here are some common answers:", actions: ["FAQ", "Contact team", "Report bug"] },
          { label: "Return visit", trigger: "User comes back", text: `Welcome back! 🙌 We've made some improvements since your last visit. Want to see what's new?`, actions: ["Show updates", "Continue where I left off"] },
        ].map((msg, i) => (
          <div key={i} className="p-4 rounded-lg border border-border bg-card mb-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold">{msg.label}</span>
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">{msg.trigger}</span>
            </div>
            <div className="bg-secondary/30 rounded-lg p-3 mb-2">
              <p className="text-sm leading-relaxed">{msg.text}</p>
            </div>
            {msg.actions && (
              <div className="flex flex-wrap gap-1.5">
                {msg.actions.map((a) => (
                  <span key={a} className="text-[10px] px-2.5 py-1 rounded-md border border-border bg-secondary/50">{a}</span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
