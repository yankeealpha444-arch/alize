// AI SAFE FILE
// UI LOCKED
// DO NOT MODIFY LAYOUT, STYLE, STRUCTURE, ROUTES, COPY, OR TEMPLATE
// ONLY FIX THE SPECIFIC REQUESTED LOGIC
// UI changes require: "UI change approved"

import LinkClipperMvp from "../../vision-clip-hub/src/pages/LinkClipperMvp";

export default function VideoMVP() {
  // PRODUCTION WIRING LOCK:
  // /video intentionally serves the same upload-only clipper as /clips.
  // Keep this aligned with src/pages/ClipSelectionPage.tsx.
  return <LinkClipperMvp />;
}
