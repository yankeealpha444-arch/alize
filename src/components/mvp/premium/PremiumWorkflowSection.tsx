import type { ReactNode } from "react";
import { PremiumSectionHeader } from "@/components/mvp/premium/PremiumSectionHeader";
import { premiumTheme } from "@/lib/mvp/premiumTheme";

type Props = {
  title: string;
  subtitle?: string;
  kicker?: string;
  children: ReactNode;
};

export function PremiumWorkflowSection({ title, subtitle, kicker, children }: Props) {
  return (
    <section className="space-y-5">
      <PremiumSectionHeader kicker={kicker} title={title} subtitle={subtitle} />
      <div className="space-y-4">{children}</div>
    </section>
  );
}

export function PremiumWorkflowCanvas({ children }: { children: ReactNode }) {
  return <div className={`${premiumTheme.workflowShell} ${premiumTheme.workflowStack}`}>{children}</div>;
}
