import { toast } from "sonner";
import StatusBar from "@/components/StatusBar";
import NextBestAction from "@/components/NextBestAction";
import FunnelView from "@/components/FunnelView";
import MetricCard from "@/components/MetricCard";
import AICEOChat from "@/components/AICEOChat";
import { StartupProgressBar } from "@/components/StartupProgressBar";
import {
  defaultPMFMetrics,
  getNextBestAction, ValidationMetrics, FunnelStep
} from "@/lib/store";
import { getProjectData } from "@/lib/projectData";
import { computeFunnel } from "@/lib/trackingEvents";
import { useProjectId } from "@/hooks/useProject";
import { useNavigate } from "react-router-dom";
import { Users, UserPlus, TrendingUp, FlaskConical } from "lucide-react";

const Dashboard = () => {
  const projectId = useProjectId();
  const navigate = useNavigate();
  const data = getProjectData(projectId);
  const idea = localStorage.getItem("alize_idea") || "My Startup";
  const projectName = idea.split(" ").slice(0, 4).join(" ");

  const vm: ValidationMetrics = {
    surveys: data.surveys.length,
    feedback: data.feedback.length,
    priceIntent: data.surveys.filter((s) =>
      Object.values(s.answers).some((a) => a === "Yes" || a === "Yes, definitely" || a === "Probably yes" || a === "$1–$9/mo" || a === "$10–$29/mo" || a === "$30+/mo")
    ).length,
    emails: data.emails.length,
  };

  const tracked = computeFunnel(projectId);
  const funnel: FunnelStep[] = [
    { label: "Visitors", count: Math.max(tracked.visitors, 1) },
    { label: "Tried Product", count: tracked.usedProduct + tracked.surveyCompleted },
    { label: "Signed Up", count: tracked.emailEntered + tracked.accountCreated },
    { label: "Used Product", count: tracked.usedProduct },
    { label: "Returned", count: tracked.returnUsers },
    { label: "Paid / Pre-order", count: tracked.paid },
  ];

  const pm = {
    ...defaultPMFMetrics,
    activationRate: funnel[0].count > 0 ? Math.round((funnel[2].count / funnel[0].count) * 100) : 0,
    retentionRate: funnel[2].count > 0 ? Math.round((funnel[4].count / funnel[2].count) * 100) : 0,
    conversionRate: funnel[2].count > 0 ? Math.round((funnel[5].count / funnel[2].count) * 100) : 0,
  };

  const pmfScore = Math.min(100, Math.floor(
    vm.surveys * 1.5 + vm.emails * 2 + vm.feedback * 1.5 + vm.priceIntent * 5 +
    pm.activationRate * 0.3 + pm.retentionRate * 0.5 + pm.conversionRate * 1
  ));

  // Count weak funnel steps as "tests ready"
  let testsReady = 0;
  for (let i = 1; i < funnel.length; i++) {
    const prev = funnel[i - 1].count;
    const rate = prev > 0 ? (funnel[i].count / prev) * 100 : 0;
    const bench = { "Tried Product": 10, "Signed Up": 30, "Used Product": 40, "Returned": 30, "Paid / Pre-order": 10 } as Record<string, number>;
    if (rate < (bench[funnel[i].label] ?? 100)) testsReady++;
  }

  const nba = getNextBestAction(vm, pm, funnel);
  const shareUrl = window.location.origin + `/p/${projectId}`;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <StartupProgressBar currentStep={data.publishedAt ? 4 : data.surveys.length > 0 ? 3 : 2} />

      <h2 className="text-xl font-bold text-foreground">{projectName} — Decision Dashboard</h2>

      {/* PMF Progress */}
      <div className="rounded-lg border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-foreground" />
            <h3 className="text-sm font-bold text-foreground">PMF Progress</h3>
          </div>
          {pmfScore > 0 && <span className="text-xs text-[hsl(var(--success))] font-semibold">Score based on real data</span>}
        </div>
        <div className="flex items-end gap-3 mb-3">
          <span className="text-4xl font-bold text-foreground">{pmfScore}</span>
          <span className="text-sm text-muted-foreground mb-1">/ 100</span>
        </div>
        <div className="w-full h-2.5 rounded-full bg-secondary overflow-hidden mb-4">
          <div className="h-full rounded-full bg-foreground transition-all" style={{ width: `${pmfScore}%` }} />
        </div>
        <div className="space-y-1.5 mb-3">
          <p className="text-xs font-semibold text-muted-foreground">Data sources</p>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{vm.surveys} survey responses</span>
            <span className="text-foreground font-semibold">+{Math.floor(vm.surveys * 1.5)}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{vm.emails} emails captured</span>
            <span className="text-foreground font-semibold">+{vm.emails * 2}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{vm.feedback} feedback entries</span>
            <span className="text-foreground font-semibold">+{Math.floor(vm.feedback * 1.5)}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{vm.priceIntent} price intent signals</span>
            <span className="text-foreground font-semibold">+{vm.priceIntent * 5}</span>
          </div>
        </div>
        <div className="pt-3 border-t border-border">
          <p className="text-xs font-semibold text-muted-foreground mb-1">Next biggest opportunity</p>
          <p className="text-xs text-foreground">{nba.detail}</p>
        </div>
      </div>

      <StatusBar validation={vm} pmf={pm} />
      <NextBestAction
        action={nba.action}
        detail={nba.detail}
        nextStep={nba.nextStep}
        expectedImpact={nba.expectedImpact}
        testName={nba.action !== "You're crushing it!" ? nba.action : undefined}
        projectId={projectId}
      />

      {/* Product Funnel with Tests Ready badge */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          {testsReady > 0 && (
            <button
              onClick={() => navigate(`/tests/${projectId}`)}
              className="flex items-center gap-2 text-sm font-semibold text-foreground bg-primary/10 hover:bg-primary/20 border border-primary/30 px-4 py-2 rounded-lg transition-colors"
            >
              <FlaskConical className="w-4 h-4" />
              {testsReady} Tests Ready — Run Now →
            </button>
          )}
        </div>
        <FunnelView funnel={funnel} />
      </div>

      {/* Validation Metrics */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Validation — Do People Want This?
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard label="Surveys / Interviews" value={vm.surveys} target={40} clickable />
          <MetricCard label="Feedback" value={vm.feedback} target={40} clickable />
          <MetricCard label="Price Intent" value={vm.priceIntent} target={3} clickable />
          <MetricCard label="Emails" value={vm.emails} clickable />
        </div>
      </div>

      {/* PMF Metrics */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Product Market Fit — Do People Use This?
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <MetricCard label="Activation Rate" value={pm.activationRate} target={40} suffix="%" clickable />
          <MetricCard label="Retention Rate" value={pm.retentionRate} target={20} suffix="%" clickable />
          <MetricCard label="Conversion Rate" value={pm.conversionRate} target={5} suffix="%" clickable />
          <MetricCard label="Usage" value={pm.usage} clickable />
          <MetricCard label="Drop-off" value={pm.dropOff} suffix="%" clickable />
          <MetricCard label="Avg Time on Product" value={pm.timeOnProduct} suffix=" min" clickable />
        </div>
      </div>

      {/* Friends */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-lg border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-foreground" />
            <h3 className="text-sm font-semibold text-foreground">Friends</h3>
          </div>
          <p className="text-sm text-muted-foreground">Share your survey link with 10 friends who match your target audience.</p>
          <button onClick={() => { navigator.clipboard.writeText(shareUrl); toast.success("Survey link copied!"); }} className="mt-3 text-xs font-medium text-foreground hover:underline">Copy Survey Link →</button>
        </div>
        <div className="rounded-lg border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-2">
            <UserPlus className="w-4 h-4 text-foreground" />
            <h3 className="text-sm font-semibold text-foreground">Friends of Friends</h3>
          </div>
          <p className="text-sm text-muted-foreground">Ask your friends to forward the survey to 3 people each. Warm referrals convert 3× better.</p>
          <button onClick={() => { navigator.clipboard.writeText("Hey! My friend is building something new and needs honest feedback. Quick 5-min survey: " + shareUrl); toast.success("Referral message copied!"); }} className="mt-3 text-xs font-medium text-foreground hover:underline">Copy Referral Message →</button>
        </div>
      </div>

      {/* AI CEO Chat — larger */}
      <AICEOChat />
    </div>
  );
};

export default Dashboard;
