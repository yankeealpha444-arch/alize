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

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("[clipper-worker] Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const sb = createClient(supabaseUrl, supabaseKey);

async function tick() {
  const { data: queued, error: qErr } = await sb
    .from("video_jobs")
    .select("*")
    .eq("status", "queued")
    .in("source_kind", ["youtube_url", "youtube_id"])
    .order("created_at", { ascending: true })
    .limit(1);

  if (qErr) {
    console.error("[clipper-worker] poll error", qErr.message);
    return;
  }
  const job = queued?.[0];
  if (!job) return;

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

  console.log("[clipper-worker] job claimed", claimed.id);
  console.log("[clipper-worker] processing started", claimed.id);

  try {
    await processVideoFromUrl(claimed);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[clipper-worker] processing failed", msg);
    await sb
      .from("video_jobs")
      .update({
        status: "failed",
        error_message: msg,
        updated_at: new Date().toISOString(),
      })
      .eq("id", claimed.id);
  }
}

const intervalMs = Number(process.env.CLIP_WORKER_POLL_MS || 4000);
setInterval(() => {
  void tick();
}, intervalMs);
void tick();
