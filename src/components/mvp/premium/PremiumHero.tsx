import type { ReactNode } from "react";
import type { ProductFrame } from "@/lib/mvp/productFraming";
import { premiumTheme } from "@/lib/mvp/premiumTheme";

type Props = {
  frame: ProductFrame;
  eyebrow?: string;
  /** Optional slot for hero media / image-first layouts later. */
  media?: ReactNode;
};

export function PremiumHero({ frame, eyebrow = "Alizé", media }: Props) {
  return (
    <header className={`relative mb-8 md:mb-10 pb-8 ${premiumTheme.heroDivider}`}>
      {media ? <div className="mb-6">{media}</div> : null}
      {eyebrow ? <p className={`${premiumTheme.heroEyebrow} mb-2`}>{eyebrow}</p> : null}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className={premiumTheme.heroTitle}>{frame.product_name}</h1>
        <span className={premiumTheme.archetypeBadge}>{frame.archetype}</span>
      </div>
      <p className={premiumTheme.heroSubtitle}>{frame.one_line_promise}</p>
      <div className={premiumTheme.metaLine}>
        <span>
          <span className="font-medium text-foreground/85">For</span> {frame.target_user}
        </span>
        <span className="hidden sm:inline text-border">·</span>
        <span>
          <span className="font-medium text-foreground/85">Outcome</span> {frame.core_outcome}
        </span>
      </div>
    </header>
  );
}
