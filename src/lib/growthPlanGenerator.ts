/**
 * Rule-based growth plan for growth_tool MVP (no external AI required).
 */

export type GrowthPlatform = "youtube" | "tiktok" | "instagram" | "other";
export type GrowthGoal = "views" | "subscribers" | "monetization" | "engagement";

export interface GrowthPlanInput {
  idea: string;
  channelName: string;
  platform: GrowthPlatform;
  goal: GrowthGoal;
}

export interface GrowthPlanOutput {
  contentIdeas: string[];
  weeklyPlan: Array<{ day: string; focus: string }>;
  experiments: string[];
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function platformLabel(p: GrowthPlatform): string {
  switch (p) {
    case "youtube":
      return "YouTube";
    case "tiktok":
      return "TikTok";
    case "instagram":
      return "Instagram";
    default:
      return "your platform";
  }
}

function goalHint(goal: GrowthGoal): string {
  switch (goal) {
    case "views":
      return "titles and thumbnails that earn clicks";
    case "subscribers":
      return "strong hooks and clear subscribe CTAs";
    case "monetization":
      return "audience trust and clear offers";
    case "engagement":
      return "comments, retention, and community replies";
    default:
      return "consistent publishing";
  }
}

export function generateGrowthPlan(input: GrowthPlanInput): GrowthPlanOutput {
  const name = input.channelName.trim() || "your channel";
  const plat = platformLabel(input.platform);
  const idea = input.idea.trim() || "your niche";
  const gh = goalHint(input.goal);

  const contentIdeas: string[] = [
    `Behind the scenes: how ${name} plans a week of ${plat} posts around ${idea}`,
    `One mistake I made on ${plat} (and what I changed) for ${gh}`,
    `A simple script template you can reuse for ${plat} videos this week`,
    `Reply video: answer the top comment or FAQ your viewers repeat`,
    `Before and after: thumbnail or hook test with a clear hypothesis`,
    `Trending sound or topic in your niche, adapted to your voice`,
    `Collaboration or duet idea that fits ${plat} and your audience`,
    `A “start here” video for new viewers who find ${name}`,
  ];

  const weeklyPlan = DAYS.map((day, i) => {
    const focuses = [
      `Plan: pick one video topic aligned with ${gh}`,
      `Film or batch: short draft, focus on hook in first 3 seconds`,
      `Edit: captions, thumbnail A/B concept, CTA line`,
      `Publish + first hour: pin comment, reply to early comments`,
      `Review: retention curve idea for next week`,
      `Community: reply backlog and save Qs for next video`,
      `Rest or buffer: schedule next week’s outline`,
    ];
    return { day, focus: focuses[i % focuses.length] };
  });

  const experiments: string[] = [
    `Post the same topic with two different thumbnails; compare click through for 48 hours.`,
    `Change only the first sentence of the hook; keep everything else fixed for the next 3 uploads.`,
    `Try one upload at a different time slot for ${plat}; note views in the first 2 hours.`,
  ];

  return {
    contentIdeas,
    weeklyPlan,
    experiments,
  };
}
