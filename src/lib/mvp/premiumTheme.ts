/**
 * Premium MVP visual tokens — Tailwind class bundles for brand-grade surfaces.
 * Use with section primitives under `components/mvp/premium/`.
 */

export const premiumTheme = {
  /** Full-bleed page backdrop (restrained, not loud). */
  pageBackdrop: "min-h-screen bg-gradient-to-b from-background via-background to-muted/25",

  /** Horizontal padding + max width for MVP canvases. */
  pageContainer: "max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 pb-24",

  /** Large hero headline. */
  heroTitle: "text-3xl sm:text-4xl font-semibold tracking-tight text-foreground",

  heroSubtitle: "mt-3 text-base sm:text-lg text-muted-foreground max-w-2xl leading-relaxed",

  heroEyebrow: "text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground",

  heroDivider: "border-b border-border/50",

  metaLine: "mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground",

  archetypeBadge:
    "text-[10px] uppercase tracking-wider text-muted-foreground rounded-full border border-border/70 bg-muted/40 px-2.5 py-1",

  /** Left / context column — calm panel. */
  contextPanel:
    "rounded-3xl border border-border/50 bg-gradient-to-b from-card/95 to-card/70 p-5 sm:p-6 shadow-sm space-y-5",

  contextLabel: "text-[10px] font-semibold uppercase tracking-wider text-muted-foreground",

  contextBody: "text-sm leading-relaxed text-foreground",

  /** Primary workflow canvas — main “product” surface. */
  workflowShell:
    "rounded-3xl border border-border/60 bg-card shadow-[0_24px_80px_-52px_rgba(2,6,23,0.45)] p-6 sm:p-8 lg:p-10",

  /** Inner rhythm inside workflow. */
  workflowStack: "flex flex-col gap-8",

  /** Section titles inside workflow. */
  sectionKicker: "text-xs font-semibold uppercase tracking-wider text-muted-foreground",

  sectionTitle: "text-lg font-semibold text-foreground tracking-tight",

  /** Premium cards (nested). */
  card:
    "rounded-2xl border border-border/60 bg-background/60 shadow-[0_8px_30px_-18px_rgba(2,6,23,0.35)]",

  /** Primary CTA — consistent across MVPs. */
  ctaPrimary:
    "inline-flex items-center justify-center rounded-full bg-foreground px-5 py-3 text-sm font-medium text-background shadow-sm transition-opacity hover:opacity-90",

  ctaSecondary:
    "inline-flex items-center justify-center rounded-full border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary/80",

  /** Stats / proof strip. */
  statsStrip: "flex flex-wrap gap-6 rounded-2xl border border-border/50 bg-muted/20 px-4 py-3 sm:px-6",

  /** Next-step / bridge — end of funnel polish. */
  nextBridge:
    "rounded-2xl border border-dashed border-border/70 bg-muted/15 px-4 py-4 sm:px-5 sm:py-5",

  /** Trust / social row. */
  trustRow: "rounded-2xl border border-border/40 bg-card/50 px-4 py-4 text-sm text-muted-foreground",

  /** Minimal footer. */
  footer: "mt-16 pt-8 border-t border-border/40 text-center text-xs text-muted-foreground",
} as const;

export type PremiumArchetypePreset = "storefront" | "dashboard" | "marketplace" | "generator" | "assistant";
