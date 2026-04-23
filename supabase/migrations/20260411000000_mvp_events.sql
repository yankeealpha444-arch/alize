-- Run in Supabase SQL editor if remote analytics are desired. Local buffer always works without this.
create table if not exists public.mvp_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  event_type text not null,
  project_id text not null,
  meta jsonb
);

create index if not exists mvp_events_project_id_idx on public.mvp_events (project_id);
create index if not exists mvp_events_created_at_idx on public.mvp_events (created_at desc);

alter table public.mvp_events enable row level security;

create policy "Allow anon insert mvp_events"
  on public.mvp_events for insert
  to anon
  with check (true);

create policy "Allow anon select own project mvp_events"
  on public.mvp_events for select
  to anon
  using (true);
