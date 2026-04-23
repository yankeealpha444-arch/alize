/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PEXELS_API_KEY?: string;
  readonly VITE_GOOGLE_CLIENT_ID?: string;
  /** When `"true"`, show preview router diagnostics and dev-only scaffolding. */
  readonly VITE_ALIZE_PREVIEW_DEBUG?: string;
  /** Optional override; default `video-uploads` (raw source uploads). */
  readonly VITE_SUPABASE_STORAGE_BUCKET_VIDEO_UPLOADS?: string;
  /** Optional override; default `clip-exports` (exports + worker-rendered clips). */
  readonly VITE_SUPABASE_STORAGE_BUCKET_CLIP_EXPORTS?: string;
  /**
   * Comma-separated founder emails (case-insensitive). Used with Supabase Auth for founder-only routes.
   * Alternatively set `role: "founder"` or `"admin"` on the user in Supabase `user_metadata` / `app_metadata`.
   */
  readonly VITE_FOUNDER_EMAILS?: string;
  /** Base URL of the Node server (`server/vizardServer.mjs`), e.g. http://localhost:8787 — no API key here. */
  readonly VITE_VIZARD_BACKEND_URL?: string;
}
