import type { TrackingEvent } from "@/lib/trackingEvents";

export type FounderLoopBottleneck =
  | "generation"
  | "presentation"
  | "value"
  | "reliability"
  | "none";

export type FounderLoopSummary = {
  counts: {
    sessionsStarted: number;
    linksSubmitted: number;
    clipsGenerated: number;
    clipsPlayed: number;
    clipsDownloaded: number;
    generationFailed: number;
  };
  currentStatus: string;
  biggestBottleneck: string;
  nextBestAction: string;
  suggestedExperiment: string;
};

function count(events: TrackingEvent[], type: TrackingEvent["type"]): number {
  return events.filter((e) => e.type === type).length;
}

export function summarizeFounderLoop(events: TrackingEvent[]): FounderLoopSummary {
  const sessionsStarted = count(events, "session_started");
  const linksSubmitted = count(events, "link_submitted");
  const clipsGenerated = count(events, "clips_generated");
  const clipsPlayed = count(events, "clip_played");
  const clipsDownloaded = count(events, "clip_downloaded");
  const generationFailed = count(events, "generation_failed");

  const genSuccessRate = linksSubmitted > 0 ? clipsGenerated / linksSubmitted : 0;
  const playRate = clipsGenerated > 0 ? clipsPlayed / clipsGenerated : 0;
  const downloadRate = clipsPlayed > 0 ? clipsDownloaded / clipsPlayed : 0;
  const failureRate = linksSubmitted > 0 ? generationFailed / linksSubmitted : 0;

  let bottleneck: FounderLoopBottleneck = "none";
  if (failureRate >= 0.3 || generationFailed >= 3) {
    bottleneck = "reliability";
  } else if (linksSubmitted >= 3 && genSuccessRate < 0.6) {
    bottleneck = "generation";
  } else if (clipsGenerated >= 3 && playRate < 0.5) {
    bottleneck = "presentation";
  } else if (clipsPlayed >= 3 && downloadRate < 0.4) {
    bottleneck = "value";
  }

  const currentStatus =
    linksSubmitted === 0
      ? "No clipper usage yet. Start driving first founder test sessions."
      : bottleneck === "none"
        ? "Core clipper loop is working. Users are progressing through generation and output usage."
        : "Users are entering the loop, but one stage is clearly underperforming.";

  const biggestBottleneck =
    bottleneck === "reliability"
      ? "Reliability bottleneck: generation failures are too frequent."
      : bottleneck === "generation"
        ? "Generation bottleneck: many links are submitted, but too few clips are generated."
        : bottleneck === "presentation"
          ? "Results presentation bottleneck: clips are generated, but too few are played."
          : bottleneck === "value"
            ? "Output value bottleneck: clips are played, but too few are downloaded."
            : "No single bottleneck detected from current signal volume.";

  const nextBestAction =
    bottleneck === "reliability"
      ? "Stabilize generation path first; reduce failed requests before optimizing UX."
      : bottleneck === "generation"
        ? "Instrument and debug link-to-generation path for valid public video URLs."
        : bottleneck === "presentation"
          ? "Make generated clips immediately legible and obviously playable in the results section."
          : bottleneck === "value"
            ? "Increase perceived output quality so users choose to download."
            : "Increase traffic to gather stronger signal and keep this loop stable.";

  const suggestedExperiment =
    bottleneck === "reliability"
      ? "Run a 20-link reliability sweep (mixed YouTube/public URLs) and log fail reasons by URL type."
      : bottleneck === "generation"
        ? "Test clearer inline guidance for acceptable links and compare clips_generated/link_submitted rate."
        : bottleneck === "presentation"
          ? "A/B test result card hierarchy (preview-first vs label-first) and compare clip_played/clips_generated."
          : bottleneck === "value"
            ? "A/B test clip ordering/caption quality and compare clip_downloaded/clip_played."
            : "Run 15 founder-invited sessions and evaluate funnel ratios after baseline traffic doubles.";

  return {
    counts: {
      sessionsStarted,
      linksSubmitted,
      clipsGenerated,
      clipsPlayed,
      clipsDownloaded,
      generationFailed,
    },
    currentStatus,
    biggestBottleneck,
    nextBestAction,
    suggestedExperiment,
  };
}
