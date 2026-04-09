import { Share2, Copy, Check } from "lucide-react";
import { useState } from "react";
import { setPublished } from "@/lib/projectData";
import { useProjectId } from "@/hooks/useProject";
import { toast } from "sonner";

const Publish = () => {
  const projectId = useProjectId();
  const [copied, setCopied] = useState<number | null>(null);
  const [published, setPublishedState] = useState(false);
  const baseUrl = window.location.origin;
  const idea = localStorage.getItem("alize_idea") || "My Startup";

  const links = [
    { label: "Public MVP Link (share with customers)", value: `${baseUrl}/p/${projectId}` },
    { label: "Builder Link (for you only)", value: `${baseUrl}/builder/${projectId}` },
    { label: "Screener Text", value: `We're looking for people who struggle with ${idea.toLowerCase()}. We're building a solution and need your feedback. Takes 5 minutes. ${baseUrl}/p/${projectId}` },
    { label: "Friend Message", value: `Hey! I'm building something new and would love your feedback. Can you take a 5-minute survey? ${baseUrl}/p/${projectId}` },
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
          <h2 className="text-xl font-bold text-foreground">Publish & Share</h2>
          <p className="text-sm text-muted-foreground">Share your MVP with the world</p>
        </div>
      </div>

      <div className="flex gap-3 mb-6">
        {!published && (
          <button
            onClick={handlePublish}
            className="rounded-lg bg-foreground text-background px-4 py-3 text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            Publish MVP
          </button>
        )}
        <button
          onClick={() => window.open(`/p/${projectId}`, "_blank")}
          className="rounded-lg border border-border px-4 py-3 text-sm font-medium text-foreground hover:bg-secondary transition-colors"
        >
          Preview MVP
        </button>
        <button
          onClick={() => {
            navigator.clipboard.writeText(`${baseUrl}/p/${projectId}`);
            toast.success("Public link copied!");
          }}
          className="rounded-lg border border-border px-4 py-3 text-sm font-medium text-foreground hover:bg-secondary transition-colors"
        >
          Copy Public Link
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
