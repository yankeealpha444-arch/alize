-- AI Video Clipper MVP: contract extensions (YouTube URL / metadata).
-- Depends on: 20260414153000_video_clipper_backend.sql

alter table public.video_jobs
  add column if not exists source_kind text not null default 'upload';

alter table public.video_jobs
  add column if not exists source_url text null;

alter table public.video_jobs
  add column if not exists youtube_video_id text null;

alter table public.video_jobs
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.video_jobs
  drop constraint if exists video_jobs_source_kind_check;

alter table public.video_jobs
  add constraint video_jobs_source_kind_check
  check (source_kind in ('upload', 'youtube_url', 'youtube_id'));

comment on column public.video_jobs.source_kind is 'upload = file in video-uploads; youtube_* = URL or id ingest (worker fills paths).';
comment on column public.video_jobs.source_url is 'Original pasted URL when source_kind = youtube_url.';
comment on column public.video_jobs.youtube_video_id is 'Normalized 11-character YouTube video id when known.';
comment on column public.video_jobs.metadata is 'Pipeline version, title, duration_sec, worker correlation ids.';
