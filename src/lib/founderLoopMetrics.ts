/**
 * Single source for founder validation / PMF snapshot (Dashboard + FounderLoopPreview).
 */
import {
  defaultPMFMetrics,
  getNextBestAction,
  ValidationMetrics,
  FunnelStep,
  PMFMetrics,
} from "@/lib/store";
import { computeVersionDiffs, getProjectData, ProjectData } from "@/lib/projectData";
import { computeFunnel, FunnelMetrics, getTrackingEvents } from "@/lib/trackingEvents";
import { hashAppUrl } from "@/lib/hashRoutes";

export interface FounderLoopSnapshot {
  data: ProjectData;
  vm: ValidationMetrics;
  tracked: FunnelMetrics;
  funnel: FunnelStep[];
  pm: PMFMetrics & { activationRate: number; retentionRate: number; conversionRate: number };
  pmfScore: number;
  pendingImprovements: number;
  testsReady: number;
  nba: ReturnType<typeof getNextBestAction>;
  shareUrl: string;
  needsUsers: boolean;
  needsImprove: boolean;
  visitorCount: number;
  engagementSignals: number;
}

export function getFounderLoopSnapshot(projectId: string): FounderLoopSnapshot {
  const data = getProjectData(projectId);

  const vm: ValidationMetrics = {
    surveys: data.surveys.length,
    feedback: data.feedback.length,
    priceIntent: data.surveys.filter((s) =>
      Object.values(s.answers).some(
        (a) =>
          a === "Yes" ||
          a === "Yes, definitely" ||
          a === "Probably yes" ||
          a === "$1–$9/mo" ||
          a === "$10–$29/mo" ||
          a === "$30+/mo"
      )
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

  const pmfScore = Math.min(
    100,
    Math.floor(
      vm.surveys * 1.5 +
        vm.emails * 2 +
        vm.feedback * 1.5 +
        vm.priceIntent * 5 +
        pm.activationRate * 0.3 +
        pm.retentionRate * 0.5 +
        pm.conversionRate * 1
    )
  );

  const { diffs } = computeVersionDiffs(projectId);
  const pendingImprovements = diffs.length;

  let testsReady = 0;
  for (let i = 1; i < funnel.length; i++) {
    const prev = funnel[i - 1].count;
    const rate = prev > 0 ? (funnel[i].count / prev) * 100 : 0;
    const bench = {
      "Tried Product": 10,
      "Signed Up": 30,
      "Used Product": 40,
      Returned: 30,
      "Paid / Pre-order": 10,
    } as Record<string, number>;
    if (rate < (bench[funnel[i].label] ?? 100)) testsReady++;
  }

  const nba = getNextBestAction(vm, pm, funnel);
  const shareUrl = hashAppUrl(`/p/${projectId}`);

  const events = getTrackingEvents(projectId);
  const marketplaceEngagement = events.filter((e) =>
    ["item_viewed", "item_clicked", "save_clicked", "buy_clicked"].includes(e.type),
  ).length;
  const engagementSignals = vm.surveys + vm.emails + vm.feedback + marketplaceEngagement;
  const outreach = data.shareOutreachCount ?? 0;
  const needsUsers = !(engagementSignals >= 5 && outreach >= 3);
  const needsImprove = pendingImprovements > 0 || testsReady > 0;

  return {
    data,
    vm,
    tracked,
    funnel,
    pm,
    pmfScore,
    pendingImprovements,
    testsReady,
    nba,
    shareUrl,
    needsUsers,
    needsImprove,
    visitorCount: tracked.visitors,
    engagementSignals,
  };
}
