-- Minimal schema for in-app tracking (`events` used by src/lib/trackingEvents.ts)
-- and UI health snapshots (`ui_health_checks`).

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  project_id text not null,
  event_name text not null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists events_project_id_idx on public.events (project_id);
create index if not exists events_created_at_idx on public.events (created_at desc);

alter table public.events enable row level security;

drop policy if exists "Allow anon insert events" on public.events;
create policy "Allow anon insert events"
  on public.events for insert
  to anon
  with check (true);

drop policy if exists "Allow anon select events" on public.events;
create policy "Allow anon select events"
  on public.events for select
  to anon
  using (true);

create table if not exists public.ui_health_checks (
  id uuid primary key default gen_random_uuid(),
  project_id text not null,
  page text not null,
  status text not null,
  health_report jsonb not null default '{}'::jsonb,
  issues jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists ui_health_checks_project_id_idx on public.ui_health_checks (project_id);
create index if not exists ui_health_checks_created_at_idx on public.ui_health_checks (created_at desc);

alter table public.ui_health_checks enable row level security;

drop policy if exists "Allow anon insert ui_health_checks" on public.ui_health_checks;
create policy "Allow anon insert ui_health_checks"
  on public.ui_health_checks for insert
  to anon
  with check (true);

drop policy if exists "Allow anon select ui_health_checks" on public.ui_health_checks;
create policy "Allow anon select ui_health_checks"
  on public.ui_health_checks for select
  to anon
  using (true);
