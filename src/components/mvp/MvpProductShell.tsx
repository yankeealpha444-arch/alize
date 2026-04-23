import type { ReactNode } from "react";
import type { ProductFrame } from "@/lib/mvp/productFraming";

type Props = {
  frame: ProductFrame;
  /** Left / context column: summary, plan, or metadata. */
  left: ReactNode;
  /** Primary workflow (funnel, tool body, etc.). */
  children: ReactNode;
  /** Optional loop footer below main (e.g. cross-step bridge). */
  footer?: ReactNode;
};

/**
 * Lightweight product shell (legacy / minimal). Prefer `PremiumArchetypeLayout` for brand-grade MVPs.
 * top = name + promise; left = context; main = action; optional footer = next-step loop.
 */
export default function MvpProductShell({ frame, left, children, footer }: Props) {
  return (
    <div className="max-w-6xl mx-auto w-full pb-24">
      <header className="mb-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="text-2xl sm:text-3xl font-semibold text-foreground">{frame.product_name}</h1>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground rounded-full border border-border px-2 py-0.5">
            {frame.archetype}
          </span>
        </div>
        <p className="mt-1 text-sm sm:text-base text-muted-foreground">{frame.one_line_promise}</p>
        <p className="mt-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground/80">For:</span> {frame.target_user}
          {" · "}
          <span className="font-medium text-foreground/80">Outcome:</span> {frame.core_outcome}
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-4 self-start rounded-2xl border border-border bg-card/60 p-4 space-y-4">{left}</aside>
        <div className="flex flex-col gap-7">
          {children}
          {footer}
        </div>
      </div>
    </div>
  );
}
