import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, FlaskConical, LineChart, Lightbulb } from "lucide-react";
import AlizeLogo from "@/components/AlizeLogo";
import { useFlow, flowStore } from "@/store/flowStore";
import { formatTime } from "@/data/demoClips";

function scoreToUplift(score: number): string {
  if (score >= 90) return "2.4x";
  if (score >= 85) return "1.9x";
  if (score >= 75) return "1.4x";
  return "1.1x";
}

export default function Preview() {
  const navigate = useNavigate();
  const { selectedClip } = useFlow();

  useEffect(() => {
    if (!selectedClip) navigate("/clips", { replace: true });
  }, [selectedClip, navigate]);

  if (!selectedClip) return null;

  const uplift = scoreToUplift(selectedClip.score);

  const handleAccept = () => {
    flowStore.startTest();
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/40 px-4 py-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl flex items-center justify-between">
          <AlizeLogo />
          <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Step 3 of 5
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 max-w-2xl">
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Preview your choice
          </h1>
          <p className="mt-2 text-muted-foreground">
            Confirm this clip and we'll start testing it for you.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Clip preview */}
          <div>
            <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-border/40 bg-muted">
              {selectedClip.thumbnail_url && (
                <img
                  src={selectedClip.thumbnail_url}
                  alt={selectedClip.caption}
                  className="h-full w-full object-cover"
                />
              )}
              <div className="absolute left-3 top-3 flex items-center gap-1.5">
                <span className="rounded-md bg-background/90 px-2 py-0.5 text-xs font-bold text-foreground backdrop-blur-sm">
                  {selectedClip.score}
                </span>
                <span className="rounded-md bg-background/90 px-2 py-0.5 text-xs font-semibold text-foreground backdrop-blur-sm">
                  {uplift}
                </span>
              </div>
              <div className="absolute right-3 top-3">
                <span className="rounded-md bg-background/85 px-2 py-0.5 text-xs font-medium text-foreground backdrop-blur-sm">
                  {formatTime(selectedClip.start_time)}–{formatTime(selectedClip.end_time)}
                </span>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <p className="text-sm font-semibold text-foreground">
                {selectedClip.caption}
              </p>
              <p className="text-xs text-muted-foreground">
                Score {selectedClip.score} · {uplift} likely to outperform baseline
              </p>
            </div>
          </div>

          {/* What happens next */}
          <div className="space-y-6">
            <section>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                What happens next
              </h2>
              <ul className="space-y-2.5 rounded-xl border border-border/60 bg-card p-4">
                <Item icon={<FlaskConical className="h-4 w-4" />} text="We test this clip" />
                <Item icon={<LineChart className="h-4 w-4" />} text="We track performance" />
                <Item icon={<Lightbulb className="h-4 w-4" />} text="We recommend next actions" />
              </ul>
            </section>

            <section>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Before / After
              </h2>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-border/60 bg-card p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Before
                  </p>
                  <p className="mt-1.5 text-sm text-foreground/80">No data yet</p>
                </div>
                <div className="rounded-xl border border-foreground/40 bg-foreground p-4 text-background">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-background/60">
                    After
                  </p>
                  <p className="mt-1.5 text-sm">This clip enters testing</p>
                </div>
              </div>
            </section>

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={handleAccept}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-md bg-foreground px-4 py-3 text-sm font-semibold text-background transition-transform hover:scale-[1.01] active:scale-100"
              >
                <Check className="h-4 w-4" />
                Accept and run test
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => navigate("/clips")}
                className="inline-flex items-center justify-center gap-2 rounded-md border border-border px-4 py-3 text-sm font-medium text-foreground hover:border-foreground/60"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to clips
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function Item({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <li className="flex items-center gap-3 text-sm text-foreground/90">
      <span className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-foreground">
        {icon}
      </span>
      {text}
    </li>
  );
}
