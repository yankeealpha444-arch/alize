import { useCallback, useEffect, useRef, useState } from "react";
import { Play, Sparkles, Video, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { trackMvpEvent } from "@/lib/mvp/mvpEventTracking";

type Props = {
  projectId: string;
  productName?: string;
};

const VARIATIONS = [
  {
    id: "v1",
    title: "Hook-forward cut",
    description: "Opens on motion + beat. Built to stop the scroll in the first second.",
    diff: "0:06 hook · Face-on intro · Punchy SFX",
    accent: "from-fuchsia-500/40 via-rose-600/20 to-transparent",
    border: "border-fuchsia-500/35",
  },
  {
    id: "v2",
    title: "Story build",
    description: "Sets context fast, lands payoff on your CTA beat.",
    diff: "Pacing +12% · VO trimmed · Mid-section lift",
    accent: "from-amber-400/35 via-orange-600/15 to-transparent",
    border: "border-amber-400/30",
  },
  {
    id: "v3",
    title: "Max punch",
    description: "Tighter middle, higher contrast on drops for retention.",
    diff: "Contrast boost · Beat-sync cuts · End-card emphasis",
    accent: "from-violet-500/40 via-indigo-700/20 to-transparent",
    border: "border-violet-500/35",
  },
] as const;

export default function ReelPerformanceLabMVP({ projectId, productName = "Instagram Reel Performance Lab" }: Props) {
  const [idea, setIdea] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [generated, setGenerated] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [ideaLogged, setIdeaLogged] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    trackMvpEvent("page_view", projectId, { surface: "reel_performance_lab" });
  }, [projectId]);

  useEffect(() => {
    if (!videoFile) {
      setVideoUrl(null);
      return;
    }
    const u = URL.createObjectURL(videoFile);
    setVideoUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [videoFile]);

  const logIdeaEntered = useCallback(() => {
    if (idea.trim().length < 8 || ideaLogged) return;
    trackMvpEvent("idea_entered", projectId, { length: idea.trim().length });
    setIdeaLogged(true);
  }, [idea, ideaLogged, projectId]);

  const onPickVideo = (f: File | null) => {
    if (!f || !f.type.startsWith("video/")) return;
    setVideoFile(f);
    setGenerated(false);
    setSelectedId(null);
    trackMvpEvent("video_uploaded", projectId, { name: f.name, size: f.size });
  };

  const onGenerate = () => {
    if (!videoFile && !idea.trim()) return;
    trackMvpEvent("generate_clicked", projectId, {
      has_video: !!videoFile,
      has_idea: idea.trim().length > 0,
    });
    setGenerated(true);
    setSelectedId(null);
    trackMvpEvent("result_generated", projectId, { reel_lab: true, variations: 3 });
    VARIATIONS.forEach((v) => {
      trackMvpEvent("variation_viewed", projectId, { variation_id: v.id });
    });
  };

  const onSelectVariation = (id: string) => {
    setSelectedId(id);
    trackMvpEvent("variation_selected", projectId, { variation_id: id });
  };

  const onSaveVersion = () => {
    if (!selectedId) return;
    trackMvpEvent("version_saved", projectId, { variation_id: selectedId });
  };

  const onTryNew = () => {
    setGenerated(false);
    setSelectedId(null);
    setIdea("");
    setVideoFile(null);
    setIdeaLogged(false);
  };

  return (
    <div className="min-h-screen bg-[#07060b] text-slate-100 relative overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 opacity-90"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(192, 38, 211, 0.25), transparent), radial-gradient(ellipse 60% 40% at 100% 50%, rgba(245, 158, 11, 0.08), transparent), radial-gradient(ellipse 50% 30% at 0% 80%, rgba(99, 102, 241, 0.12), transparent)",
        }}
      />
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14 pb-24">
        <header className="text-center mb-12 space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-fuchsia-500/30 bg-fuchsia-500/10 px-4 py-1.5 text-xs font-medium uppercase tracking-widest text-fuchsia-200/90">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            Creator lab
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight bg-gradient-to-r from-white via-fuchsia-100 to-amber-100 bg-clip-text text-transparent">
            {productName}
          </h1>
          <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Test reel directions before you post — compare variations side by side and ship the one that earns views.
          </p>
        </header>

        <section className="mb-14 rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-xl p-6 sm:p-8 shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_24px_80px_-12px_rgba(0,0,0,0.65)]">
          <div className="flex flex-col lg:flex-row gap-8 lg:gap-10">
            <div className="flex-1 space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-fuchsia-200/90">
                <Video className="w-4 h-4" />
                Upload reel
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="video/*"
                className="sr-only"
                onChange={(e) => onPickVideo(e.target.files?.[0] ?? null)}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className={cn(
                  "group relative w-full rounded-2xl border-2 border-dashed transition-all min-h-[200px] flex flex-col items-center justify-center gap-3 p-6",
                  videoFile
                    ? "border-fuchsia-500/40 bg-fuchsia-950/20"
                    : "border-white/15 bg-black/20 hover:border-fuchsia-500/35 hover:bg-fuchsia-950/10",
                )}
              >
                {videoUrl ? (
                  <video
                    src={videoUrl}
                    className="absolute inset-3 rounded-xl max-h-[180px] w-[calc(100%-24px)] object-contain bg-black/60"
                    muted
                    playsInline
                  />
                ) : (
                  <>
                    <div className="rounded-full bg-gradient-to-br from-fuchsia-600/40 to-amber-500/20 p-4 ring-1 ring-white/10">
                      <Play className="w-8 h-8 text-fuchsia-200" />
                    </div>
                    <span className="text-sm font-medium text-slate-300">Drop a clip or choose a file to upload</span>
                    <span className="text-xs text-slate-500">MP4, MOV — preview stays on device</span>
                  </>
                )}
                {videoFile && (
                  <span className="relative z-10 mt-auto text-xs text-fuchsia-200/80 truncate max-w-full px-2">
                    {videoFile.name}
                  </span>
                )}
              </button>
            </div>

            <div className="flex-1 space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-amber-200/90">
                <Wand2 className="w-4 h-4" />
                Or describe your reel
              </div>
              <textarea
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                onBlur={logIdeaEntered}
                placeholder="e.g. 15s GRWM with product reveal on the beat drop, trending audio, CTA in last 2s…"
                rows={8}
                className={cn(
                  "w-full min-h-[200px] rounded-2xl border border-white/10 bg-black/30 px-4 py-3.5 text-sm sm:text-base text-slate-100 placeholder:text-slate-600",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500/50 focus-visible:border-fuchsia-500/30",
                )}
              />
            </div>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-4">
            <Button
              type="button"
              size="lg"
              disabled={!videoFile && !idea.trim()}
              onClick={onGenerate}
              className={cn(
                "rounded-2xl px-10 h-14 text-base font-semibold shadow-lg shadow-fuchsia-950/50",
                "bg-gradient-to-r from-fuchsia-600 to-rose-600 hover:from-fuchsia-500 hover:to-rose-500 text-white border-0",
                "disabled:opacity-40 disabled:shadow-none",
              )}
            >
              Calculate variations
            </Button>
            {!videoFile && !idea.trim() && (
              <p className="text-center text-xs text-slate-500 sm:max-w-xs">Add a video or describe an idea to generate.</p>
            )}
          </div>
        </section>

        {generated && (
          <section className="space-y-8">
            <div className="text-center space-y-2">
              <h2 className="text-xl sm:text-2xl font-semibold text-white">Your variations</h2>
              <p className="text-sm text-slate-400">Tap a card to pick the strongest cut — differences are highlighted on each.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-6">
              {VARIATIONS.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => onSelectVariation(v.id)}
                  className={cn(
                    "text-left rounded-2xl border bg-black/30 backdrop-blur-sm overflow-hidden transition-all duration-200",
                    "hover:ring-2 hover:ring-fuchsia-500/30 hover:-translate-y-0.5",
                    v.border,
                    selectedId === v.id && "ring-2 ring-amber-400/80 shadow-[0_0_30px_-4px_rgba(251,191,36,0.35)] scale-[1.02]",
                  )}
                >
                  <div
                    className={cn(
                      "relative aspect-[9/16] max-h-[280px] w-full overflow-hidden bg-gradient-to-br",
                      v.accent,
                    )}
                  >
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="rounded-full bg-black/50 p-4 ring-1 ring-white/20 backdrop-blur-sm">
                        <Play className="w-10 h-10 text-white/90" fill="currentColor" />
                      </div>
                    </div>
                    <div className="absolute bottom-0 inset-x-0 h-1/3 bg-gradient-to-t from-black/80 to-transparent" />
                    <span className="absolute bottom-3 left-3 right-3 text-[10px] uppercase tracking-wider text-amber-200/90 font-medium">
                      Preview · mock
                    </span>
                    {selectedId === v.id && (
                      <span className="absolute top-3 left-3 rounded-full bg-amber-500/90 text-black text-[10px] font-bold px-2 py-0.5 shadow-lg">
                        Best version
                      </span>
                    )}
                  </div>
                  <div className="p-4 space-y-2 border-t border-white/5">
                    <p className="text-sm font-semibold text-white">{v.title}</p>
                    <p className="text-xs text-slate-400 leading-relaxed">{v.description}</p>
                    <p className="text-[11px] font-mono text-fuchsia-300/90 rounded-lg bg-white/5 px-2 py-1.5 border border-white/10">
                      {v.diff}
                    </p>
                  </div>
                </button>
              ))}
            </div>

            <div className="flex flex-col items-center gap-4 pt-4">
              <p className="text-sm text-slate-400 text-center max-w-md">
                <span className="text-fuchsia-300/90 font-medium">Select best version</span> — tap a card above, then save or iterate.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={!selectedId}
                  onClick={onSaveVersion}
                  className="rounded-xl bg-white/10 text-white border border-white/15 hover:bg-white/15 disabled:opacity-40"
                >
                  Save version
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={onTryNew}
                  className="rounded-xl border-amber-500/40 text-amber-100 bg-amber-950/20 hover:bg-amber-950/40"
                >
                  Try new variations
                </Button>
              </div>
            </div>
            {selectedId && (
              <p className="text-center text-xs text-emerald-400/90">
                Variation saved to session when you tap Save version.
              </p>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
