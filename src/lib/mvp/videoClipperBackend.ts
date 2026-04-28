console.log("V26 BACKEND FILE ACTIVE");

import { supabase } from "@/integrations/supabase/client";
import { isVideoContentUrlInput } from "@/lib/mvp/videoClipperDetection";
import { STORAGE_BUCKET_CLIP_EXPORTS, STORAGE_BUCKET_VIDEO_UPLOADS } from "@/lib/mvp/storageBuckets";
import { parseYoutubeVideoId } from "@/lib/mvp/youtubeIngest";

export type VideoJobStatus = "queued" | "processing" | "completed" | "failed";
export type ClipStatus = "ready" | "selected" | "exported" | "failed";
export type PerformFeedback = "saves" | "likes" | "none";

export type VideoJobRow = {
  id: string;
  project_id: string;
  source_path: string;
  source_filename: string;
  source_size_bytes: number;
  source_mime_type: string | null;
  source_kind?: string;
  source_url?: string | null;
  youtube_video_id?: string | null;
  metadata?: Record<string, unknown>;
  status: VideoJobStatus;
  selected_clip_id: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
};

export type VideoClipRow = {
  id: string;
  job_id: string;
  project_id: string;
  label: string;
  start_time_sec: number;
  end_time_sec: number;
  duration_sec: number;
  score: number;
  caption: string | null;
  thumbnail_url: string | null;
  /** Public URL to rendered clip MP4 (set by server worker). */
  video_url?: string | null;
  status: ClipStatus;
  created_at: string;
};

export type ClipExportRow = {
  id: string;
  clip_id: string;
  project_id: string;
  status: "created" | "ready" | "failed";
  storage_path: string | null;
  download_url: string | null;
  created_at: string;
};

export type DistributionJobRow = {
  id: string;
  project_id: string;
  clip_id: string;
  status: "pending" | "sent" | "posted";
  created_at: string;
};

export type CompetitionRunRow = {
  id: string;
  project_id: string;
  clip_id: string;
  caption: string;
  rules: string;
  created_at: string;
};

export type GrowthSummary = {
  clipsUsed: number;
  distributionActions: number;
  competitionActions: number;
  feedback: {
    likes: number;
    saves: number;
    none: number;
  };
};

export type ClipPatternType =
  | "fast_hook"
  | "emotional_moment"
  | "curiosity"
  | "fast_payoff"
  | "general";

export type ClipPatternRow = {
  id: string;
  project_id: string;
  clip_id: string | null;
  pattern_type: ClipPatternType;
  performance_label: "High" | "Medium" | "Low" | null;
  outcome: string | null;
  reaction: "better" | "same" | "worse" | null;
  signal_strength: "scale" | "test_again" | "swap" | "pending" | null;
  created_at: string;
};

export type PatternInsight = {
  patternType: ClipPatternType;
  message: string;
  suggestedSignal: "scale" | "test_again" | "swap";
};

export type ClipResultOutcome =
  | "not_posted"
  | "no_traction"
  | "some_views"
  | "strong_views"
  | "got_followers"
  | "engagement"
  | "flopped";

export type ClipResultInput = {
  outcome: ClipResultOutcome;
  views?: number | null;
  likes?: number | null;
  comments?: number | null;
  shares?: number | null;
  followers_gained?: number | null;
  reaction?: "better" | "as_expected" | "worse" | null;
  note?: string | null;
};

export type SaveClipPatternInput = {
  projectId: string;
  clipId: string | null;
  performanceLabel: "High" | "Medium" | "Low" | null;
  outcome: ClipResultOutcome | "unknown";
  reaction: "better" | "same" | "worse" | null;
  signalStrength: "scale" | "test_again" | "swap" | "pending";
};

export type ClipperState = {
  latestJob: VideoJobRow | null;
  clips: VideoClipRow[];
  latestExportsByClipId: Record<string, ClipExportRow>;
  latestFeedbackByClipId: Record<string, PerformFeedback>;
};

function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

type ClipInsertRow = {
  job_id: string;
  project_id: string;
  label: string;
  start_time_sec: number;
  end_time_sec: number;
  duration_sec: number;
  score: number;
  caption: string | null;
  thumbnail_url: string | null;
  status: ClipStatus;
};

/** Upload jobs: segment placeholders against a generic local timeline (no real duration yet). */
function buildUploadClipRows(job: VideoJobRow): ClipInsertRow[] {
  const seed = hashSeed(job.id);
  const n = 3 + (seed % 3);
  const out: ClipInsertRow[] = [];
  for (let i = 0; i < n; i++) {
    const start = ((seed + i * 13) % 180) + 5;
    const dur = 12 + ((seed + i * 7) % 40);
    const end = start + dur;
    out.push({
      job_id: job.id,
      project_id: job.project_id,
      label: `Clip ${i + 1}`,
      start_time_sec: start,
      end_time_sec: end,
      duration_sec: dur,
      score: Math.max(55, 90 - i * 8),
      caption: null,
      thumbnail_url: null,
      status: "ready",
    });
  }
  return out;
}

function shortTitle(s: string, max = 48): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

async function insertClipsAndExportsAndComplete(
  sb: { from: (t: string) => any },
  job: VideoJobRow,
  rows: ClipInsertRow[],
  jobId: string,
): Promise<void> {
  const ins = await sb.from("video_clips").insert(rows).select("id");
  if (ins.error) throw new Error(ins.error.message);
  const newIds = (ins.data ?? []) as Array<{ id: string }>;
  if (newIds.length === 0) throw new Error("No clip rows inserted");

  const exportRows = newIds.map((c) => ({
    project_id: job.project_id,
    clip_id: c.id,
    status: "created" as const,
  }));
  const exp = await sb.from("clip_exports").insert(exportRows);
  if (exp.error) throw new Error(exp.error.message);

  const fin = await sb
    .from("video_jobs")
    .update({ status: "completed", updated_at: new Date().toISOString(), error_message: null })
    .eq("id", jobId)
    .eq("status", "processing");
  if (fin.error) throw new Error(fin.error.message);

  console.log("[clipper-worker] processing completed", jobId);
}

/**
 * Client-side worker: `upload` and YouTube URL jobs → `video_clips` + `clip_exports` → `completed`.
 * YouTube: real metadata ingest (oEmbed + optional Data API); clip timestamps bounded by video duration.
 */
export async function processQueuedVideoJob(jobId: string): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;

  const { data: peek, error: peekErr } = await sb.from("video_jobs").select("*").eq("id", jobId).maybeSingle();
  if (peekErr) {
    console.error("[clipper-worker] processing failed", peekErr);
    return;
  }
  if (!peek || peek.status !== "queued") {
    return;
  }

  const sk = (peek.source_kind as string | undefined) ?? "upload";

  if (sk === "remote_url") {
    const failRes = await sb
      .from("video_jobs")
      .update({
        status: "failed",
        error_message:
          "This link type is not supported for URL ingest yet. Paste a YouTube link or upload a video file.",
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId)
      .eq("status", "queued");
    if (failRes.error) console.error("[clipper-worker] processing failed", failRes.error);
    return;
  }

  if (sk === "tiktok_url") {
    const failRes = await sb
      .from("video_jobs")
      .update({
        status: "failed",
        error_message:
          "TikTok links are not supported for automated clipping in this MVP yet. Paste a YouTube link or upload a video file.",
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId)
      .eq("status", "queued");
    if (failRes.error) console.error("[clipper-worker] processing failed", failRes.error);
    return;
  }

  /** YouTube URL jobs are processed by `server/clipWorker.mjs` (yt-dlp + ffmpeg); stay queued until the worker claims. */
  if (sk === "youtube_url" || sk === "youtube_id") {
    return;
  }

  // IMPORTANT: live clip row insertion is server-worker only.
  // This frontend helper must never insert demo/mock/fallback clips into video_clips.
  console.log("[clipper][backend] processQueuedVideoJob skipped: server worker only", {
    jobId,
    source_kind: sk,
  });
  return;
}

function asTableClient() {
  type QueryResult = Promise<{ data: Array<Record<string, unknown>> | null; error: { message?: string } | null }>;
  type SelectChain = {
    eq: (col: string, value: string) => SelectChain;
    in: (col: string, values: string[]) => SelectChain;
    lte: (col: string, value: string) => SelectChain;
    order: (col: string, opts: { ascending: boolean }) => SelectChain;
    limit: (n: number) => QueryResult;
  };
  return supabase as unknown as {
    from: (table: string) => {
      insert: (values: Record<string, unknown> | Array<Record<string, unknown>>) => {
        select: (cols: string) => {
          single: () => Promise<{ data: Record<string, unknown> | null; error: { message?: string } | null }>;
        };
      };
      select: (cols: string) => SelectChain;
      update: (values: Record<string, unknown>) => {
        eq: (col: string, value: string) => Promise<{ error: { message?: string } | null }>;
      };
    };
  };
}

function requireData<T>(
  data: T | null,
  error: { message?: string } | null,
  context: string,
): T {
  if (error) throw new Error(`${context}: ${error.message || "unknown error"}`);
  if (data == null) throw new Error(`${context}: empty response`);
  return data;
}

function mapServiceError(message: string | undefined, fallback: string): string {
  const m = (message || "").toLowerCase();
  if (m.includes("invalid api key") || m.includes("apikey") || m.includes("api key")) {
    return "Video service is not configured correctly yet. Please try again later.";
  }
  return message || fallback;
}

function makeUuidLike(seed: string): string {
  const clean = seed.replace(/[^a-zA-Z0-9]/g, "").slice(0, 16) || "clip";
  return `${clean}-${Date.now()}`;
}

async function triggerAutoWorkerTick(jobId: string): Promise<void> {
  console.log("[clipper][backend] triggering worker INLINE", jobId);
  try {
    const res = await fetch("/api/process-job", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ jobId }),
    });
    const text = await res.text();
    let parsed: unknown = null;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = { parse_error: true, raw: text };
    }
    console.log("[process-job response]", parsed);
    console.log("[clipper][backend] worker response INLINE", text);
  } catch (err) {
    console.error("[clipper][backend] worker trigger failed", err);
  }
}

// Real clip generation is handled by server/clipWorker.mjs + server/processVideoFromUrl.mjs.

async function fetchYoutubeOembed(url: string): Promise<{ title: string; authorName: string | null; thumbnailUrl: string | null } | null> {
  try {
    const res = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`);
    if (!res.ok) return null;
    const data = (await res.json()) as { title?: string; author_name?: string; thumbnail_url?: string };
    if (!data.title) return null;
    return {
      title: data.title,
      authorName: data.author_name ?? null,
      thumbnailUrl: data.thumbnail_url ?? null,
    };
  } catch {
    return null;
  }
}

// Intentionally no instant seeded demo clips.

/** MVP: all clipper reads/writes target this project (seeded in Supabase). */
export const CLIPPER_DB_PROJECT_ID = "seed-project-ai-clipper";

/** Public URL for an export when `download_url` was not stored (e.g. seed rows). */
export function getExportDownloadUrl(exp: ClipExportRow): string | null {
  if (exp.download_url) return exp.download_url;
  if (exp.storage_path) {
    const { data } = supabase.storage.from(STORAGE_BUCKET_CLIP_EXPORTS).getPublicUrl(exp.storage_path);
    return data.publicUrl ?? null;
  }
  return null;
}

export async function uploadSourceVideoAndCreateJob(
  projectId: string,
  file: File,
): Promise<VideoJobRow> {
  console.log("[clipper][backend] uploadSourceVideoAndCreateJob:start", {
    projectId,
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type || null,
  });
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const tempId = makeUuidLike(safeName);
  const sourcePath = `${projectId}/uploads/${tempId}-${safeName}`;

  const upload = await supabase.storage
    .from(STORAGE_BUCKET_VIDEO_UPLOADS)
    .upload(sourcePath, file, { upsert: false, contentType: file.type || "video/mp4" });
  if (upload.error) {
    throw new Error(mapServiceError(upload.error.message, "Video upload failed"));
  }

  const sb = asTableClient();
  const inserted = await sb
    .from("video_jobs")
    .insert({
      project_id: projectId,
      source_path: sourcePath,
      source_filename: file.name,
      source_size_bytes: file.size,
      source_mime_type: file.type || "application/octet-stream",
      status: "queued",
    })
    .select("*")
    .single();

  try {
    const row = requireData(inserted.data as VideoJobRow | null, inserted.error, "Create video job");
    console.log("[clipper][backend] uploadSourceVideoAndCreateJob:created", {
      projectId,
      createdJobId: row.id,
      status: row.status,
      sourcePath: row.source_path,
    });
    console.log("[clipper] upload job queued for worker", { jobId: row.id, status: row.status });
    return row;
  } catch (e) {
    const msg = e instanceof Error ? e.message : undefined;
    throw new Error(mapServiceError(msg, "Create video job failed"));
  }
}

export async function createVideoJobFromSourceUrl(projectId: string, sourceUrl: string): Promise<VideoJobRow> {
  const url = sourceUrl.trim();
  console.log("[clipper][backend] createVideoJobFromSourceUrl:start", {
    projectId,
    submittedUrl: url,
  });
  if (!url) throw new Error("Missing source URL");
  if (!isVideoContentUrlInput(url)) {
    throw new Error("Paste a supported video link (YouTube, TikTok, or Instagram).");
  }

  const lower = url.toLowerCase();
  const ytId = parseYoutubeVideoId(url);
  let sourceKind: string;
  if (ytId) {
    sourceKind = "youtube_url";
  } else if (lower.includes("tiktok.com")) {
    sourceKind = "tiktok_url";
  } else {
    sourceKind = "remote_url";
  }

  const sb = asTableClient();
  const inserted = await sb
    .from("video_jobs")
    .insert({
      project_id: projectId,
      source_path: "",
      source_filename: "link-import",
      source_size_bytes: 0,
      source_mime_type: "text/uri-list",
      source_kind: sourceKind,
      source_url: url,
      youtube_video_id: ytId,
      metadata: {},
      status: "queued",
    })
    .select("*")
    .single();
  try {
    const row = requireData(inserted.data as VideoJobRow | null, inserted.error, "Create URL video job");
    console.log("[clipper][backend] created video job only", {
      projectId,
      createdJobId: row.id,
      source_kind: row.source_kind ?? null,
      source_url: row.source_url ?? null,
      status: row.status,
    });
    console.log("[clipper][backend] createVideoJobFromSourceUrl:created", {
      projectId,
      createdJobId: row.id,
      source_kind: row.source_kind ?? null,
      source_url: row.source_url ?? null,
      status: row.status,
    });
    console.log("[job-created]", { id: row.id, status: row.status });
    await fetch("/api/process-job", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId: row.id })
    })
      .then(async (res) => {
        const text = await res.text();
        let json: unknown = null;
        try {
          json = text ? JSON.parse(text) : null;
        } catch {
          json = {
            ok: false,
            jobId: row.id,
            final_status: "failed",
            error_message: text || `HTTP ${res.status}`,
          };
        }
        console.log("[process-job response]", json);
        if (json && typeof json === "object" && "ok" in json && json.ok === false) {
          const errMsg =
            (typeof json.error_message === "string" && json.error_message.trim()) ||
            (typeof json.error === "string" && json.error.trim()) ||
            `process-job failed (HTTP ${res.status})`;
          throw new Error(errMsg);
        }
        if (!res.ok) {
          console.error("[process-job error]", { status: res.status, text });
        }
      })
      .catch(err => {
        console.error("[process-job error]", err);
        throw err;
      });
    return row;
  } catch (e) {
    const msg = e instanceof Error ? e.message : undefined;
    throw new Error(mapServiceError(msg, "Create URL video job failed"));
  }
}

export async function fetchClipperState(
  projectId: string,
  preferredJobId?: string | null,
  options?: { cacheBuster?: number; uploadOnly?: boolean },
): Promise<ClipperState> {
  const sb = asTableClient();
  const nowIso = new Date(options?.cacheBuster ?? Date.now()).toISOString();
  console.log("[clipper][backend] fetchClipperState:start", {
    projectId,
    preferredJobId: preferredJobId ?? null,
    cacheBuster: options?.cacheBuster ?? null,
    uploadOnly: Boolean(options?.uploadOnly),
  });
  let latestJob: VideoJobRow | null = null;
  if (preferredJobId) {
    const preferredRes = await sb
      .from("video_jobs")
      .select("*")
      .eq("project_id", projectId)
      .eq("id", preferredJobId)
      .lte("created_at", nowIso)
      .limit(1);
    const preferredRows = requireData(preferredRes.data, preferredRes.error, "Fetch preferred video job") as VideoJobRow[];
    latestJob = preferredRows[0] ?? null;
    if (latestJob && options?.uploadOnly && latestJob.source_kind && latestJob.source_kind !== "upload") {
      console.log("[clipper][backend] fetchClipperState:preferred-job-not-upload", {
        projectId,
        preferredJobId,
        source_kind: latestJob.source_kind,
      });
      return { latestJob: null, clips: [], latestExportsByClipId: {}, latestFeedbackByClipId: {} };
    }
    if (!latestJob) {
      console.log("[clipper][backend] fetchClipperState:preferred-job-missing", {
        projectId,
        preferredJobId,
      });
      return { latestJob: null, clips: [], latestExportsByClipId: {}, latestFeedbackByClipId: {} };
    }
  } else {
    const latestJobsQuery = sb.from("video_jobs").select("*").eq("project_id", projectId);
    const latestJobsRes = await (options?.uploadOnly
      ? latestJobsQuery.eq("source_kind", "upload")
      : latestJobsQuery)
      .lte("created_at", nowIso)
      .order("created_at", { ascending: false })
      .limit(20);
    const jobs = requireData(latestJobsRes.data, latestJobsRes.error, "Fetch video jobs").filter(Boolean) as VideoJobRow[];
    latestJob = jobs[0] ?? null;
  }
  if (!latestJob) {
    console.log("[clipper][backend] fetchClipperState:no-latest-job", { projectId });
    return { latestJob: null, clips: [], latestExportsByClipId: {}, latestFeedbackByClipId: {} };
  }
  console.log("[clipper][backend] fetchClipperState:latest-job", {
    projectId,
    latestJobId: latestJob.id,
    status: latestJob.status,
    source_url: latestJob.source_url ?? null,
    source_filename: latestJob.source_filename ?? null,
  });

  const clipsRes = await sb
    .from("video_clips")
    .select("*")
    .eq("job_id", latestJob.id)
    .lte("created_at", nowIso)
    .order("score", { ascending: false })
    .limit(12);
  let clips = requireData(clipsRes.data, clipsRes.error, "Fetch clips") as VideoClipRow[];
  // No demo/fallback clip seeding here. Wait for real worker-generated rows.
  const clipIds = clips.map((c) => c.id);
  if (!clipIds.length) {
    console.log("[clipper][backend] fetchClipperState:no-clip-rows", {
      projectId,
      latestJobId: latestJob.id,
    });
    return { latestJob, clips: [], latestExportsByClipId: {}, latestFeedbackByClipId: {} };
  }

  const exportsRes = await sb
    .from("clip_exports")
    .select("*")
    .in("clip_id", clipIds)
    .lte("created_at", nowIso)
    .order("created_at", { ascending: false })
    .limit(200);
  const feedbackRes = await sb
    .from("clip_feedback")
    .select("*")
    .in("clip_id", clipIds)
    .lte("created_at", nowIso)
    .order("created_at", { ascending: false })
    .limit(200);

  const exportsRows = requireData(exportsRes.data, exportsRes.error, "Fetch exports") as ClipExportRow[];
  const feedbackRows = requireData(feedbackRes.data, feedbackRes.error, "Fetch feedback") as Array<{
    clip_id: string;
    feedback: PerformFeedback;
  }>;

  const latestExportsByClipId: Record<string, ClipExportRow> = {};
  for (const row of exportsRows) {
    if (!latestExportsByClipId[row.clip_id]) latestExportsByClipId[row.clip_id] = row;
  }

  const latestFeedbackByClipId: Record<string, PerformFeedback> = {};
  for (const row of feedbackRows) {
    if (!latestFeedbackByClipId[row.clip_id]) latestFeedbackByClipId[row.clip_id] = row.feedback;
  }

  return { latestJob, clips, latestExportsByClipId, latestFeedbackByClipId };
}

export async function fetchVideoClipsByJobIdFresh(
  jobId: string,
  options?: { cacheBuster?: number },
): Promise<VideoClipRow[]> {
  const sb = asTableClient();
  const nowIso = new Date(options?.cacheBuster ?? Date.now()).toISOString();
  const clipsRes = await sb
    .from("video_clips")
    .select("*")
    .eq("job_id", jobId)
    .lte("created_at", nowIso)
    .order("score", { ascending: false })
    .limit(12);
  const clips = requireData(clipsRes.data, clipsRes.error, "Fetch clips by job id (fresh)") as VideoClipRow[];
  console.log("[clipper][backend] fetchVideoClipsByJobIdFresh", {
    jobId,
    cacheBuster: options?.cacheBuster ?? null,
    clipCount: clips.length,
  });
  return clips;
}

export async function selectClip(jobId: string, clipId: string): Promise<void> {
  const sb = asTableClient();
  await sb.from("video_jobs").update({ selected_clip_id: clipId, updated_at: new Date().toISOString() }).eq("id", jobId);
  await sb.from("video_clips").update({ status: "ready" }).eq("job_id", jobId);
  await sb.from("video_clips").update({ status: "selected" }).eq("id", clipId);
}

export async function createExportForClip(projectId: string, clip: VideoClipRow): Promise<ClipExportRow> {
  const sb = asTableClient();
  const createRes = await sb
    .from("clip_exports")
    .insert({ project_id: projectId, clip_id: clip.id, status: "created" })
    .select("*")
    .single();
  const created = requireData(createRes.data as ClipExportRow | null, createRes.error, "Create export");

  const text = `Clip export placeholder\nclip_id=${clip.id}\nlabel=${clip.label}\nstart=${clip.start_time_sec}\nend=${clip.end_time_sec}\n`;
  const storagePath = `${projectId}/exports/${created.id}.txt`;
  const uploadRes = await supabase.storage
    .from(STORAGE_BUCKET_CLIP_EXPORTS)
    .upload(storagePath, new Blob([text], { type: "text/plain;charset=utf-8" }), { upsert: true });
  if (uploadRes.error) {
    await sb.from("clip_exports").update({ status: "failed" }).eq("id", created.id);
    throw new Error(uploadRes.error.message || "Export file upload failed");
  }

  const { data: publicData } = supabase.storage.from(STORAGE_BUCKET_CLIP_EXPORTS).getPublicUrl(storagePath);
  const readyRes = await sb
    .from("clip_exports")
    .update({
      status: "ready",
      storage_path: storagePath,
      download_url: publicData?.publicUrl ?? null,
    })
    .eq("id", created.id);
  if (readyRes.error) throw new Error(readyRes.error.message || "Finalize export failed");

  await sb.from("video_clips").update({ status: "exported" }).eq("id", clip.id);
  return {
    ...created,
    status: "ready",
    storage_path: storagePath,
    download_url: publicData?.publicUrl ?? null,
  };
}

export async function storeClipPerformanceFeedback(
  projectId: string,
  clipId: string,
  feedback: PerformFeedback,
): Promise<void> {
  const sb = asTableClient();
  const res = await sb.from("clip_feedback").insert({
    project_id: projectId,
    clip_id: clipId,
    feedback,
  });
  if (res.error) throw new Error(res.error.message || "Save clip feedback failed");
}

export async function createDistributionJob(projectId: string, clipId: string): Promise<DistributionJobRow> {
  const sb = asTableClient();
  const createRes = await sb
    .from("distribution_jobs")
    .insert({
      project_id: projectId,
      clip_id: clipId,
      status: "pending",
    })
    .select("*")
    .single();
  return requireData(createRes.data as DistributionJobRow | null, createRes.error, "Create distribution job");
}

function buildCompetitionCaption(clip: VideoClipRow): string {
  return `Giveaway time: ${clip.label}. Follow, comment your biggest takeaway, and tag a creator who should see this clip.`;
}

const DEFAULT_COMPETITION_RULES =
  "1) Follow this account.\n2) Comment your best takeaway.\n3) Tag 2 friends who create content.";

export async function createCompetitionRun(projectId: string, clip: VideoClipRow): Promise<CompetitionRunRow> {
  const sb = asTableClient();
  const createRes = await sb
    .from("competition_runs")
    .insert({
      project_id: projectId,
      clip_id: clip.id,
      caption: buildCompetitionCaption(clip),
      rules: DEFAULT_COMPETITION_RULES,
    })
    .select("*")
    .single();
  return requireData(createRes.data as CompetitionRunRow | null, createRes.error, "Create competition run");
}

export async function fetchGrowthSummary(projectId: string): Promise<GrowthSummary> {
  const sb = asTableClient();

  const usedRes = await sb
    .from("video_jobs")
    .select("selected_clip_id")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(500);
  const distRes = await sb
    .from("distribution_jobs")
    .select("id")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(1000);
  const compRes = await sb
    .from("competition_runs")
    .select("id")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(1000);
  const feedbackRes = await sb
    .from("clip_feedback")
    .select("feedback")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(2000);

  const usedRows = requireData(usedRes.data, usedRes.error, "Fetch clips used");
  const distRows = requireData(distRes.data, distRes.error, "Fetch distribution jobs");
  const compRows = requireData(compRes.data, compRes.error, "Fetch competition runs");
  const feedbackRows = requireData(feedbackRes.data, feedbackRes.error, "Fetch feedback summary") as Array<{
    feedback?: PerformFeedback;
  }>;

  let likes = 0;
  let saves = 0;
  let none = 0;
  for (const row of feedbackRows) {
    if (row.feedback === "likes") likes += 1;
    else if (row.feedback === "saves") saves += 1;
    else if (row.feedback === "none") none += 1;
  }

  const usedSet = new Set<string>();
  for (const row of usedRows) {
    const clipId = (row as { selected_clip_id?: unknown }).selected_clip_id;
    if (typeof clipId === "string" && clipId.length > 0) usedSet.add(clipId);
  }

  return {
    clipsUsed: usedSet.size,
    distributionActions: distRows.length,
    competitionActions: compRows.length,
    feedback: { likes, saves, none },
  };
}

export async function saveClipResult(projectId: string, clipId: string, result: ClipResultInput): Promise<void> {
  const sb = asTableClient();
  const res = await sb.from("clip_results").insert({
    project_id: projectId,
    clip_id: clipId,
    outcome: result.outcome,
    views: result.views ?? null,
    likes: result.likes ?? null,
    comments: result.comments ?? null,
    shares: result.shares ?? null,
    followers_gained: result.followers_gained ?? null,
    reaction: result.reaction ?? null,
    note: result.note ?? null,
  });
  if (res.error) throw new Error(res.error.message || "Save clip result failed");
}

function normalizeText(s: string | null | undefined): string {
  return (s || "").toLowerCase();
}

function derivePatternTypeFromClip(clip: Pick<VideoClipRow, "label" | "caption"> | null): ClipPatternType {
  const t = `${normalizeText(clip?.label)} ${normalizeText(clip?.caption)}`;
  if (/\b(hook|opening|intro|first seconds?)\b/.test(t)) return "fast_hook";
  if (/\b(emotion|emotional|story|personal|heart)\b/.test(t)) return "emotional_moment";
  if (/\b(curious|curiosity|teaser|mystery|question)\b/.test(t)) return "curiosity";
  if (/\b(payoff|result|reveal|before after)\b/.test(t)) return "fast_payoff";
  return "general";
}

async function fetchClipById(clipId: string): Promise<VideoClipRow | null> {
  const sb = asTableClient();
  const res = await sb.from("video_clips").select("*").eq("id", clipId).limit(1);
  const rows = requireData(res.data, res.error, "Fetch clip by id");
  return (rows[0] as VideoClipRow | undefined) ?? null;
}

export async function saveClipPattern(input: SaveClipPatternInput): Promise<ClipPatternRow> {
  const sb = asTableClient();
  const clip = input.clipId ? await fetchClipById(input.clipId) : null;
  const patternType = derivePatternTypeFromClip(clip);
  const insertRes = await sb
    .from("clip_patterns")
    .insert({
      project_id: input.projectId,
      clip_id: input.clipId,
      pattern_type: patternType,
      performance_label: input.performanceLabel,
      outcome: input.outcome,
      reaction: input.reaction,
      signal_strength: input.signalStrength,
    })
    .select("*")
    .single();
  return requireData(insertRes.data as ClipPatternRow | null, insertRes.error, "Save clip pattern");
}

export async function fetchClipPatternsForProject(projectId: string): Promise<ClipPatternRow[]> {
  const sb = asTableClient();
  const res = await sb
    .from("clip_patterns")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(50);
  return requireData(res.data, res.error, "Fetch clip patterns") as ClipPatternRow[];
}

export async function getLatestPatternInsight(projectId: string): Promise<PatternInsight | null> {
  const rows = await fetchClipPatternsForProject(projectId);
  if (rows.length === 0) return null;

  const latestScale = rows.find((r) => r.signal_strength === "scale");
  if (latestScale) {
    if (latestScale.pattern_type === "fast_hook") {
      return {
        patternType: "fast_hook",
        message: "Fast-opening clips have worked better for you before.",
        suggestedSignal: "scale",
      };
    }
    if (latestScale.pattern_type === "emotional_moment") {
      return {
        patternType: "emotional_moment",
        message: "Emotional moments appear to outperform slower segments for your content.",
        suggestedSignal: "scale",
      };
    }
    return {
      patternType: latestScale.pattern_type,
      message: "This pattern has produced your strongest outcomes recently.",
      suggestedSignal: "scale",
    };
  }

  const failuresByPattern = new Map<ClipPatternType, number>();
  for (const row of rows) {
    if (row.signal_strength !== "swap") continue;
    const prev = failuresByPattern.get(row.pattern_type) ?? 0;
    failuresByPattern.set(row.pattern_type, prev + 1);
  }
  for (const [patternType, count] of failuresByPattern.entries()) {
    if (count >= 2) {
      return {
        patternType,
        message: "This type of clip has underperformed before — try a different moment.",
        suggestedSignal: "swap",
      };
    }
  }

  const latest = rows[0];
  return latest
    ? {
        patternType: latest.pattern_type,
        message: "Based on your past results, keep testing this pattern with one change at a time.",
        suggestedSignal: "test_again",
      }
    : null;
}

