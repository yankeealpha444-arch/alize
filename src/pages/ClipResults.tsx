import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { saveClipPattern, saveClipResult, type ClipResultOutcome } from "@/lib/mvp/videoClipperBackend";
import { trackEvent } from "@/lib/trackingEvents";

const OUTCOMES: Array<{ id: ClipResultOutcome; label: string }> = [
  { id: "not_posted", label: "Not posted yet" },
  { id: "no_traction", label: "No traction" },
  { id: "some_views", label: "Some views" },
  { id: "strong_views", label: "Strong views" },
  { id: "got_followers", label: "Got followers" },
  { id: "engagement", label: "Engagement" },
  { id: "flopped", label: "Flopped" },
];

export default function ClipResults() {
  const navigate = useNavigate();
  const { projectId = "default" } = useParams<{ projectId: string }>();
  const clipId = localStorage.getItem(`alize_selected_clip_id_${projectId}`);
  const [outcome, setOutcome] = useState<ClipResultOutcome | "">("");
  const [views, setViews] = useState("");
  const [likes, setLikes] = useState("");
  const [comments, setComments] = useState("");
  const [shares, setShares] = useState("");
  const [followers, setFollowers] = useState("");
  const [reaction, setReaction] = useState<"better" | "as_expected" | "worse" | "">("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const savedClipLabel = localStorage.getItem(`alize_selected_clip_label_${projectId}`);
  const savedClipScore = Number(localStorage.getItem(`alize_selected_clip_score_${projectId}`) || 0);
  const performanceLabel: "High" | "Medium" | "Low" =
    savedClipLabel === "High" || savedClipLabel === "Medium" || savedClipLabel === "Low"
      ? savedClipLabel
      : savedClipScore >= 80
        ? "High"
        : savedClipScore >= 60
          ? "Medium"
          : "Low";

  useEffect(() => {
    void trackEvent("results_started", projectId, "results_page", { clip_id: clipId ?? null });
  }, [projectId, clipId]);

  const toInt = (v: string): number | null => {
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
  };

  const toSignalStrength = (value: ClipResultOutcome): "scale" | "test_again" | "swap" | "pending" => {
    if (value === "strong_views" || value === "got_followers" || value === "engagement") return "scale";
    if (value === "some_views" || value === "no_traction") return "test_again";
    if (value === "flopped") return "swap";
    return "pending";
  };

  const normalizedReaction: "better" | "same" | "worse" | null =
    reaction === "better" ? "better" : reaction === "worse" ? "worse" : reaction === "as_expected" ? "same" : null;

  const onSubmit = async () => {
    if (!clipId) {
      toast.error("Select a clip first.");
      navigate(`/p/${projectId}`);
      return;
    }
    if (!outcome) {
      toast.error("Choose an outcome first.");
      return;
    }
    setSaving(true);
    try {
      await saveClipResult(projectId, clipId, {
        outcome,
        views: toInt(views),
        likes: toInt(likes),
        comments: toInt(comments),
        shares: toInt(shares),
        followers_gained: toInt(followers),
        reaction: reaction || null,
        note: note.trim() || null,
      });
      const pattern = await saveClipPattern({
        projectId,
        clipId,
        performanceLabel,
        outcome,
        reaction: normalizedReaction,
        signalStrength: toSignalStrength(outcome),
      });
      localStorage.setItem(`alize_last_outcome_${projectId}`, outcome);
      await trackEvent("results_submitted", projectId, outcome, { clip_id: clipId });
      await trackEvent("pattern_learned", projectId, pattern.pattern_type, {
        clip_id: clipId,
        signal_strength: pattern.signal_strength,
      });
      navigate(`/guidance/${projectId}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save results");
    } finally {
      setSaving(false);
    }
  };

  const onSkip = async () => {
    try {
      if (clipId) {
        const pattern = await saveClipPattern({
          projectId,
          clipId,
          performanceLabel,
          outcome: "unknown",
          reaction: null,
          signalStrength: "pending",
        });
        await trackEvent("pattern_learned", projectId, pattern.pattern_type, {
          clip_id: clipId,
          signal_strength: pattern.signal_strength,
        });
      }
    } catch {
      // Skip should remain non-blocking even if memory insert fails.
    }
    await trackEvent("results_skipped", projectId, "skip", { clip_id: clipId ?? null });
    navigate(`/guidance/${projectId}`);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-6">
      <h1 className="text-2xl font-semibold text-foreground">How did your clip do?</h1>
      <p className="text-sm text-muted-foreground">
        Tell us what happened and we&apos;ll suggest what to do next.
      </p>

      <section className="rounded-xl border border-border bg-card p-4 space-y-3">
        <p className="text-sm font-semibold text-foreground">Outcome</p>
        <div className="flex flex-wrap gap-2">
          {OUTCOMES.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => {
                setOutcome(o.id);
                void trackEvent("outcome_selected", projectId, o.id, { clip_id: clipId ?? null });
              }}
              className={`rounded-full px-4 py-2 text-sm border ${
                outcome === o.id ? "bg-foreground text-background border-foreground" : "border-border hover:bg-secondary"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-4 space-y-3">
        <p className="text-sm font-semibold text-foreground">Optional metrics</p>
        <div className="grid grid-cols-2 gap-3">
          <input value={views} onChange={(e) => setViews(e.target.value)} placeholder="Views" className="h-10 rounded-lg border border-border bg-background px-3 text-sm" />
          <input value={likes} onChange={(e) => setLikes(e.target.value)} placeholder="Likes" className="h-10 rounded-lg border border-border bg-background px-3 text-sm" />
          <input value={comments} onChange={(e) => setComments(e.target.value)} placeholder="Comments" className="h-10 rounded-lg border border-border bg-background px-3 text-sm" />
          <input value={shares} onChange={(e) => setShares(e.target.value)} placeholder="Shares" className="h-10 rounded-lg border border-border bg-background px-3 text-sm" />
          <input value={followers} onChange={(e) => setFollowers(e.target.value)} placeholder="Followers gained" className="h-10 rounded-lg border border-border bg-background px-3 text-sm col-span-2" />
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-4 space-y-3">
        <p className="text-sm font-semibold text-foreground">Reaction</p>
        <div className="flex gap-2 flex-wrap">
          {[
            { id: "better", label: "Better than expected" },
            { id: "as_expected", label: "As expected" },
            { id: "worse", label: "Worse than expected" },
          ].map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setReaction(r.id as "better" | "as_expected" | "worse")}
              className={`rounded-full px-4 py-2 text-sm border ${
                reaction === r.id ? "bg-foreground text-background border-foreground" : "border-border hover:bg-secondary"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-4 space-y-3">
        <p className="text-sm font-semibold text-foreground">Optional note</p>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
      </section>

      <div className="flex gap-3">
        <button type="button" onClick={() => void onSubmit()} disabled={saving} className="rounded-full bg-foreground text-background px-5 py-2.5 text-sm font-semibold hover:opacity-90 disabled:opacity-50">
          Get guidance
        </button>
        <button type="button" onClick={() => void onSkip()} className="rounded-full border border-border px-5 py-2.5 text-sm font-medium hover:bg-secondary">
          Skip
        </button>
      </div>
    </div>
  );
}
