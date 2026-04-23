create extension if not exists pgcrypto;

create table if not exists public.video_jobs (
  id uuid primary key default gen_random_uuid(),
  project_id text not null,
  source_path text not null,
  source_filename text not null,
  source_size_bytes bigint not null default 0,
  source_mime_type text,
  status text not null default 'queued' check (status in ('queued', 'processing', 'completed', 'failed')),
  selected_clip_id uuid null,
  error_message text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.video_clips (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.video_jobs(id) on delete cascade,
  project_id text not null,
  label text not null,
  start_time_sec integer not null default 0,
  end_time_sec integer not null default 0,
  duration_sec integer not null default 0,
  score numeric(5,2) not null default 0,
  caption text null,
  thumbnail_url text null,
  status text not null default 'ready' check (status in ('ready', 'selected', 'exported', 'failed')),
  created_at timestamptz not null default now()
);

create table if not exists public.clip_exports (
  id uuid primary key default gen_random_uuid(),
  clip_id uuid not null references public.video_clips(id) on delete cascade,
  project_id text not null,
  status text not null default 'created' check (status in ('created', 'ready', 'failed')),
  storage_path text null,
  download_url text null,
  created_at timestamptz not null default now()
);

create table if not exists public.clip_feedback (
  id uuid primary key default gen_random_uuid(),
  clip_id uuid not null references public.video_clips(id) on delete cascade,
  project_id text not null,
  feedback text not null check (feedback in ('saves', 'likes', 'none')),
  created_at timestamptz not null default now()
);

create index if not exists video_jobs_project_id_created_idx
  on public.video_jobs(project_id, created_at desc);
create index if not exists video_clips_project_id_created_idx
  on public.video_clips(project_id, created_at desc);
create index if not exists video_clips_job_id_idx
  on public.video_clips(job_id);
create index if not exists clip_exports_project_id_created_idx
  on public.clip_exports(project_id, created_at desc);
create index if not exists clip_feedback_clip_id_created_idx
  on public.clip_feedback(clip_id, created_at desc);

alter table public.video_jobs enable row level security;
alter table public.video_clips enable row level security;
alter table public.clip_exports enable row level security;
alter table public.clip_feedback enable row level security;

drop policy if exists "Allow anon access video_jobs" on public.video_jobs;
create policy "Allow anon access video_jobs"
  on public.video_jobs for all
  using (true)
  with check (true);

drop policy if exists "Allow anon access video_clips" on public.video_clips;
create policy "Allow anon access video_clips"
  on public.video_clips for all
  using (true)
  with check (true);

drop policy if exists "Allow anon access clip_exports" on public.clip_exports;
create policy "Allow anon access clip_exports"
  on public.clip_exports for all
  using (true)
  with check (true);

drop policy if exists "Allow anon access clip_feedback" on public.clip_feedback;
create policy "Allow anon access clip_feedback"
  on public.clip_feedback for all
  using (true)
  with check (true);

insert into storage.buckets (id, name, public)
values ('video-uploads', 'video-uploads', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('clip-exports', 'clip-exports', true)
on conflict (id) do nothing;

drop policy if exists "Allow anon upload video-uploads" on storage.objects;
create policy "Allow anon upload video-uploads"
  on storage.objects for insert
  with check (bucket_id = 'video-uploads');

drop policy if exists "Allow anon read video-uploads" on storage.objects;
create policy "Allow anon read video-uploads"
  on storage.objects for select
  using (bucket_id = 'video-uploads');

drop policy if exists "Allow anon upload clip-exports" on storage.objects;
create policy "Allow anon upload clip-exports"
  on storage.objects for insert
  with check (bucket_id = 'clip-exports');

drop policy if exists "Allow anon read clip-exports" on storage.objects;
create policy "Allow anon read clip-exports"
  on storage.objects for select
  using (bucket_id = 'clip-exports');

