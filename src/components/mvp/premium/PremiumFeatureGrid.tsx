import type { ReactNode } from "react";
import { premiumTheme } from "@/lib/mvp/premiumTheme";

export type FeatureItem = { title: string; description: string; icon?: ReactNode };

type Props = {
  title?: string;
  features: FeatureItem[];
};

export function PremiumFeatureGrid({ title, features }: Props) {
  return (
    <section className="space-y-4">
      {title ? <h3 className={premiumTheme.sectionTitle}>{title}</h3> : null}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f) => (
          <div key={f.title} className={`${premiumTheme.card} p-4`}>
            {f.icon ? <div className="mb-2 text-muted-foreground">{f.icon}</div> : null}
            <p className="text-sm font-semibold text-foreground">{f.title}</p>
            <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{f.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
