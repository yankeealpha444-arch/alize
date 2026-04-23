import type { ReactNode } from "react";
import { PremiumSectionHeader } from "@/components/mvp/premium/PremiumSectionHeader";

type Props = {
  title: string;
  subtitle?: string;
  kicker?: string;
  children: ReactNode;
};

/** Results / output surface — same typography rhythm as workflow. */
export function PremiumOutputSection({ title, subtitle, kicker, children }: Props) {
  return (
    <section className="space-y-4">
      <PremiumSectionHeader kicker={kicker} title={title} subtitle={subtitle} />
      {children}
    </section>
  );
}
