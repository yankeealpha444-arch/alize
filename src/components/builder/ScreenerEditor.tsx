import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";

interface ScreenerEditorProps {
  projectName: string;
}

export default function ScreenerEditor({ projectName }: ScreenerEditorProps) {
  const [copied, setCopied] = useState(false);
  const shareUrl = `${window.location.origin}/builder`;

  const screenerText = `Hi! I'm building ${projectName} and I'd love your honest feedback.

It takes about 2 minutes. You'll get to try the product and answer a few quick questions.

Here's what I'm trying to figure out:
- Is this problem real for you?
- Would you actually use something like this?
- What would make it better?

No sales pitch, no BS — just trying to build something people actually want.

👉 Try it here: ${shareUrl}

Thanks! 🙏`;

  const screenerQuestions = [
    "Have you experienced [the problem this product solves]?",
    "How are you currently dealing with it?",
    "Would you try a new product that solves this?",
    "What would make you switch from your current solution?",
    "Can I send you the link to try it? (takes 2 min)",
  ];

  const handleCopy = () => {
    navigator.clipboard.writeText(screenerText);
    setCopied(true);
    toast.success("Screener copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="text-foreground space-y-6 p-6">
      <div>
        <h2 className="text-lg font-semibold">Screener for {projectName}</h2>
        <p className="text-xs text-muted-foreground mt-1">Copy and share this message to recruit testers</p>
      </div>

      {/* Copyable screener message */}
      <div className="relative">
        <div className="p-4 rounded-lg border border-border bg-card">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-2">Screener Message — Ready to Copy</p>
          <pre className="text-sm whitespace-pre-wrap font-sans text-foreground/90 leading-relaxed">{screenerText}</pre>
        </div>
        <button
          onClick={handleCopy}
          className="absolute top-3 right-3 flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-border bg-secondary hover:bg-secondary/80 transition-colors"
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      {/* Screener questions */}
      <div>
        <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-3">Screening Questions</p>
        <div className="space-y-2">
          {screenerQuestions.map((q, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card">
              <span className="text-xs text-muted-foreground font-mono mt-0.5">{i + 1}.</span>
              <p className="text-sm">{q}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Where to share */}
      <div>
        <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-3">Where to Share</p>
        <div className="grid grid-cols-2 gap-2">
          {["Reddit communities", "Twitter / X", "Facebook groups", "LinkedIn", "Discord servers", "Friends & family", "Slack communities", "Email contacts"].map((place) => (
            <div key={place} className="flex items-center gap-2 p-2 rounded-md border border-border bg-card text-xs">
              <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50" />
              {place}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
