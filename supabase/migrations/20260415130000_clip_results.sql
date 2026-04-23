create table if not exists public.clip_results (
  id uuid primary key default gen_random_uuid(),
  project_id text not null,
  clip_id uuid not null references public.video_clips(id) on delete cascade,
  outcome text not null,
  views integer null,
  likes integer null,
  comments integer null,
  shares integer null,
  followers_gained integer null,
  reaction text null,
  note text null,
  created_at timestamptz not null default now()
);

create index if not exists clip_results_project_id_created_idx
  on public.clip_results(project_id, created_at desc);
create index if not exists clip_results_clip_id_created_idx
  on public.clip_results(clip_id, created_at desc);

alter table public.clip_results enable row level security;

drop policy if exists "Allow anon access clip_results" on public.clip_results;
create policy "Allow anon access clip_results"
  on public.clip_results for all
  using (true)
  with check (true);
