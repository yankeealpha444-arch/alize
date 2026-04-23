import { ArrowRight, TrendingUp, MousePointerClick, Image as ImageIcon, Send, BarChart3, Sparkles } from "lucide-react";

const STEPS = [
  { icon: MousePointerClick, label: "Pick your clip window" },
  { icon: ImageIcon, label: "Pick your thumbnail angle" },
  { icon: Send, label: "Post your Short" },
  { icon: BarChart3, label: "Track results" },
  { icon: Sparkles, label: "Use the next action" },
];

export default function LoopExplainer() {
  return (
    <section className="mt-16 border-t border-border/40 pt-10">
      <div className="grid gap-10 lg:grid-cols-2">
        {/* Left: full loop pitch */}
        <div className="rounded-2xl border border-border/40 bg-muted/30 p-6 sm:p-8">
          <div className="mb-3 inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
            <TrendingUp className="h-3.5 w-3.5" />
            The full loop
          </div>
          <h2 className="font-display text-2xl font-bold tracking-tight text-foreground">
            One repeatable test loop
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            You pick a time window and a thumbnail angle from the same video, post it, then log views and
            engagement here.
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            The next action is based on the tier you enter—not on automated video analysis.
          </p>
        </div>

        {/* Right: what happens next */}
        <div>
          <div className="mb-4 inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
            <ArrowRight className="h-3.5 w-3.5" />
            What happens next
          </div>
          <ol className="space-y-3">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              return (
                <li
                  key={s.label}
                  className="flex items-center gap-3 rounded-lg border border-border/40 bg-background px-4 py-3"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-foreground text-[11px] font-bold text-background">
                    {i + 1}
                  </span>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">{s.label}</span>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}
