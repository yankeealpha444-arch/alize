import type { ReactNode } from "react";
import { premiumTheme } from "@/lib/mvp/premiumTheme";

type Stat = { label: string; value: string };

type Props = {
  stats: Stat[];
};

/** Proof / metrics strip — optional for any MVP. */
export function PremiumStatsStrip({ stats }: Props) {
  return (
    <div className={`${premiumTheme.statsStrip} mb-8`}>
      {stats.map((s) => (
        <div key={s.label} className="min-w-[100px]">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{s.label}</p>
          <p className="text-lg font-semibold tabular-nums text-foreground">{s.value}</p>
        </div>
      ))}
    </div>
  );
}
