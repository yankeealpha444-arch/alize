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
  console.log("[API] process-job hit");
  console.log("[process-job] handler start", { method: req.method });
  if (req.method !== "POST") {
    return json(res, 405, {
      ok: false,
      jobId: "",
      final_status: "failed",
      error_message: "Method not allowed",
    });
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return json(res, 500, {
      ok: false,
      jobId: "",
      final_status: "failed",
      error_message: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
    });
  }

  const body = await readJsonBody(req);
  const jobId = body && typeof body.jobId === "string" ? body.jobId.trim() : "";
  console.log("[process-job] parsed jobId", { jobId: jobId || null });
  if (!jobId) {
    return json(res, 400, {
      ok: false,
      jobId: "",
      final_status: "failed",
      error_message: "Missing jobId",
    });
  }

  const sb = createClient(supabaseUrl, supabaseKey);
  const { data: job, error: fetchErr } = await sb.from("video_jobs").select("*").eq("id", jobId).maybeSingle();
  if (fetchErr) {
    return json(res, 500, {
      ok: false,
      jobId,
      final_status: "failed",
      error_message: fetchErr.message || "Fetch failed",
    });
  }
  if (!job) {
    return json(res, 404, {
      ok: false,
      jobId,
      final_status: "failed",
      error_message: "Job not found",
    });
  }

  if (job.status === "completed") {
    return json(res, 200, {
      ok: true,
      jobId,
      final_status: "completed",
      error_message: null,
    });
  }
  if (job.status === "failed") {
    return json(res, 200, {
      ok: false,
      jobId,
      final_status: "failed",
      error_message: job.error_message || "Job already failed",
    });
  }
  if (job.status !== "queued") {
    return json(res, 200, {
      ok: false,
      jobId,
      final_status: "failed",
      error_message: `Job is not queued (status=${job.status || "unknown"})`,
    });
  }

  const { data: claimed, error: claimErr } = await sb
    .from("video_jobs")
    .update({ status: "processing", updated_at: new Date().toISOString() })
    .eq("id", jobId)
    .eq("status", "queued")
    .select("*")
    .maybeSingle();

  if (claimErr || !claimed) {
    return json(res, 200, {
      ok: false,
      jobId,
      final_status: "failed",
      error_message: claimErr?.message || "Could not claim queued job",
    });
  }

  try {
    console.log("[process-job] before processVideoFromUrl", { jobId });
    await processVideoFromUrl(claimed, { trace: false });
    const { data: done } = await sb.from("video_jobs").select("status,error_message").eq("id", jobId).maybeSingle();
    console.log("[process-job] after success", { jobId, final_status: done?.status || "completed" });
    return json(res, 200, {
      ok: true,
      jobId,
      final_status: "completed",
      error_message: null,
    });
  } catch (err) {
    const msg = formatExecError(err);
    console.error("[process-job] catch", { jobId, error_message: msg });
    await sb
      .from("video_jobs")
      .update({
        status: "failed",
        error: msg,
        error_message: msg,
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId)
      .eq("status", "processing");
    return json(res, 200, {
      ok: false,
      jobId,
      final_status: "failed",
      error_message: msg,
    });
  }
}
