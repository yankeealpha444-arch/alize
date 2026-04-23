import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/** Outer wrapper for every dedicated segment calculator — consistent vertical rhythm. */
export const DEDICATED_CALC_ROOT = "flex flex-col gap-8 max-w-4xl mx-auto w-full pb-10 px-2";

export function DedicatedCalculatorHeader({
  kicker,
  title,
  description,
}: {
  kicker: string;
  title: string;
  description: string;
}) {
  return (
    <header className="space-y-2">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{kicker}</p>
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
      <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">{description}</p>
    </header>
  );
}

/** Section label above input cards */
export function DedicatedInputsHeading() {
  return <h2 className="text-sm font-semibold text-foreground">Inputs</h2>;
}

export function DedicatedCalculatorActions({
  calculateLabel,
  onCalculate,
  onReset,
  disabled,
}: {
  calculateLabel: string;
  onCalculate: () => void;
  onReset: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button type="button" className="min-w-[200px] rounded-xl font-semibold h-12" onClick={onCalculate} disabled={disabled}>
        {calculateLabel}
      </Button>
      <Button type="button" variant="outline" className="rounded-xl h-12 px-6" onClick={onReset}>
        Reset
      </Button>
    </div>
  );
}

export function DedicatedResultsBlock({
  primaryLabel,
  primaryValue,
  secondaryLabel,
  secondaryValue,
  insights,
}: {
  primaryLabel: string;
  primaryValue: ReactNode;
  secondaryLabel?: string;
  secondaryValue?: ReactNode;
  insights: readonly [string, string];
}) {
  const twoCol = secondaryLabel != null && secondaryValue != null;
  return (
    <section className="space-y-6" aria-live="polite">
      <h2 className="text-sm font-semibold text-foreground border-b border-border pb-2">Results</h2>
      <div className={`grid gap-4 ${twoCol ? "md:grid-cols-2" : "md:max-w-xl"}`}>
        <Card className="rounded-2xl border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{primaryLabel}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tabular-nums text-foreground">{primaryValue}</div>
          </CardContent>
        </Card>
        {twoCol ? (
          <Card className="rounded-2xl border-border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{secondaryLabel}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tabular-nums text-foreground">{secondaryValue}</div>
            </CardContent>
          </Card>
        ) : null}
      </div>
      <DedicatedInsightList insights={insights} />
    </section>
  );
}

export function DedicatedInsightList({ insights }: { insights: readonly [string, string] }) {
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Insights</h3>
      <ul className="space-y-2 list-none">
        {insights.map((text, i) => (
          <li key={i} className="text-sm text-foreground leading-snug border-l-2 border-primary/35 pl-3">
            {text}
          </li>
        ))}
      </ul>
    </div>
  );
}
