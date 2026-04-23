# AI Video Clipper MVP — Backend Contract

YouTube long-form video → AI-suggested shorts. This document is the source of truth for tables, states, storage, events, and UI data dependencies. **UI is not specified here beyond read/write mapping.**

---

## 1. Required tables

| Table | Role |
|-------|------|
| `video_jobs` | One ingest + processing run per uploaded source (or future URL ingest). |
| `video_clips` | Candidate segments produced for a job. |
| `clip_exports` | Rendered/exported file for a chosen clip (links to Storage). |
| `clip_feedback` | Lightweight “performance” signal per clip (MVP: saves/likes/none). |
| `mvp_events` | Optional analytics (`event_type`, `project_id`, `meta`). Already exists app-wide. |
| Storage buckets `video-uploads`, `clip-exports` | Raw source and exported assets (see §4). |

`public.projects` remains the owning context for `project_id` (text) on clipper rows; no FK from clipper tables to `projects` in current migrations (string correlation only).

---

## 2. Required columns

### `video_jobs`

| Column | Type | Notes |
|--------|------|--------|
| `id` | `uuid` PK | Job id. |
| `project_id` | `text` NOT NULL | Client project key. |
| `source_path` | `text` | Storage path in `video-uploads` (upload flow). |
| `source_filename` | `text` | Original filename. |
| `source_size_bytes` | `bigint` | |
| `source_mime_type` | `text` | Nullable. |
| `source_kind` | `text` NOT NULL | `upload` \| `youtube_url` \| `youtube_id` (extended in migration `20260415100000`). |
| `source_url` | `text` | Nullable; pasted URL when `youtube_url`. |
| `youtube_video_id` | `text` | Nullable; normalized 11-char id when known. |
| `metadata` | `jsonb` | Pipeline/version, title, duration hints, worker ids (default `{}`). |
| `status` | `text` NOT NULL | `queued` → `processing` → `completed` \| `failed`. |
| `selected_clip_id` | `uuid` FK logical → `video_clips.id` | Nullable until user picks a clip. |
| `error_message` | `text` | Nullable. |
| `created_at`, `updated_at` | `timestamptz` | |

### `video_clips`

| Column | Type | Notes |
|--------|------|--------|
| `id` | `uuid` PK | |
| `job_id` | `uuid` NOT NULL FK → `video_jobs.id` ON DELETE CASCADE | |
| `project_id` | `text` NOT NULL | Denormalized filter. |
| `label` | `text` | e.g. “Clip 1”. |
| `start_time_sec`, `end_time_sec`, `duration_sec` | `integer` | |
| `score` | `numeric(5,2)` | Ranking signal. |
| `caption` | `text` | Nullable. |
| `thumbnail_url` | `text` | Nullable (URL or storage path, product decision). |
| `status` | `text` NOT NULL | See §3. |
| `created_at` | `timestamptz` | |

### `clip_exports`

| Column | Type | Notes |
|--------|------|--------|
| `id` | `uuid` PK | |
| `clip_id` | `uuid` NOT NULL FK → `video_clips.id` ON DELETE CASCADE | |
| `project_id` | `text` NOT NULL | |
| `status` | `text` NOT NULL | See §3. |
| `storage_path` | `text` | Path in `clip-exports` when ready. |
| `download_url` | `text` | Public/signed URL when ready. |
| `created_at` | `timestamptz` | |

### `clip_feedback`

| Column | Type | Notes |
|--------|------|--------|
| `id` | `uuid` PK | |
| `clip_id` | `uuid` NOT NULL FK → `video_clips.id` ON DELETE CASCADE | |
| `project_id` | `text` NOT NULL | |
| `feedback` | `text` NOT NULL | `saves` \| `likes` \| `none`. |
| `created_at` | `timestamptz` | |

### `mvp_events` (existing)

| Column | Type | Notes |
|--------|------|--------|
| `event_type` | `text` | App-defined; clipper events in §5. |
| `project_id` | `text` | |
| `meta` | `jsonb` | Optional `job_id`, `clip_id`, etc. |

---

## 3. State machines

### Job (`video_jobs.status`)

```
queued → processing → completed
                   ↘ failed
```

- **queued**: Row created; worker not started or not finished enqueue.
- **processing**: Download/transcode/AI segmentation running.
- **completed**: Clips written; job usable for selection/export.
- **failed**: `error_message` set; clips may be empty or partial.

### Clip (`video_clips.status`)

```
ready → selected → exported
              ↘ failed
```

- **ready**: Shown in UI as selectable.
- **selected**: User’s current choice for this job (align with `video_jobs.selected_clip_id`).
- **exported**: At least one successful `clip_exports` for this clip (terminal for MVP success path).
- **failed**: Generation/export error for this clip (optional use).

### Export (`clip_exports.status`)

```
created → ready
       ↘ failed
```

- **created**: Row inserted before upload completes.
- **ready**: `storage_path` / `download_url` populated.
- **failed**: Export pipeline error.

---

## 4. Storage paths

Convention (align workers and client):

| Bucket | Purpose | Path pattern |
|--------|---------|--------------|
| `video-uploads` | Raw long-form input | `{project_id}/{job_id}/{source_filename}` (or sanitized name). |
| `clip-exports` | Rendered short | `{project_id}/{job_id}/{clip_id}/export.{mp4\|webm}` |

- **Private bucket** `video-uploads`: server-side or signed URL for reads in production.
- **Public bucket** `clip-exports` (current migration): suitable for direct `download_url` in MVP; tighten later.

---

## 5. Event model

### Database: `mvp_events`

Suggested `event_type` values for clipper (string contract; extend as needed):

| `event_type` | Typical `meta` |
|--------------|----------------|
| `video_clipper_job_created` | `{ "job_id", "source_kind" }` |
| `video_clipper_processing_started` | `{ "job_id" }` |
| `video_clipper_processing_completed` | `{ "job_id", "clip_count" }` |
| `video_clipper_processing_failed` | `{ "job_id", "error" }` |
| `video_clipper_clip_selected` | `{ "job_id", "clip_id" }` |
| `video_clipper_export_started` | `{ "clip_id", "export_id" }` |
| `video_clipper_export_ready` | `{ "clip_id", "export_id" }` |
| `video_clipper_feedback` | `{ "clip_id", "feedback" }` |

### Client: `trackEvent` (`src/lib/trackingEvents.ts`)

UI may emit typed client events (local + optional Supabase via `mvpEventTracking`). Keep names aligned with product analytics; DB `mvp_events` can mirror the same vocabulary in `event_type` / `meta`.

---

## 6. Happy path

1. Client ensures a **project id** (string) exists in app state / `projects` upsert as today.
2. **Upload** (or future: submit YouTube URL) → Storage object in `video-uploads` → insert `video_jobs` (`status = queued`, `source_kind = upload`).
3. Worker (or simulated pipeline) sets `processing` → writes N `video_clips` → sets job `completed` and clips `ready`.
4. User **selects** a clip → update `video_jobs.selected_clip_id`, set chosen clip `selected`, others `ready`.
5. User **exports** → insert `clip_exports` (`created`) → upload to `clip-exports` → `ready` with `storage_path` / `download_url` → clip `exported`.
6. Optional: user sets **feedback** → insert `clip_feedback`.

---

## 7. Which UI actions need real IDs

| Action | IDs required |
|--------|----------------|
| Poll / show job + clips | `project_id`; optionally `job_id` for deep link. |
| Select clip | `job_id`, `clip_id` (uuid). |
| Export | `job_id`, `clip_id`; response gives `export_id`. |
| Download | `clip_id` + latest `clip_exports.id` or `storage_path` / `download_url`. |
| Feedback | `clip_id`. |
| Analytics | `project_id`; `job_id` / `clip_id` / `export_id` in `meta` recommended. |

Upload creates the **job** row; all clip/export rows reference **`job_id`** and **`clip_id`** as real UUIDs from the database.

---

## 8. Supabase SQL migration

See `supabase/migrations/20260415100000_ai_video_clipper_contract.sql` (additive on `20260414153000_video_clipper_backend.sql`).

---

## 9. Seed test inserts

See `supabase/seed_ai_video_clipper.sql`. Run against a database that has already applied all migrations.

---

## 10. UI components → tables

| Component / module | Reads | Writes (via backend) |
|---------------------|--------|------------------------|
| `VideoClipperMVP` | `video_jobs`, `video_clips`, `clip_exports`, `clip_feedback` (via `fetchClipperState`), Storage URLs | Same + `video-uploads` upload |
| `PublicMVP` | Does not query clipper tables directly; passes `projectId` into `VideoClipperMVP` | `projects` (existing flow) |
| `GrowthToolApp` | Same as PublicMVP for routing | — |
| `IdeaExperienceShell` | — | — |
| `videoClipperBackend.ts` | All four clipper tables | All four + Storage |
| `mvpEventTracking` / `trackEvent` | — | `mvp_events` (optional) |

**Idea / project copy** still comes from `getSanitizedIdeaForDisplay` / `projects` local or remote — not from clipper tables unless you add a join later.

---

## Revision

- **2026-04-15**: Initial contract + migration `20260415100000` + seed file.
