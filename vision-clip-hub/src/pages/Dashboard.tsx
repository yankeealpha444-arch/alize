import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  Link2,
  RefreshCw,
  Shuffle,
  Image as ImageIcon,
  Users,
  CheckCircle2,
  Trophy,
  ExternalLink,
  Clock,
  Sparkles,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";
import { z } from "zod";
import AlizeLogo from "@/components/AlizeLogo";
import { useFlow, flowStore, syncFlowStoreFromVideoMvpProject } from "@/store/flowStore";
import { formatTime } from "@/data/demoClips";
import { ensureVideoMvpProjectId } from "../../../src/lib/videoMvpProject";
import ThumbnailTestResultCard from "../../../src/components/mvp/ThumbnailTestResultCard";
import fallbackClipFrame from "@/assets/clip-thumb-1.jpg";
import fallbackThumb from "@/assets/thumb-clean.jpg";

type TrackingStatus = "waiting" | "live" | "ready";

const STATUS_LABEL: Record<TrackingStatus, string> = {
  waiting: "Status: Waiting for live data",
  live: "Status: Live",
  ready: "Status: Ready for recommendation",
};

type ValidationLevel = "no-data" | "testing" | "some-interest" | "strong-interest";

const VALIDATION_LABEL: Record<ValidationLevel, string> = {
  "no-data": "No data",
  testing: "Testing",
  "some-interest": "Some interest",
  "strong-interest": "Strong interest",
};

const youtubeUrlSchema = z
  .string()
  .trim()
  .min(1, "Paste a YouTube link")
  .url("Enter a valid URL")
  .refine(
    (v) => /(?:youtube\.com|youtu\.be)/i.test(v),
    "Must be a YouTube link",
  );

function formatStartedAt(ts?: number) {
  if (!ts) return "Just now";
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ago`;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { activeTest, selectedClip, selectedClipLabel, selectedThumbnail } = useFlow();

  useEffect(() => {
    syncFlowStoreFromVideoMvpProject(ensureVideoMvpProjectId());
  }, []);

  // Prefer active test data, fall back to selections carried from earlier steps
  const clip = activeTest?.clip ?? selectedClip;
  const thumbnail = activeTest?.thumbnail ?? selectedThumbnail;
  const clipName = selectedClipLabel ?? clip?.caption ?? "—";

  const [trackingUrl, setTrackingUrl] = useState(activeTest?.trackingUrl ?? "");
  const [tracking, setTracking] = useState(Boolean(activeTest?.trackingUrl));
  const [error, setError] = useState<string | null>(null);

  const hasData = tracking;
  const visitors = hasData ? activeTest?.visitors ?? 0 : 0;
  const copies = hasData ? activeTest?.copies ?? 0 : 0;
  const conv = visitors > 0 ? (copies / visitors) * 100 : 0;

  const validation: ValidationLevel = useMemo(() => {
    if (!hasData || visitors === 0) return "no-data";
    if (visitors < 50) return "testing";
    if (conv >= 8) return "strong-interest";
    if (conv >= 3) return "some-interest";
    return "testing";
  }, [hasData, visitors, conv]);

  const platform = "YouTube";

  // Tracking status: waiting → live → ready (when enough signal)
  const trackingStatus: TrackingStatus = !tracking
    ? "waiting"
    : validation === "strong-interest" || validation === "some-interest"
    ? "ready"
    : "live";

  const [feedback, setFeedback] = useState<"yes" | "no" | null>(null);
  const [feedbackNote, setFeedbackNote] = useState("");
  const [feedbackSent, setFeedbackSent] = useState(false);

  const handleStartTracking = () => {
    const result = youtubeUrlSchema.safeParse(trackingUrl);
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? "Invalid link");
      return;
    }
    setError(null);
    flowStore.startTracking(trackingUrl.trim());
    setTracking(true);
  };

  const handleAnotherTest = () => {
    flowStore.endTest();
    navigate("/clips");
  };

  const handleDifferentClip = () => {
    flowStore.endTest();
    navigate("/clips");
  };

  const handleChangeThumbnail = () => {
    navigate("/clips");
  };

  const handlePostAndTrack = () => {
    window.open("https://studio.youtube.com/channel/UC/videos/upload", "_blank", "noopener,noreferrer");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/40 px-4 py-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl flex items-center justify-between">
          <AlizeLogo />
          <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Step 5 of 5
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 max-w-2xl">
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Your results
          </h1>
          <p className="mt-2 text-muted-foreground">
            Track which clip and thumbnail actually perform once your video is live.
          </p>
        </div>

        <div className="mb-8">
          <ThumbnailTestResultCard projectId={ensureVideoMvpProjectId()} />
        </div>

        {/* Current test summary */}
        <section className="rounded-xl border border-border/60 bg-card p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Current test
            </p>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                trackingStatus === "ready"
                  ? "border-foreground bg-foreground text-background"
                  : trackingStatus === "live"
                  ? "border-foreground text-foreground"
                  : "border-border text-muted-foreground"
              }`}
            >
              <Activity className={`h-3 w-3 ${tracking ? "animate-pulse" : ""}`} />
              {STATUS_LABEL[trackingStatus]}
            </span>
          </div>

          {!clip && !thumbnail ? (
            <div className="mt-4 rounded-md border border-dashed border-border bg-background p-4">
              <p className="text-sm text-foreground">
                No selection yet — go back to pick a clip and thumbnail.
              </p>
              <button
                type="button"
                onClick={() => navigate("/clips")}
                className="mt-3 inline-flex items-center justify-center rounded-md border border-foreground px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-foreground hover:text-background"
              >
                Go to selection
              </button>
            </div>
          ) : (
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto]">
              {/* Clip preview */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Clip
                </p>
                <div className="mt-2 aspect-video w-full overflow-hidden rounded-md border border-border/40 bg-muted">
                  <img
                    src={clip?.thumbnail_url || fallbackClipFrame}
                    alt={clipName}
                    className={`h-full w-full object-cover ${clip ? "" : "opacity-60"}`}
                  />
                </div>
                <p className="mt-2 truncate text-sm font-semibold text-foreground">
                  {clip ? clipName : "No clip selected"}
                </p>
                {clip && (
                  <p className="text-xs text-muted-foreground">
                    {formatTime(clip.start_time)}–{formatTime(clip.end_time)}
                  </p>
                )}
              </div>

              {/* Thumbnail preview */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Thumbnail
                </p>
                <div className="mt-2 aspect-video w-full overflow-hidden rounded-md border border-border/40 bg-muted">
                  <img
                    src={thumbnail?.src || fallbackThumb}
                    alt={thumbnail?.name ?? "Thumbnail preview"}
                    className={`h-full w-full object-cover ${thumbnail ? "" : "opacity-60"}`}
                  />
                </div>
                <p className="mt-2 truncate text-sm font-semibold text-foreground">
                  {thumbnail?.name ?? "No thumbnail selected"}
                </p>
                <p className="text-xs text-muted-foreground">Platform: {platform}</p>
              </div>

              <div className="rounded-md border border-border/40 bg-background p-3 lg:min-w-[140px] lg:self-start">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Started
                </p>
                <p className="mt-1 truncate text-sm font-semibold text-foreground">
                  {tracking ? formatStartedAt(activeTest?.trackingStartedAt) : "Not started"}
                </p>
              </div>
            </div>
          )}
        </section>

        {/* Empty state / Start tracking */}
        {!tracking && (
          <section className="mt-6 rounded-xl border border-dashed border-border bg-card p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Start tracking
            </p>
            {!clip || !thumbnail ? (
              <p className="mt-2 text-sm text-muted-foreground">
                No selection yet — go back to pick a clip and thumbnail.
              </p>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                Post your selected clip and thumbnail, then paste your live video link below.
              </p>
            )}
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <div className="flex-1">
                <label htmlFor="yt-link" className="sr-only">
                  Paste your YouTube video link
                </label>
                <div className="flex items-center gap-2 rounded-md border border-border bg-background px-3">
                  <Link2 className="h-4 w-4 text-muted-foreground" />
                  <input
                    id="yt-link"
                    type="url"
                    value={trackingUrl}
                    onChange={(e) => setTrackingUrl(e.target.value)}
                    placeholder="Paste your YouTube video link"
                    disabled={!clip || !thumbnail}
                    className="w-full bg-transparent py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none disabled:cursor-not-allowed disabled:text-muted-foreground"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={handleStartTracking}
                disabled={!clip || !thumbnail}
                className="inline-flex items-center justify-center rounded-md px-4 py-2.5 text-sm font-semibold transition-colors bg-foreground text-background hover:scale-[1.01] active:scale-100 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground disabled:hover:scale-100"
              >
                Start tracking
              </button>
            </div>
            {(!clip || !thumbnail) && (
              <p className="mt-2 text-xs text-muted-foreground">
                Select a clip and thumbnail to start tracking.
              </p>
            )}
            {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
          </section>
        )}

        {/* Tracking-live confirmation */}
        {tracking && (
          <section className="mt-6 rounded-xl border border-foreground bg-foreground p-5 text-background">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              <p className="text-xs font-semibold uppercase tracking-widest">Tracking is live</p>
            </div>
            <p className="mt-2 text-sm text-background/90">
              We are now tracking this post and comparing clip and thumbnail performance.
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-md border border-background/20 bg-background/5 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-background/60">
                  Connected video
                </p>
                {activeTest?.trackingUrl ? (
                  <a
                    href={activeTest.trackingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-flex items-center gap-1.5 truncate text-sm font-medium text-background underline-offset-2 hover:underline"
                  >
                    <span className="truncate">{activeTest.trackingUrl}</span>
                    <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                  </a>
                ) : (
                  <p className="mt-1 text-sm text-background/80">Not connected</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-md border border-background/20 bg-background/5 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-background/60">
                    Status
                  </p>
                  <p className="mt-1 text-sm font-semibold">Tracking live</p>
                </div>
                <div className="rounded-md border border-background/20 bg-background/5 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-background/60">
                    Started
                  </p>
                  <p className="mt-1 text-sm font-semibold">
                    {formatStartedAt(activeTest?.trackingStartedAt)}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="flex items-center gap-3 rounded-md border border-background/20 bg-background/5 p-3">
                <div className="h-12 w-16 shrink-0 overflow-hidden rounded border border-background/20 bg-background/10">
                  {clip?.thumbnail_url && (
                    <img src={clip.thumbnail_url} alt="" className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-background/60">
                    Clip
                  </p>
                  <p className="truncate text-sm font-semibold">{clipName}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-md border border-background/20 bg-background/5 p-3">
                <div className="h-12 w-16 shrink-0 overflow-hidden rounded border border-background/20 bg-background/10">
                  {thumbnail?.src && (
                    <img src={thumbnail.src} alt="" className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-background/60">
                    Thumbnail
                  </p>
                  <p className="truncate text-sm font-semibold">{thumbnail?.name ?? "No thumbnail"}</p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Metrics */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
          <Metric label="Views" value={hasData ? visitors.toLocaleString() : "—"} />
          <Metric label="Click-through rate" value={hasData ? `${conv.toFixed(1)}%` : "—"} />
          <Metric label="Best clip" value={hasData ? clipName : "—"} />
          <Metric label="Best thumbnail" value={hasData ? thumbnail?.name ?? "—" : "—"} />
          <Metric label="Validation" value={VALIDATION_LABEL[validation]} />
        </div>

        {/* Winning creative */}
        <section className="mt-6 rounded-xl border border-border/60 bg-card p-5">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-foreground" />
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Winning creative
            </p>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {hasData
              ? "Gathering signal — we'll mark the winners as soon as the data is conclusive."
              : "Once views start coming in, we'll identify what actually performs best."}
          </p>

          <div className="mt-4 grid gap-3 lg:grid-cols-3">
            <WinnerCard
              label="Winning clip"
              name={hasData ? clipName : "Awaiting data"}
              imageSrc={clip?.thumbnail_url || fallbackClipFrame}
              pending={!hasData}
            />
            <WinnerCard
              label="Winning thumbnail"
              name={hasData ? thumbnail?.name ?? "Awaiting data" : "Awaiting data"}
              imageSrc={thumbnail?.src || fallbackThumb}
              pending={!hasData}
            />
            <div className="rounded-md border border-dashed border-border bg-background p-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Recommended next step
              </p>
              <p className="mt-1.5 text-sm text-foreground/90">
                {hasData
                  ? "Reuse the winning clip and thumbnail style on your next upload."
                  : "Keep the test live for 24–48 hours, then return for a recommendation."}
              </p>
            </div>
          </div>
        </section>

        {/* Recommendation */}
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <section className="rounded-xl border border-border/60 bg-card p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              AI insight
            </p>
            <p className="mt-2 text-sm text-foreground/90">
              {hasData
                ? "Your clip and thumbnail are gathering data. We'll surface the winner as views come in."
                : "We'll compare which clip and thumbnail actually perform best once your post is live."}
            </p>
          </section>
          <section className="rounded-xl border border-border/60 bg-card p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Next step
            </p>
            <p className="mt-2 text-sm text-foreground/90">
              {hasData
                ? "Let the test run, then use the winning clip and thumbnail to guide your next upload."
                : "Post your selected clip, apply your thumbnail, then return here to track what wins."}
            </p>
          </section>
        </div>

        {/* Time expectation */}
        <div className="mt-4 inline-flex items-center gap-2 rounded-md border border-border/60 bg-card px-3 py-2 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          Results typically appear within 24–48 hours.
        </div>

        {/* User feedback */}
        <section className="mt-6 rounded-xl border border-border/60 bg-card p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Your feedback
          </p>
          {feedbackSent ? (
            <div className="mt-2 flex items-center gap-2 text-sm text-foreground">
              <CheckCircle2 className="h-4 w-4" />
              Thanks — we'll factor this into your next set of clips.
            </div>
          ) : (
            <>
              <p className="mt-2 text-base font-semibold text-foreground">
                Did this clip perform as expected?
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Quick feedback helps us improve your next version.
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:max-w-md">
                <button
                  type="button"
                  onClick={() => setFeedback("yes")}
                  aria-pressed={feedback === "yes"}
                  className={`inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-4 text-base font-semibold transition-colors ${
                    feedback === "yes"
                      ? "border-foreground bg-foreground text-background"
                      : "border-border text-foreground hover:border-foreground/60"
                  }`}
                >
                  <span className="text-xl leading-none grayscale" aria-hidden>👍</span>
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => setFeedback("no")}
                  aria-pressed={feedback === "no"}
                  className={`inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-4 text-base font-semibold transition-colors ${
                    feedback === "no"
                      ? "border-foreground bg-foreground text-background"
                      : "border-border text-foreground hover:border-foreground/60"
                  }`}
                >
                  <span className="text-xl leading-none grayscale" aria-hidden>👎</span>
                  No
                </button>
              </div>
              {feedback === "no" && (
                <div className="mt-3">
                  <label
                    htmlFor="feedback-note"
                    className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground"
                  >
                    What felt off?
                  </label>
                  <input
                    id="feedback-note"
                    type="text"
                    value={feedbackNote}
                    onChange={(e) => setFeedbackNote(e.target.value)}
                    placeholder="Hook was weak, thumbnail didn't match, etc."
                    className="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-foreground/60 focus:outline-none"
                  />
                </div>
              )}
              {feedback && (
                <button
                  type="button"
                  onClick={() => setFeedbackSent(true)}
                  className="mt-3 inline-flex items-center justify-center rounded-md bg-foreground px-3 py-2 text-xs font-semibold text-background hover:scale-[1.01] active:scale-100"
                >
                  Send feedback
                </button>
              )}
            </>
          )}
        </section>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={handleAnotherTest}
            disabled={!clip || !thumbnail}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-md bg-foreground px-4 py-3 text-sm font-semibold text-background transition-colors hover:scale-[1.01] active:scale-100 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground disabled:hover:scale-100"
          >
            <Sparkles className="h-4 w-4" />
            Improve next version
          </button>
          {!tracking ? (
            <button
              type="button"
              onClick={handlePostAndTrack}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-md border border-foreground px-4 py-3 text-sm font-semibold text-foreground transition-transform hover:scale-[1.01] active:scale-100"
            >
              <Activity className="h-4 w-4" />
              Post and track this test
            </button>
          ) : (
            <button
              type="button"
              onClick={handleAnotherTest}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-md border border-foreground px-4 py-3 text-sm font-semibold text-foreground transition-transform hover:scale-[1.01] active:scale-100"
            >
              <RefreshCw className="h-4 w-4" />
              Run another test
            </button>
          )}
          <button
            type="button"
            onClick={handleDifferentClip}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-md border border-border px-4 py-3 text-sm font-medium text-foreground hover:border-foreground/60"
          >
            <Shuffle className="h-4 w-4" />
            Try another clip
          </button>
          <button
            type="button"
            onClick={handleChangeThumbnail}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-md border border-border px-4 py-3 text-sm font-medium text-foreground hover:border-foreground/60"
          >
            <ImageIcon className="h-4 w-4" />
            Change thumbnail
          </button>
          <button
            type="button"
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-md border border-border px-4 py-3 text-sm font-medium text-foreground hover:border-foreground/60"
          >
            <Users className="h-4 w-4" />
            Get users
          </button>
        </div>
      </main>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-4 sm:p-5">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 truncate font-display text-2xl font-bold text-foreground sm:text-3xl">
        {value}
      </p>
    </div>
  );
}

function WinnerCard({
  label,
  name,
  imageSrc,
  pending,
}: {
  label: string;
  name: string;
  imageSrc?: string | null;
  pending: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-border/60 bg-background p-3">
      <div className="h-14 w-20 shrink-0 overflow-hidden rounded border border-border/40 bg-muted">
        {imageSrc ? (
          <img
            src={imageSrc}
            alt=""
            className={`h-full w-full object-cover ${pending ? "opacity-60" : ""}`}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <ImageIcon className="h-4 w-4" />
          </div>
        )}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          {label}
        </p>
        <p className="mt-0.5 truncate text-sm font-semibold text-foreground">{name}</p>
        {pending && (
          <p className="mt-0.5 text-[11px] text-muted-foreground">Pending data</p>
        )}
      </div>
    </div>
  );
}
