import type { ReactNode } from "react";
import type { ProductFrame } from "@/lib/mvp/productFraming";
import type { PremiumArchetypePreset } from "@/lib/mvp/premiumTheme";
import { premiumTheme } from "@/lib/mvp/premiumTheme";
import { PremiumFooter } from "@/components/mvp/premium/PremiumFooter";
import { PremiumHero } from "@/components/mvp/premium/PremiumHero";
import { PremiumPageChrome } from "@/components/mvp/premium/PremiumPageChrome";
import { PremiumWorkflowCanvas } from "@/components/mvp/premium/PremiumWorkflowSection";

/**
 * Archetype-driven page architecture presets — same building blocks, different column balance.
 * Plug any MVP body into `children`; use `left` for plan / context.
 */
const gridByPreset: Record<PremiumArchetypePreset, string> = {
  /** Marketing / commerce — single strong column + optional wide hero. */
  storefront: "grid gap-10 lg:grid-cols-1",
  /** Dense app — narrower rail. */
  dashboard: "grid gap-8 lg:grid-cols-[minmax(0,260px)_minmax(0,1fr)]",
  /** Browse + detail — slightly wider rail. */
  marketplace: "grid gap-8 lg:grid-cols-[minmax(0,300px)_minmax(0,1fr)]",
  /** Creation / tools — balanced rail + canvas. */
  generator: "grid gap-8 lg:gap-10 lg:grid-cols-[minmax(0,300px)_minmax(0,1fr)]",
  /** Guided flow — same as generator by default; tune later. */
  assistant: "grid gap-8 lg:grid-cols-[minmax(0,280px)_minmax(0,1fr)]",
};

type Props = {
  preset: PremiumArchetypePreset;
  frame: ProductFrame;
  left: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  showFooter?: boolean;
  heroEyebrow?: string;
};

export function PremiumArchetypeLayout({
  preset,
  frame,
  left,
  children,
  footer,
  showFooter = true,
  heroEyebrow,
}: Props) {
  return (
    <PremiumPageChrome>
      <div className={premiumTheme.pageContainer}>
        <PremiumHero frame={frame} eyebrow={heroEyebrow} />

        <div className={gridByPreset[preset]}>
          <aside className="lg:sticky lg:top-4 lg:self-start">
            <div className={premiumTheme.contextPanel}>{left}</div>
          </aside>

          <div className="min-w-0 flex flex-col gap-8">
            <PremiumWorkflowCanvas>{children}</PremiumWorkflowCanvas>
            {footer}
          </div>
        </div>

        {showFooter ? <PremiumFooter /> : null}
      </div>
    </PremiumPageChrome>
  );
}
