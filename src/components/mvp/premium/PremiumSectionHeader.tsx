import { premiumTheme } from "@/lib/mvp/premiumTheme";

type Props = {
  kicker?: string;
  title: string;
  subtitle?: string;
};

export function PremiumSectionHeader({ kicker, title, subtitle }: Props) {
  return (
    <div className="space-y-1">
      {kicker ? <p className={premiumTheme.sectionKicker}>{kicker}</p> : null}
      <h2 className={premiumTheme.sectionTitle}>{title}</h2>
      {subtitle ? <p className="text-sm text-muted-foreground leading-relaxed">{subtitle}</p> : null}
    </div>
  );
}
