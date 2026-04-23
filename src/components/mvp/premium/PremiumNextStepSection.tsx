import type { ReactNode } from "react";
import { premiumTheme } from "@/lib/mvp/premiumTheme";

type Props = {
  title: string;
  subtitle?: string;
  children?: ReactNode;
};

export function PremiumNextStepSection({ title, subtitle, children }: Props) {
  return (
    <div className={premiumTheme.nextBridge}>
      <p className="text-sm font-semibold text-foreground">{title}</p>
      {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
      {children ? <div className="mt-3">{children}</div> : null}
    </div>
  );
}
