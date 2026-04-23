import { useCallback, useEffect, useRef, useState } from "react";
import { Layers, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { trackMvpEvent } from "@/lib/mvp/mvpEventTracking";

type Props = {
  projectId: string;
  productName?: string;
};

const VERSIONS = [
  {
    id: "car1",
    title: "Proof-first arc",
    summary: "Lead with credibility, then stack value before the ask.",
    slides: [
      "Slide 1 — Bold claim + face to camera",
      "Slide 2 — The gap (what most people miss)",
      "Slides 3–4 — Two proof points (metrics or story)",
      "Slide 5 — One-line takeaway",
      "Slide 6 — CTA (save / comment)",
    ],
    accent: "from-teal-500/35 via-cyan-600/15 to-transparent",
    border: "border-teal-400/35",
  },
  {
    id: "car2",
    title: "Story → lesson",
    summary: "Narrative hook, teach the frame, end with a punchy recap.",
    slides: [
      "Slide 1 — Relatable moment (pattern interrupt)",
      "Slide 2 — Stakes (why it matters now)",
      "Slides 3–4 — Lesson in two beats",
      "Slide 5 — Mistake to avoid",
      "Slide 6 — Follow for part 2",
    ],
    accent: "from-emerald-500/30 via-green-800/15 to-transparent",
    border: "border-emerald-400/30",
  },
  {
    id: "car3",
    title: "Listicle hammer",
    summary: "Tight list energy; every slide earns the next swipe.",
    slides: [
      "Slide 1 — Number + outcome promise",
      "Slides 2–5 — One habit per slide (single idea each)",
      "Slide 6 — Recap + which to try first",
      "Slide 7 — CTA (DM keyword / link)",
    ],
    accent: "from-sky-500/35 via-blue-800/20 to-transparent",
    border: "border-sky-400/35",
  },
] as const;

export default function CarouselTesterMVP({ projectId, productName = "Carousel Tester" }: Props) {
  const [about, setAbout] = useState("");
  const [slideIdeas, setSlideIdeas] = useState<string[]>([]);
  const [draftSlide, setDraftSlide] = useState("");
  const [generated, setGenerated] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [aboutLogged, setAboutLogged] = useState(false);
  const slideInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    trackMvpEvent("page_view", projectId, { surface: "carousel_tester" });
  }, [projectId]);

  const logAbout = useCallback(() => {
    if (about.trim().length < 6 || aboutLogged) return;
    trackMvpEvent("idea_entered", projectId, { length: about.trim().length, carousel: true });
    setAboutLogged(true);
  }, [about, aboutLogged, projectId]);

  const addSlideIdea = () => {
    const t = draftSlide.trim();
    if (!t) return;
    setSlideIdeas((prev) => [...prev, t].slice(0, 12));
    setDraftSlide("");
  };

  const onSlideKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addSlideIdea();
    }
  };

  const removeSlide = (idx: number) => {
    setSlideIdeas((prev) => prev.filter((_, i) => i !== idx));
  };

  const onGenerate = () => {
    if (!about.trim()) return;
    trackMvpEvent("generate_clicked", projectId, {
      carousel: true,
      has_slide_ideas: slideIdeas.length > 0,
    });
    setGenerated(true);
    setSelectedId(null);
    trackMvpEvent("result_generated", projectId, { carousel_tester: true, variations: 3 });
    VERSIONS.forEach((v) => {
      trackMvpEvent("variation_viewed", projectId, { variation_id: v.id, surface: "carousel" });
    });
  };

  const onSelect = (id: string) => {
    setSelectedId(id);
    trackMvpEvent("variation_selected", projectId, { variation_id: id, surface: "carousel" });
  };

  const onSave = () => {
    if (!selectedId) return;
    trackMvpEvent("version_saved", projectId, { variation_id: selectedId, surface: "carousel" });
  };

  const onTryNew = () => {
    setGenerated(false);
    setSelectedId(null);
    setAbout("");
    setSlideIdeas([]);
    setDraftSlide("");
    setAboutLogged(false);
  };

  return (
    <div className="min-h-screen bg-[#050a0c] text-slate-100 relative overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 opacity-95"
        style={{
          background:
            "radial-gradient(ellipse 70% 45% at 50% -15%, rgba(45, 212, 191, 0.18), transparent), radial-gradient(ellipse 50% 40% at 100% 30%, rgba(56, 189, 248, 0.1), transparent), radial-gradient(ellipse 45% 35% at 0% 70%, rgba(16, 185, 129, 0.1), transparent)",
        }}
      />
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14 pb-24">
        <header className="text-center mb-10 space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-teal-400/35 bg-teal-500/10 px-4 py-1.5 text-xs font-medium uppercase tracking-widest text-teal-200/95">
            <Layers className="w-3.5 h-3.5 text-cyan-300" />
            Test ideas before you post
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight bg-gradient-to-r from-white via-teal-100 to-cyan-100 bg-clip-text text-transparent">
            {productName}
          </h1>
          <p className="text-lg sm:text-xl font-semibold text-teal-100/95">Find your strongest carousel</p>
          <p className="text-base text-slate-400 leading-relaxed">
            Enter your idea, get 3 structured versions, and pick the one that hits hardest.
          </p>
        </header>

        <section className="mb-12 rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-xl p-6 sm:p-8 shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_24px_80px_-12px_rgba(0,0,0,0.6)] space-y-6">
          <div className="space-y-2">
            <label htmlFor={`carousel-about-${projectId}`} className="block text-sm font-semibold text-teal-100/90">
              What is your carousel about?
            </label>
            <textarea
              id={`carousel-about-${projectId}`}
              value={about}
              onChange={(e) => setAbout(e.target.value)}
              onBlur={logAbout}
              placeholder="e.g. 5 habits of highly productive founders"
              rows={4}
              className={cn(
                "w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3.5 text-sm sm:text-base text-slate-100 placeholder:text-slate-500",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/45",
              )}
            />
          </div>

          <div className="space-y-3">
            <p className="text-sm font-semibold text-cyan-100/85">Slide ideas (optional)</p>
            <p className="text-xs text-slate-500">Add a slide idea and press Enter</p>
            <input
              ref={slideInputRef}
              type="text"
              value={draftSlide}
              onChange={(e) => setDraftSlide(e.target.value)}
              onKeyDown={onSlideKey}
              placeholder="e.g. morning routine screenshot"
              className={cn(
                "w-full rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-600",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40",
              )}
            />
            {slideIdeas.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {slideIdeas.map((s, i) => (
                  <span
                    key={`${s}-${i}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-teal-500/30 bg-teal-950/50 pl-3 pr-1 py-1 text-xs text-teal-100"
                  >
                    {s}
                    <button
                      type="button"
                      onClick={() => removeSlide(i)}
                      className="rounded-full p-0.5 hover:bg-white/10 text-slate-400 hover:text-white"
                      aria-label="Remove"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-4 pt-2">
            <Button
              type="button"
              size="lg"
              disabled={!about.trim()}
              onClick={onGenerate}
              className={cn(
                "rounded-2xl px-10 h-12 text-base font-semibold",
                "bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white border-0 shadow-lg shadow-teal-950/40",
                "disabled:opacity-40",
              )}
            >
              Generate Carousel Versions
            </Button>
            {!about.trim() && <p className="text-xs text-slate-500">Add a topic above to generate structured versions.</p>}
          </div>
        </section>

        {generated && (
          <section className="space-y-8">
            <div className="text-center space-y-1">
              <h2 className="text-xl font-semibold text-white flex items-center justify-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-300" />
                Structured versions
              </h2>
              <p className="text-sm text-slate-400">Tap a card to choose your strongest structure.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {VERSIONS.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => onSelect(v.id)}
                  className={cn(
                    "text-left rounded-2xl border bg-black/30 backdrop-blur-sm overflow-hidden transition-all",
                    "hover:ring-2 hover:ring-teal-500/35 hover:-translate-y-0.5",
                    v.border,
                    selectedId === v.id && "ring-2 ring-amber-400/70 shadow-[0_0_28px_-6px_rgba(251,191,36,0.35)]",
                  )}
                >
                  <div className={cn("h-2 w-full bg-gradient-to-r", v.accent)} />
                  <div className="p-5 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-base font-bold text-white">{v.title}</p>
                      {selectedId === v.id && (
                        <span className="shrink-0 rounded-full bg-amber-500/90 text-black text-[10px] font-bold px-2 py-0.5">
                          Best pick
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">{v.summary}</p>
                    <ul className="space-y-2 pt-1 border-t border-white/5">
                      {v.slides.map((line, i) => (
                        <li key={i} className="text-[11px] leading-snug text-slate-300 flex gap-2">
                          <span className="text-teal-400/80 font-mono text-[10px] w-5 shrink-0">{i + 1}</span>
                          <span>{line}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </button>
              ))}
            </div>

            <div className="flex flex-col items-center gap-4 pt-2">
              <div className="flex flex-wrap justify-center gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={!selectedId}
                  onClick={onSave}
                  className="rounded-xl bg-white/10 text-white border border-white/15 hover:bg-white/15 disabled:opacity-40"
                >
                  Save version
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={onTryNew}
                  className="rounded-xl border-cyan-500/40 text-cyan-100 bg-cyan-950/25 hover:bg-cyan-950/40"
                >
                  Try new variations
                </Button>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
