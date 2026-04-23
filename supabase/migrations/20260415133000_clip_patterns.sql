create table if not exists public.clip_patterns (
  id uuid primary key default gen_random_uuid(),
  project_id text not null,
  clip_id uuid null references public.video_clips(id) on delete set null,
  pattern_type text not null,
  performance_label text null,
  outcome text null,
  reaction text null,
  signal_strength text null,
  created_at timestamptz not null default now()
);

create index if not exists clip_patterns_project_id_created_idx
  on public.clip_patterns(project_id, created_at desc);
create index if not exists clip_patterns_clip_id_created_idx
  on public.clip_patterns(clip_id, created_at desc);
create index if not exists clip_patterns_pattern_type_created_idx
  on public.clip_patterns(pattern_type, created_at desc);

alter table public.clip_patterns enable row level security;

drop policy if exists "Allow anon access clip_patterns" on public.clip_patterns;
create policy "Allow anon access clip_patterns"
  on public.clip_patterns for all
  using (true)
  with check (true);
