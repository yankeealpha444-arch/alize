-- Optional public URL for rendered clip video (worker uploads to storage).

alter table public.video_clips
  add column if not exists video_url text null;

comment on column public.video_clips.video_url is 'Public or signed URL to the clip MP4 after processing (e.g. clip-exports bucket).';
