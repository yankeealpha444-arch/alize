import { createClient } from "@supabase/supabase-js";
import { loadEnvFromRoot } from "../../server/loadEnvFromRoot.mjs";

// PRODUCTION SOURCE OF TRUTH:
// This is the only process-job API handler that production should use.
// Keep route wiring pointed here to avoid root/api drift.
loadEnvFromRoot();

function sendJson(res, statusCode, body) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

function formatExecError(err) {
  if (!err) return "unknown_worker_failure";
  if (err instanceof Error) {
    const stderr = typeof err.stderr === "string" ? err.stderr.trim() : "";
    const stdout = typeof err.stdout === "string" ? err.stdout.trim() : "";
    if (stderr) return `${err.message}\n${stderr}`.trim();
    if (stdout) return `${err.message}\n${stdout}`.trim();
    return err.message;
  }
  return String(err);
}

async function parseBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const raw = chunks.length ? Buffer.concat(chunks).toString("utf8") : "";
  if (!raw.trim()) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return { __parse_error: true };
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return sendJson(res, 405, {
      ok: false,
      error: "method_not_allowed",
      job_id: null,
    });
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return sendJson(res, 500, {
      ok: false,
      error: "missing_supabase_configuration",
      job_id: null,
    });
  }

  const body = await parseBody(req);
  if (body.__parse_error) {
    return sendJson(res, 400, {
      ok: false,
      error: "invalid_json_body",
      job_id: null,
    });
  }

  const jobId = typeof body.jobId === "string" ? body.jobId.trim() : "";
  if (!jobId) {
    return sendJson(res, 400, {
      ok: false,
      error: "missing_job_id",
      job_id: null,
    });
  }

  const sb = createClient(supabaseUrl, supabaseKey);
  const failJob = async (message) => {
    await sb
      .from("video_jobs")
      .update({
        status: "failed",
        error: message,
        error_message: message,
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId);
  };

  try {
    const { data: job, error: fetchErr } = await sb.from("video_jobs").select("*").eq("id", jobId).maybeSingle();
    if (fetchErr) throw new Error(fetchErr.message || "job_fetch_failed");
    if (!job) {
      return sendJson(res, 404, {
        ok: false,
        error: "job_not_found",
        job_id: jobId,
      });
    }

    const sourcePath = String(job.source_path || "").trim();
    if (!sourcePath) throw new Error("missing_upload_source_path");

    const uploadBucket = process.env.SUPABASE_STORAGE_BUCKET_VIDEO_UPLOADS || "video-uploads";
    const sourceVideoUrl = `${supabaseUrl}/storage/v1/object/public/${uploadBucket}/${sourcePath}`;

    const { error: processingErr } = await sb
      .from("video_jobs")
      .update({
        status: "processing",
        error: null,
        error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId);
    if (processingErr) throw new Error(processingErr.message || "job_processing_update_failed");

    const { error: deleteClipsErr } = await sb.from("video_clips").delete().eq("job_id", jobId);
    if (deleteClipsErr) throw new Error(deleteClipsErr.message || "delete_old_clips_failed");

    const clipRows = [
      {
        job_id: jobId,
        project_id: job.project_id,
        label: "Clip 1",
        start_time_sec: 5,
        end_time_sec: 25,
        duration_sec: 20,
        score: 88,
        caption: "Early hook moment",
        thumbnail_url: null,
        video_url: sourceVideoUrl,
        status: "ready",
      },
      {
        job_id: jobId,
        project_id: job.project_id,
        label: "Clip 2",
        start_time_sec: 30,
        end_time_sec: 50,
        duration_sec: 20,
        score: 80,
        caption: "Mid-video payoff moment",
        thumbnail_url: null,
        video_url: sourceVideoUrl,
        status: "ready",
      },
      {
        job_id: jobId,
        project_id: job.project_id,
        label: "Clip 3",
        start_time_sec: 60,
        end_time_sec: 80,
        duration_sec: 20,
        score: 72,
        caption: "Late high-interest moment",
        thumbnail_url: null,
        video_url: sourceVideoUrl,
        status: "ready",
      },
    ];

    const { error: insertErr } = await sb.from("video_clips").insert(clipRows);
    if (insertErr) throw new Error(insertErr.message || "insert_mvp_clips_failed");

    const { error: completedErr } = await sb
      .from("video_jobs")
      .update({
        status: "completed",
        error: null,
        error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId);
    if (completedErr) throw new Error(completedErr.message || "job_completion_update_failed");

    return sendJson(res, 200, {
      ok: true,
      job_id: jobId,
      status: "completed",
      clips_count: 3,
      error_message: null,
    });
  } catch (err) {
    const msg = formatExecError(err);
    await failJob(msg);
    return sendJson(res, 200, {
      ok: false,
      job_id: jobId,
      status: "failed",
      clips_count: 0,
      error_message: msg,
      error: msg,
    });
  }
}
