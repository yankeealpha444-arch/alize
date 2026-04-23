create table if not exists public.distribution_jobs (
  id uuid primary key default gen_random_uuid(),
  project_id text not null,
  clip_id uuid not null references public.video_clips(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'sent', 'posted')),
  created_at timestamptz not null default now()
);

create table if not exists public.competition_runs (
  id uuid primary key default gen_random_uuid(),
  project_id text not null,
  clip_id uuid not null references public.video_clips(id) on delete cascade,
  caption text not null,
  rules text not null,
  created_at timestamptz not null default now()
);

create index if not exists distribution_jobs_project_id_created_idx
  on public.distribution_jobs(project_id, created_at desc);
create index if not exists distribution_jobs_clip_id_created_idx
  on public.distribution_jobs(clip_id, created_at desc);
create index if not exists competition_runs_project_id_created_idx
  on public.competition_runs(project_id, created_at desc);
create index if not exists competition_runs_clip_id_created_idx
  on public.competition_runs(clip_id, created_at desc);

alter table public.distribution_jobs enable row level security;
alter table public.competition_runs enable row level security;

drop policy if exists "Allow anon access distribution_jobs" on public.distribution_jobs;
create policy "Allow anon access distribution_jobs"
  on public.distribution_jobs for all
  using (true)
  with check (true);

drop policy if exists "Allow anon access competition_runs" on public.competition_runs;
create policy "Allow anon access competition_runs"
  on public.competition_runs for all
  using (true)
  with check (true);
