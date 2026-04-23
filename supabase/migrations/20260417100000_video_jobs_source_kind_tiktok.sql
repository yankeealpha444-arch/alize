-- Allow TikTok pasted links to be stored distinctly (worker rejects until supported).

alter table public.video_jobs
  drop constraint if exists video_jobs_source_kind_check;

alter table public.video_jobs
  add constraint video_jobs_source_kind_check
  check (source_kind in ('upload', 'youtube_url', 'youtube_id', 'remote_url', 'tiktok_url'));
