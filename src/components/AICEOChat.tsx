import { useState } from "react";
import { Send, BrainCircuit } from "lucide-react";

const presetResponses = [
  "Based on your current data, I recommend reaching out to 5 more communities on Reddit related to your target audience.",
  "Your survey completion rate is low. Try shortening it to 5 questions max and adding a stronger hook in the first question.",
  "Consider posting a job on Airtasker to find beta testers. I can generate the job description for you.",
  "Your activation rate needs work. Most users drop off after sign-up. Add a guided onboarding flow.",
  "Focus on getting 40 survey responses first. That's your validation threshold. Share the link in 3 communities today.",
  "Your price intent is low. Try showing pricing earlier in the flow so users self-select. Run a pricing test from the Tests page.",
  "Users who give feedback are 3× more likely to become paying customers. Make the feedback form more visible on your MVP.",
];

const AICEOChat = () => {
  const [messages, setMessages] = useState<Array<{ role: "user" | "ai"; text: string }>>([
    { role: "ai", text: "I'm your AI CEO Guide. I can help you decide:\n\n• **What should I fix first?**\n• **Why are users dropping off?**\n• **What test should I run?**\n• **Should I change pricing?**\n• **Do I have product market fit yet?**\n\nAsk me anything about growing your product." },
  ]);
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (!input.trim()) return;
    const newMessages = [...messages, { role: "user" as const, text: input }];
    const response = presetResponses[Math.floor(Math.random() * presetResponses.length)];
    newMessages.push({ role: "ai", text: response });
    setMessages(newMessages);
    setInput("");
  };

  return (
    <div className="rounded-lg border border-border bg-card flex flex-col h-[500px]">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <BrainCircuit className="w-5 h-5 text-primary" />
        <h3 className="text-sm font-bold text-foreground">AI CEO Guide — What Should I Do Next?</h3>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-lg px-4 py-3 text-sm whitespace-pre-wrap ${
              msg.role === "user"
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground"
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
      </div>
      <div className="p-4 border-t border-border flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Ask: What should I fix first? Why are users dropping off?"
          className="flex-1 bg-secondary rounded-md px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary"
        />
        <button onClick={handleSend} className="p-2.5 rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-opacity">
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default AICEOChat;
