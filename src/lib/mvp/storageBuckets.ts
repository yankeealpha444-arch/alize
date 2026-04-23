/**
 * Supabase Storage bucket IDs for the video clipper.
 * Defaults match supabase/migrations/20260414153000_video_clipper_backend.sql.
 *
 * Override via Vite env when project bucket names differ (must match dashboard).
 */
export const STORAGE_BUCKET_VIDEO_UPLOADS =
  (import.meta.env.VITE_SUPABASE_STORAGE_BUCKET_VIDEO_UPLOADS as string | undefined) || "video-uploads";

/** Rendered/processed clip files, export artifacts, and public download URLs. */
export const STORAGE_BUCKET_CLIP_EXPORTS =
  (import.meta.env.VITE_SUPABASE_STORAGE_BUCKET_CLIP_EXPORTS as string | undefined) || "clip-exports";
