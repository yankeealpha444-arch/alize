import { Users, Copy, Check, Target, MessageCircle, Mail } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useProjectId } from "@/hooks/useProject";
import { getProjectData, incrementShareOutreach } from "@/lib/projectData";
import { computeFunnel } from "@/lib/trackingEvents";
import { hashAppUrl } from "@/lib/hashRoutes";
import { sanitizeIdeaForPersistence } from "@/lib/mvp/ideaContentSafety";

const SHARE_GOAL = 10;

const GetUsers = () => {
  const projectId = useProjectId();
  const [copied, setCopied] = useState(false);
  const shareUrl = hashAppUrl(`/p/${projectId}`);
  const idea = sanitizeIdeaForPersistence(localStorage.getItem("alize_idea") || "") || "My Startup";
  const data = getProjectData(projectId);
  const tracked = computeFunnel(projectId);

  const totalSurveys = data.surveys?.length || 0;
  const totalEmails = data.emails?.length || 0;
  const outreach = data.shareOutreachCount ?? 0;
  const visitors = tracked.visitors;
  const totalUsers = totalSurveys + totalEmails;
  const validationGoal = 40;
  const progress = Math.min(100, Math.round((totalUsers / validationGoal) * 100));
  const shareProgress = Math.min(100, Math.round((outreach / SHARE_GOAL) * 100));

  const recordShare = (label: string) => {
    incrementShareOutreach(projectId, 1);
    const n = getProjectData(projectId).shareOutreachCount ?? 0;
    toast.success(`${label} — outreach actions: ${n}`);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    recordShare("Link copied");
  };

  const shareText = `Check out what I'm building: ${shareUrl}`;
  const waUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
  const emailUrl = `mailto:?subject=${encodeURIComponent(`Feedback on ${idea.slice(0, 40)}`)}&body=${encodeURIComponent(shareText)}`;

  const handleMessenger = () => {
    navigator.clipboard.writeText(shareUrl);
    recordShare("Messenger (link copied — paste in app)");
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
          <Users className="w-5 h-5 text-foreground" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">Get Users</h2>
          <p className="text-sm text-muted-foreground">Share with 10 people, then watch the dashboard for signal.</p>
        </div>
      </div>

      <p className="text-xs text-muted-foreground mb-4">
        You are here: <span className="text-foreground font-medium">Get Users</span>. Next: copy or share, then return to the dashboard when you have replies.
      </p>

      {/* Tracking */}
      <div className="rounded-xl border border-border bg-card p-4 mb-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Shared (outreach)</p>
          <p className="text-2xl font-bold text-foreground">{outreach}</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Visitors</p>
          <p className="text-2xl font-bold text-foreground">{visitors}</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Signups / surveys</p>
          <p className="text-2xl font-bold text-foreground">{totalUsers}</p>
        </div>
      </div>

      {/* Share goal */}
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Target className="w-4 h-4 text-primary shrink-0" />
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-semibold text-foreground">Goal: share with {SHARE_GOAL} people</span>
              <span className="text-xs text-muted-foreground">{shareProgress}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-secondary overflow-hidden">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${shareProgress}%` }} />
            </div>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground">
          Each share button below records one outreach action (mock counter). Aim for {SHARE_GOAL} before optimizing the MVP again.
        </p>
      </div>

      {/* Quick share */}
      <div className="rounded-lg border border-border bg-card p-4 mb-6">
        <p className="text-xs font-semibold text-foreground mb-3">Share</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleCopyLink}
            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border border-border hover:bg-secondary transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            Copy link
          </button>
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => { recordShare("WhatsApp"); }}
            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border border-border hover:bg-secondary transition-colors"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            WhatsApp
          </a>
          <button
            type="button"
            onClick={handleMessenger}
            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border border-border hover:bg-secondary transition-colors"
          >
            Messenger
          </button>
          <a
            href={emailUrl}
            onClick={() => recordShare("Email")}
            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border border-border hover:bg-secondary transition-colors"
          >
            <Mail className="w-3.5 h-3.5" />
            Email
          </a>
        </div>
      </div>

      {/* Validation progress (existing) */}
      <div className="rounded-xl border border-border bg-card p-4 mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Target className="w-4 h-4 text-foreground shrink-0" />
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-semibold text-foreground">{totalUsers} / {validationGoal} responses</span>
              <span className="text-xs text-muted-foreground">{progress}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-secondary overflow-hidden">
              <div className="h-full rounded-full bg-foreground/80 transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground">
          {totalUsers < validationGoal
            ? `Collect ${validationGoal - totalUsers} more responses for strong validation.`
            : "You have enough responses to trust the dashboard metrics."}
        </p>
      </div>

      <p className="text-[10px] text-muted-foreground">
        Tip: paste the link in DMs, Slack, or communities your buyers already use.
      </p>
    </div>
  );
};

export default GetUsers;