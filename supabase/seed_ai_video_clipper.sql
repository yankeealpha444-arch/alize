-- Seed data for local / CI testing: AI Video Clipper MVP.
-- Apply after all migrations. Fixed UUIDs for deterministic tests.
-- Safe to re-run: uses ON CONFLICT on primary keys where applicable.

insert into public.video_jobs (
  id,
  project_id,
  source_path,
  source_filename,
  source_size_bytes,
  source_mime_type,
  source_kind,
  source_url,
  youtube_video_id,
  metadata,
  status,
  selected_clip_id,
  error_message,
  created_at,
  updated_at
) values (
  '11111111-1111-4111-8111-111111111101'::uuid,
  'seed-project-ai-clipper',
  'seed-project-ai-clipper/11111111-1111-4111-8111-111111111101/sample.mp4',
  'sample.mp4',
  10485760,
  'video/mp4',
  'upload',
  null,
  null,
  '{"seed": true, "pipeline": "test"}'::jsonb,
  'completed',
  '22222222-2222-4222-8222-222222222201'::uuid,
  null,
  now() - interval '2 hours',
  now() - interval '1 hour'
)
on conflict (id) do nothing;

insert into public.video_clips (
  id,
  job_id,
  project_id,
  label,
  start_time_sec,
  end_time_sec,
  duration_sec,
  score,
  caption,
  thumbnail_url,
  status,
  created_at
) values
  (
    '22222222-2222-4222-8222-222222222201'::uuid,
    '11111111-1111-4111-8111-111111111101'::uuid,
    'seed-project-ai-clipper',
    'Hook — problem',
    0,
    58,
    58,
    92.50,
    'The one tweak that doubled retention.',
    null,
    'selected',
    now() - interval '90 minutes'
  ),
  (
    '22222222-2222-4222-8222-222222222202'::uuid,
    '11111111-1111-4111-8111-111111111101'::uuid,
    'seed-project-ai-clipper',
    'Payoff — CTA',
    120,
    175,
    55,
    88.00,
    'Save this for your next launch.',
    null,
    'ready',
    now() - interval '89 minutes'
  )
on conflict (id) do nothing;

insert into public.clip_exports (
  id,
  clip_id,
  project_id,
  status,
  storage_path,
  download_url,
  created_at
) values (
  '33333333-3333-4333-8333-333333333301'::uuid,
  '22222222-2222-4222-8222-222222222201'::uuid,
  'seed-project-ai-clipper',
  'ready',
  'seed-project-ai-clipper/11111111-1111-4111-8111-111111111101/22222222-2222-4222-8222-222222222201/export.mp4',
  null,
  now() - interval '30 minutes'
)
on conflict (id) do nothing;

insert into public.clip_feedback (
  id,
  clip_id,
  project_id,
  feedback,
  created_at
) values (
  '44444444-4444-4444-8444-444444444401'::uuid,
  '22222222-2222-4222-8222-222222222201'::uuid,
  'seed-project-ai-clipper',
  'saves',
  now() - interval '20 minutes'
)
on conflict (id) do nothing;

insert into public.mvp_events (id, event_type, project_id, meta) values
  (
    '55555555-5555-4555-8555-555555555501'::uuid,
    'video_clipper_processing_completed',
    'seed-project-ai-clipper',
    '{"job_id": "11111111-1111-4111-8111-111111111101", "clip_count": 2}'::jsonb
  ),
  (
    '55555555-5555-4555-8555-555555555502'::uuid,
    'video_clipper_clip_selected',
    'seed-project-ai-clipper',
    '{"job_id": "11111111-1111-4111-8111-111111111101", "clip_id": "22222222-2222-4222-8222-222222222201"}'::jsonb
  )
on conflict (id) do nothing;
