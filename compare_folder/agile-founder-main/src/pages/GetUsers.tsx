import { Users, Copy, Check, Target, ArrowRight } from "lucide-react";
import { useState } from "react";
import { useProjectId } from "@/hooks/useProject";
import { getProjectData } from "@/lib/projectData";

const GetUsers = () => {
  const projectId = useProjectId();
  const [copied, setCopied] = useState<number | null>(null);
  const shareUrl = `${window.location.origin}/p/${projectId}`;
  const idea = localStorage.getItem("alize_idea") || "My Startup";
  const data = getProjectData(projectId);

  const totalSurveys = data.surveys?.length || 0;
  const totalEmails = data.emails?.length || 0;
  const totalUsers = totalSurveys + totalEmails;
  const goal = 40;
  const progress = Math.min(100, Math.round((totalUsers / goal) * 100));

  const steps = [
    { step: 1, label: "Share with 10 friends", desc: "Send to people who match your target audience", message: `Hey! I'm building something new and need honest feedback. Can you take a 5-min survey? ${shareUrl}` },
    { step: 2, label: "Ask friends to forward", desc: "Each friend forwards to 3 people they know", message: `Hey! My friend is building ${idea}. They're looking for feedback from people like you. Quick 5-min survey: ${shareUrl}` },
    { step: 3, label: "Post in communities", desc: "Share in relevant Slack groups, Reddit, Discord, or Facebook groups", message: `I'm looking for people who struggle with ${idea.toLowerCase()}. I'm building a solution and need beta testers. Takes 5 minutes, and you'll get early access. ${shareUrl}` },
    { step: 4, label: "Direct message people", desc: "DM 20 people on Twitter/LinkedIn who fit your audience", message: `Hi! I noticed you're interested in ${idea.toLowerCase()}. I'm building a tool to help with this — would love your input. 5 min survey: ${shareUrl}` },
  ];

  const handleCopy = (val: string, i: number) => {
    navigator.clipboard.writeText(val);
    setCopied(i);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
          <Users className="w-5 h-5 text-foreground" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">Get Users</h2>
          <p className="text-sm text-muted-foreground">Get your first {goal} users or survey responses</p>
        </div>
      </div>

      {/* Goal progress */}
      <div className="rounded-xl border border-border bg-card p-4 mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Target className="w-4 h-4 text-primary shrink-0" />
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-semibold text-foreground">{totalUsers} / {goal} users</span>
              <span className="text-xs text-muted-foreground">{progress}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-secondary overflow-hidden">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground">
          {totalUsers < goal
            ? `You need ${goal - totalUsers} more users to have enough data for meaningful validation.`
            : "✓ You have enough users! Check your Dashboard for results."}
        </p>
      </div>

      {/* Share link */}
      <div className="rounded-lg border border-border bg-card p-4 mb-6">
        <p className="text-xs font-semibold text-foreground mb-2">Your public link</p>
        <div className="flex gap-2">
          <div className="flex-1 bg-secondary rounded px-3 py-2 text-xs font-mono text-muted-foreground truncate">{shareUrl}</div>
          <button onClick={() => handleCopy(shareUrl, -1)} className="text-xs font-medium text-foreground bg-secondary px-3 py-2 rounded hover:bg-secondary/70 transition-colors shrink-0">
            {copied === -1 ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Steps */}
      <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-3">Recommended actions</p>
      <div className="space-y-3 mb-8">
        {steps.map((s, i) => (
          <div key={s.step} className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-foreground">{s.step}</span>
              <p className="text-sm font-semibold text-foreground">{s.label}</p>
            </div>
            <p className="text-xs text-muted-foreground mb-3">{s.desc}</p>
            <div className="bg-secondary rounded p-2 text-xs font-mono text-muted-foreground">{s.message}</div>
            <button
              onClick={() => handleCopy(s.message, i)}
              className="mt-2 flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
            >
              {copied === i ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {copied === i ? "Copied!" : "Copy Message"}
            </button>
          </div>
        ))}
      </div>

      {/* AI guide */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm">🤖</span>
          <p className="text-sm font-semibold text-foreground">Alizé Guide</p>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Your goal is {goal} users or {goal} survey responses. Tell me what audience you want to reach and I'll guide you step by step to get them. Start with friends, then expand to communities and direct outreach.
        </p>
        <button className="mt-3 flex items-center gap-1.5 text-xs font-medium text-primary hover:underline">
          Get personalized advice <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};

export default GetUsers;
