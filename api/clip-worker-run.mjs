import { createClient } from "@supabase/supabase-js";
import { processVideoFromUrl } from "../server/processVideoFromUrl.mjs";
import { loadEnvFromRoot } from "../server/loadEnvFromRoot.mjs";

loadEnvFromRoot();

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

function formatExecError(err) {
  if (!err) return "Unknown worker failure.";
  if (err instanceof Error) {
    const stderr = typeof err.stderr === "string" ? err.stderr.trim() : "";
    const stdout = typeof err.stdout === "string" ? err.stdout.trim() : "";
    if (stderr) return `${err.message}\n${stderr}`.trim();
    if (stdout) return `${err.message}\n${stdout}`.trim();
    return err.message;
  }
  return String(err);
}

async function readJsonBody(req) {
  if (req.method === "GET" || req.method === "HEAD") return null;
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const raw = chunks.length ? Buffer.concat(chunks).toString("utf8") : "";
  if (!raw.trim()) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST" && req.method !== "GET") {
    return json(res, 405, { ok: false, error: "Method not allowed" });
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return json(res, 500, { ok: false, error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" });
  }

  const body = req.method === "POST" ? await readJsonBody(req) : null;
  const url = new URL(req.url || "/", "http://localhost");
  let jobId =
    (body && typeof body.jobId === "string" && body.jobId.trim()) ||
    url.searchParams.get("jobId")?.trim() ||
    "";

  if (!jobId) {
    return json(res, 400, {
      ok: false,
      picked: false,
      error: "Missing jobId in POST JSON body or ?jobId= query",
    });
  }

  const sb = createClient(supabaseUrl, supabaseKey);

  console.log("[clipper-worker][auto] fetch job by id", { jobId });

  const { data: job, error: fetchErr } = await sb.from("video_jobs").select("*").eq("id", jobId).maybeSingle();

  if (fetchErr) {
    return json(res, 500, { ok: false, picked: false, jobId, job_id: jobId, error: fetchErr.message || "Fetch failed" });
  }
  if (!job) {
    return json(res, 404, { ok: false, picked: false, jobId, job_id: jobId, error: "Job not found" });
  }

  const status = String(job.status || "");
  if (status !== "queued") {
    return json(res, 200, {
      ok: true,
      picked: false,
      jobId,
      job_id: jobId,
      reason: "not_queued",
      current_status: status,
      error_message: job.error_message || null,
    });
  }

  console.log("[clipper-worker][auto] claim job", {
    id: job.id,
    created_at: job.created_at,
    source_url: job.source_url || null,
  });

  const { data: claimed, error: claimErr } = await sb
    .from("video_jobs")
    .update({ status: "processing", updated_at: new Date().toISOString() })
    .eq("id", jobId)
    .eq("status", "queued")
    .select("*")
    .maybeSingle();

  if (claimErr) {
    return json(res, 500, { ok: false, picked: false, jobId, job_id: jobId, error: claimErr.message || "Claim failed" });
  }
  if (!claimed) {
    const { data: again } = await sb.from("video_jobs").select("id,status,error_message").eq("id", jobId).maybeSingle();
    return json(res, 200, {
      ok: true,
      picked: false,
      jobId,
      job_id: jobId,
      reason: "claim_race_or_status_changed",
      current_status: again?.status ?? null,
      error_message: again?.error_message ?? null,
    });
  }

  try {
    await processVideoFromUrl(claimed, { trace: false });
    const { data: done } = await sb.from("video_jobs").select("id,status,error_message").eq("id", jobId).maybeSingle();
    return json(res, 200, {
      ok: true,
      picked: true,
      processed: true,
      jobId,
      job_id: jobId,
      final_status: done?.status ?? "completed",
      error_message: done?.error_message ?? null,
    });
  } catch (err) {
    const msg = formatExecError(err);
    await sb
      .from("video_jobs")
      .update({
        status: "failed",
        error: msg,
        error_message: msg,
        updated_at: new Date().toISOString(),
      })
      .eq("id", claimed.id)
      .eq("status", "processing");

    return json(res, 200, {
      ok: true,
      picked: true,
      processed: false,
      jobId,
      job_id: jobId,
      final_status: "failed",
      error_message: msg,
    });
  }
}
