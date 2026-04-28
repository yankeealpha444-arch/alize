/**
 * vision-clip-hub entry: re-exports the shared clipper backend from the repo root.
 * Import via `@/lib/mvp/videoClipperBackend` so the hub owns a real file on the execution path.
 */
export * from "../../../../src/lib/mvp/videoClipperBackend";
