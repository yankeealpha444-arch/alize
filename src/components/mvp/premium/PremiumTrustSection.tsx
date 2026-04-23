import type { ReactNode } from "react";
import { premiumTheme } from "@/lib/mvp/premiumTheme";

type Props = {
  title?: string;
  children: ReactNode;
};

export function PremiumTrustSection({ title = "Why teams use this", children }: Props) {
  return (
    <section className={premiumTheme.trustRow}>
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{title}</p>
      <div className="text-sm leading-relaxed">{children}</div>
    </section>
  );
}
