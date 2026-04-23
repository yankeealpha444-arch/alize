/** Rank scenarios by revenue (highest first). Tie-breaker: stable input order. */

export type RevenueScenario = { id: string; label: string; revenue: number };

export function rankScenariosByRevenue(scenarios: RevenueScenario[]): RevenueScenario[] {
  return [...scenarios]
    .filter((s) => Number.isFinite(s.revenue))
    .sort((a, b) => b.revenue - a.revenue || a.id.localeCompare(b.id));
}

export function describeRanking(ordered: RevenueScenario[]): string {
  if (ordered.length === 0) return "No scenarios to compare.";
  if (ordered.length === 1) return `Single scenario: ${ordered[0].label} at ${ordered[0].revenue}.`;
  const best = ordered[0];
  const worst = ordered[ordered.length - 1];
  return `Highest revenue: ${best.label} (${best.revenue}). Lowest: ${worst.label} (${worst.revenue}).`;
}
