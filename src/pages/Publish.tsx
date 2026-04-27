// AI SAFE FILE
// UI LOCKED
// DO NOT MODIFY LAYOUT, STYLE, STRUCTURE, ROUTES, COPY, OR TEMPLATE
// ONLY FIX THE SPECIFIC REQUESTED LOGIC
// UI changes require: "UI change approved"

import { Share2, Copy, Check } from "lucide-react";
import { useState } from "react";
import { setPublished } from "@/lib/projectData";
import { useProjectId } from "@/hooks/useProject";
import { toast } from "sonner";
import { hashAppUrl } from "@/lib/hashRoutes";
import { sanitizeIdeaForPersistence } from "@/lib/mvp/ideaContentSafety";

const Publish = () => {
  const projectId = useProjectId();
  const [copied, setCopied] = useState<number | null>(null);
  const [published, setPublishedState] = useState(false);
  const idea = sanitizeIdeaForPersistence(localStorage.getItem("alize_idea") || "") || "My Startup";
  const publicMvpUrl = hashAppUrl(`/p/${projectId}`);
  const builderUrl = hashAppUrl(`/builder/${projectId}`);

  const links = [
    { label: "Public link (share with customers)", value: publicMvpUrl },
    { label: "Builder link (founder only)", value: builderUrl },
    { label: "Screener text", value: `We're looking for people who struggle with ${idea.toLowerCase()}. We're building a solution and need your feedback. Takes 5 minutes. ${publicMvpUrl}` },
    { label: "Friend message", value: `Hey! I'm building something new and would love your feedback. Can you take a 5-minute survey? ${publicMvpUrl}` },
    { label: "Instructions", value: `1. Share the screener on communities\n2. Direct interested people to the Public MVP link\n3. Users interact with your product and leave feedback\n4. Track everything on your founder dashboard` },
  ];

  const handleCopy = (val: string, i: number) => {
    navigator.clipboard.writeText(val);
    setCopied(i);
    setTimeout(() => setCopied(null), 2000);
  };

  const handlePublish = () => {
    setPublished(projectId);
    setPublishedState(true);
    toast.success("MVP published! Share your links below.");
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
          <Share2 className="w-5 h-5 text-foreground" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">Publish & share</h2>
          <p className="text-sm text-muted-foreground">Mark published, then open the public page or copy the link</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        {!published && (
          <button
            type="button"
            onClick={handlePublish}
            className="rounded-lg bg-foreground text-background px-4 py-3 text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            Mark MVP published
          </button>
        )}
        <button
          type="button"
          onClick={() => window.open(publicMvpUrl, "_blank", "noopener,noreferrer")}
          className="rounded-lg border border-border px-4 py-3 text-sm font-medium text-foreground hover:bg-secondary transition-colors"
        >
          Open public MVP
        </button>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(publicMvpUrl);
            toast.success("Public link copied!");
          }}
          className="rounded-lg border border-border px-4 py-3 text-sm font-medium text-foreground hover:bg-secondary transition-colors"
        >
          Copy public link
        </button>
      </div>

      {published && (
        <div className="mb-6 p-4 rounded-lg border border-border bg-card">
          <p className="text-sm font-medium text-foreground">✓ Your MVP is live! Share the links below.</p>
        </div>
      )}

      <div className="space-y-3">
        {links.map((link, i) => (
          <div key={link.label} className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-foreground">{link.label}</p>
              <button
                onClick={() => handleCopy(link.value, i)}
                className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
              >
                {copied === i ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copied === i ? "Copied!" : "Copy"}
              </button>
            </div>
            <pre className="text-xs font-mono text-muted-foreground whitespace-pre-wrap bg-secondary rounded p-2">
              {link.value}
            </pre>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Publish;
