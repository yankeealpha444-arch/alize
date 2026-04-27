/**
 * Polls Supabase for queued YouTube URL jobs and runs processVideoFromUrl.
 *
 * Env (required):
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Run: npm run worker:clip
 */

import { createClient } from "@supabase/supabase-js";
import { processVideoFromUrl } from "./processVideoFromUrl.mjs";
import { loadEnvFromRoot } from "./loadEnvFromRoot.mjs";
import path from "path";
import { fileURLToPath } from "url";

loadEnvFromRoot();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const resolvedEnvPath = path.join(__dirname, "..", ".env");
console.log("[clipper-worker][env] .env path checked", resolvedEnvPath);
if (!process.env.SUPABASE_URL && process.env.VITE_SUPABASE_URL) {
  process.env.SUPABASE_URL = process.env.VITE_SUPABASE_URL;
}
console.log("[clipper-worker][env] keys", {
  has_SUPABASE_URL: Boolean(process.env.SUPABASE_URL),
  has_SUPABASE_SERVICE_ROLE_KEY: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
  has_VITE_SUPABASE_URL: Boolean(process.env.VITE_SUPABASE_URL),
  has_VITE_SUPABASE_PUBLISHABLE_KEY: Boolean(process.env.VITE_SUPABASE_PUBLISHABLE_KEY),
});

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  if (!supabaseKey) {
    console.error("[clipper-worker] Missing SUPABASE_SERVICE_ROLE_KEY in .env");
    console.error("[clipper-worker][env] .env path checked", resolvedEnvPath);
  } else {
    console.error("[clipper-worker] Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  }
  process.exit(1);
}

const sb = createClient(supabaseUrl, supabaseKey);
const TRACE_JOB_ID = process.env.CLIP_WORKER_TRACE_JOB_ID || "a3a61c3a-6e47-48e7-b83b-bd6845c91c4f";

function toFailureMessage(rawMessage) {
  const msg = String(rawMessage || "").trim();
  if (!msg) return "Unknown worker failure.";
  if (msg.includes("Step timeout after") && msg.toLowerCase().includes("yt-dlp")) {
    return "YouTube download timed out. Try another public shorter video.";
  }
  return msg;
}

async function processNextJob() {
  const filters = {
    claim_statuses: ["queued", "failed"],
    claim_source_kind: "youtube_url",
    order_by: "created_at asc",
    limit: 1,
  };
  console.log("[clipper-worker] job query filters", filters);

  const { count: queuedCount, error: queuedCountErr } = await sb
    .from("video_jobs")
    .select("id", { count: "exact", head: true })
    .eq("status", "queued")
    .eq("source_kind", "youtube_url");
  if (queuedCountErr) {
    console.error("[clipper-worker] queued count error", queuedCountErr.message);
  }

  const { count: processingCount, error: processingCountErr } = await sb
    .from("video_jobs")
    .select("id", { count: "exact", head: true })
    .eq("status", "processing")
    .eq("source_kind", "youtube_url");
  if (processingCountErr) {
    console.error("[clipper-worker] processing count error", processingCountErr.message);
  }
  const { count: failedCount, error: failedCountErr } = await sb
    .from("video_jobs")
    .select("id", { count: "exact", head: true })
    .eq("status", "failed")
    .eq("source_kind", "youtube_url");
  if (failedCountErr) {
    console.error("[clipper-worker] failed count error", failedCountErr.message);
  }

  console.log("[clipper-worker] matching jobs", {
    queued: queuedCount ?? 0,
    processing: processingCount ?? 0,
    failed: failedCount ?? 0,
  });

  const staleBeforeIso = new Date(Date.now() - 2 * 60 * 1000).toISOString();
  const { data: staleProcessing, error: staleErr } = await sb
    .from("video_jobs")
    .select("id, status, source_kind, source_url, created_at, updated_at, metadata")
    .eq("status", "processing")
    .eq("source_kind", "youtube_url")
    .lt("updated_at", staleBeforeIso)
    .order("updated_at", { ascending: true })
    .limit(10);
  if (staleErr) {
    console.error("[clipper-worker] stale processing scan error", staleErr.message);
  } else if ((staleProcessing ?? []).length > 0) {
    for (const row of staleProcessing) {
      const metadata = row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata) ? row.metadata : {};
      const retries = Number(metadata.worker_retry_count || 0) + 1;
      if (retries >= 3) {
        const terminalError = "YouTube download timed out. Try another public shorter video.";
        const { error: failErr } = await sb
          .from("video_jobs")
          .update({
            status: "failed",
            error_message: terminalError,
            updated_at: new Date().toISOString(),
            metadata: { ...metadata, worker_retry_count: retries, stale_recovery: "failed" },
          })
          .eq("id", row.id)
          .eq("status", "processing");
        if (failErr) {
          console.error("[clipper-worker] stale terminal fail update error", failErr.message);
        } else {
          console.log("[clipper-worker] stale processing marked failed", { id: row.id, retries, error_message: terminalError });
        }
      } else {
        const { error: recoverErr } = await sb
          .from("video_jobs")
          .update({
            status: "queued",
            updated_at: new Date().toISOString(),
            metadata: { ...metadata, worker_retry_count: retries, stale_recovery: "requeued" },
          })
          .eq("id", row.id)
          .eq("status", "processing");
        if (recoverErr) {
          console.error("[clipper-worker] stale recovery error", recoverErr.message);
        } else {
          console.log("[clipper-worker] stale processing reset to queued", { id: row.id, retries });
        }
      }
    }
  }

  const { data: newestJobs, error: newestErr } = await sb
    .from("video_jobs")
    .select("id, status, source_kind, source_url, created_at")
    .order("created_at", { ascending: false })
    .limit(5);
  if (newestErr) {
    console.error("[clipper-worker] newest jobs query error", newestErr.message);
  } else {
    console.log("[clipper-worker] newest 5 video_jobs", newestJobs ?? []);
  }

  const { data: queuedOrFailed, error: qErr } = await sb
    .from("video_jobs")
    .select("*")
    .in("status", ["queued", "failed"])
    .eq("source_kind", "youtube_url")
    .order("created_at", { ascending: true })
    .limit(1);

  if (qErr) {
    console.error("[clipper-worker] poll error", qErr.message);
    return;
  }
  const job = queuedOrFailed?.[0];
  if (!job) return;
  console.log("[clipper-worker] job picked", {
    id: job.id,
    status: job.status,
    source_kind: job.source_kind || null,
    source_url: job.source_url || null,
  });

  if (job.status === "failed") {
    const metadata = job.metadata && typeof job.metadata === "object" && !Array.isArray(job.metadata) ? job.metadata : {};
    const retries = Number(metadata.worker_failed_retry_count || 0);
    const maxRetries = 2;

    console.log("[clipper-worker] job failed reason", {
      id: job.id,
      error_message: job.error_message || job.error || null,
      retry_count: retries,
      max_retries: maxRetries,
    });

    if (retries >= maxRetries) {
      console.log("[clipper-worker] retry limit reached, skipping failed job", {
        id: job.id,
        retry_count: retries,
      });
      return;
    }

    const nextRetry = retries + 1;
    const { data: requeued, error: requeueErr } = await sb
      .from("video_jobs")
      .update({
        status: "queued",
        updated_at: new Date().toISOString(),
        metadata: {
          ...metadata,
          worker_failed_retry_count: nextRetry,
          worker_last_retry_at: new Date().toISOString(),
        },
      })
      .eq("id", job.id)
      .eq("status", "failed")
      .select("id,status")
      .maybeSingle();
    if (requeueErr) {
      console.error("[clipper-worker] failed job requeue error", requeueErr.message);
      return;
    }
    if (!requeued) return;

    console.log(`[clipper-worker] retrying job ${job.id} attempt ${nextRetry}`);
    return;
  }

  const { data: claimed, error: claimErr } = await sb
    .from("video_jobs")
    .update({ status: "processing", updated_at: new Date().toISOString() })
    .eq("id", job.id)
    .eq("status", "queued")
    .select("*")
    .maybeSingle();

  if (claimErr) {
    console.error("[clipper-worker] claim error", claimErr.message);
    return;
  }
  if (!claimed) return;

  console.log("[clipper-worker] job claimed", {
    id: claimed.id,
    status: claimed.status,
    source_kind: claimed.source_kind || null,
    source_url: claimed.source_url || null,
  });
  console.log("[clipper-worker] processing started", claimed.id);
  const trace = claimed.id === TRACE_JOB_ID;
  if (trace) {
    console.log("[clipper-worker][TRACE][1] job claimed", {
      jobId: claimed.id,
      source_kind: claimed.source_kind || null,
      source_url: claimed.source_url || null,
    });
  }

  try {
    await processVideoFromUrl(claimed, { trace });
    if (trace) {
      console.log("[clipper-worker][TRACE][12] job marked completed", { jobId: claimed.id });
    }
  } catch (e) {
    const raw = e instanceof Error ? e.message : String(e);
    const msg = toFailureMessage(raw);
    console.error("[clipper-worker] processing failed", msg);
    console.error("[clipper-worker][job failed]", {
      jobId: claimed.id,
      source_url: claimed.source_url || null,
      error: e?.message || String(e),
    });
    await sb
      .from("video_jobs")
      .update({
        status: "failed",
        error: e?.message || String(e) || "unknown error",
        error_message: msg,
        updated_at: new Date().toISOString(),
      })
      .eq("id", claimed.id)
      .eq("status", "processing");
    if (trace) {
      console.error("[clipper-worker][TRACE][12] job marked failed", {
        jobId: claimed.id,
        error: msg,
      });
    }
  }
}

async function runWorkerLoop() {
  console.log("[clipper-worker] started");
  while (true) {
    try {
      console.log("[clipper-worker] polling...");
      await processNextJob();
      console.log("[clipper-worker] idle");
    } catch (err) {
      console.error("[clipper-worker] error", err);
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
}

void runWorkerLoop();
