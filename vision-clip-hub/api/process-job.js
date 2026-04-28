import { createClient } from "@supabase/supabase-js";
import { processVideoFromUrl } from "../../server/processVideoFromUrl.mjs";
import { loadEnvFromRoot } from "../../server/loadEnvFromRoot.mjs";

loadEnvFromRoot();

function sendJson(res, statusCode, body) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
  const readTerminalState = async () => {
    const { data: latest } = await sb.from("video_jobs").select("status,error_message").eq("id", jobId).maybeSingle();
    const latestStatus = latest?.status ?? null;
    if (latestStatus === "completed") {
      return {
        ok: true,
        job_id: jobId,
        status: "completed",
        error_message: latest?.error_message || null,
      };
    }
    if (latestStatus === "failed") {
      const failedMessage = latest?.error_message || "job_failed_without_error_message";
      return {
        ok: false,
        job_id: jobId,
        status: "failed",
        error_message: failedMessage,
        error: failedMessage,
      };
    }
    return {
      ok: true,
      job_id: jobId,
      status: "processing",
      error_message: latest?.error_message || null,
    };
  };
  const { data: job, error: fetchErr } = await sb.from("video_jobs").select("*").eq("id", jobId).maybeSingle();
  if (fetchErr) {
    return sendJson(res, 500, {
      ok: false,
      error: fetchErr.message || "job_fetch_failed",
      job_id: jobId,
    });
  }
  if (!job) {
    return sendJson(res, 404, {
      ok: false,
      error: "job_not_found",
      job_id: jobId,
    });
  }

  if (job.status === "completed") {
    return sendJson(res, 200, {
      ok: true,
      job_id: jobId,
      status: "completed",
      error_message: null,
    });
  }

  if (job.status === "failed") {
    return sendJson(res, 200, {
      ok: false,
      error: job.error_message || "job_already_failed",
      job_id: jobId,
    });
  }

  if (job.status === "processing") {
    await sleep(1200);
    const terminalOrActive = await readTerminalState();
    return sendJson(res, 200, terminalOrActive);
  }

  if (job.status !== "queued") {
    return sendJson(res, 200, {
      ok: false,
      error: `job_not_queueable_status_${job.status || "unknown"}`,
      job_id: jobId,
    });
  }

  const { data: claimed, error: claimErr } = await sb
    .from("video_jobs")
    .update({ status: "processing", updated_at: new Date().toISOString() })
    .eq("id", jobId)
    .eq("status", "queued")
    .select("*")
    .maybeSingle();

  if (claimErr) {
    return sendJson(res, 500, {
      ok: false,
      error: claimErr.message || "job_claim_failed",
      job_id: jobId,
    });
  }

  if (!claimed) {
    await sleep(1200);
    const terminalOrActive = await readTerminalState();
    return sendJson(res, 200, terminalOrActive);
  }

  try {
    await processVideoFromUrl(claimed, { trace: false });
    const { data: finalRow } = await sb.from("video_jobs").select("status,error_message").eq("id", jobId).maybeSingle();
    if (finalRow?.status === "failed") {
      return sendJson(res, 200, {
        ok: false,
        job_id: jobId,
        status: "failed",
        error_message: finalRow.error_message || "processor_failed_without_message",
        error: finalRow.error_message || "processor_failed_without_message",
      });
    }
    if (finalRow?.status !== "completed") {
      const msg = `processor_non_terminal_status_${finalRow?.status || "unknown"}`;
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
      return sendJson(res, 200, {
        ok: false,
        job_id: jobId,
        status: "failed",
        error_message: msg,
        error: msg,
      });
    }
    return sendJson(res, 200, {
      ok: true,
      job_id: jobId,
      status: "completed",
      error_message: finalRow?.error_message || null,
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
      .eq("id", jobId)
      .eq("status", "processing");
    return sendJson(res, 200, {
      ok: false,
      error: msg,
      job_id: jobId,
      error_message: msg,
    });
  }
}
