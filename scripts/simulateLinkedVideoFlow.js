import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

function readEnvFile() {
  const envPath = path.join(process.cwd(), ".env");
  const out = {};
  if (!fs.existsSync(envPath)) return out;
  const text = fs.readFileSync(envPath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    out[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
  }
  return out;
}

async function run() {
  const env = readEnvFile();
  const supabaseUrl = process.env.SUPABASE_URL || env.SUPABASE_URL || env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  const sb = createClient(supabaseUrl, supabaseKey);
  const links = [
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "https://www.youtube.com/watch?v=ysz5S6PUM-U",
    "https://www.youtube.com/watch?v=jNQXAC9IVRw",
  ];

  for (const sourceUrl of links) {
    const youtubeVideoId = (sourceUrl.match(/v=([^&]+)/) || [])[1] || null;
    const inserted = await sb
      .from("video_jobs")
      .insert({
        project_id: "video-mvp",
        source_path: "",
        source_filename: "link-import",
        source_size_bytes: 0,
        source_mime_type: "text/uri-list",
        source_kind: "youtube_url",
        source_url: sourceUrl,
        youtube_video_id: youtubeVideoId,
        metadata: { simulation: "linked-video-route" },
        status: "queued",
      })
      .select("id,status,source_url,created_at")
      .single();

    if (inserted.error) {
      console.log("create failed", sourceUrl, inserted.error.message);
      continue;
    }

    const job = inserted.data;
    console.log("created", job.id, job.status, job.source_url);
    const startedAt = Date.now();
    let finished = false;

    while (Date.now() - startedAt < 240000) {
      const jobRes = await sb
        .from("video_jobs")
        .select("id,status,error_message,updated_at")
        .eq("id", job.id)
        .single();
      if (jobRes.error) {
        console.log("job read error", job.id, jobRes.error.message);
        break;
      }

      const clipsRes = await sb
        .from("video_clips")
        .select("id,job_id,video_url,created_at")
        .eq("job_id", job.id)
        .order("created_at", { ascending: true });
      if (clipsRes.error) {
        console.log("clip read error", job.id, clipsRes.error.message);
        break;
      }

      const playable = (clipsRes.data || []).filter((c) => typeof c.video_url === "string" && /^https?:\/\//i.test(c.video_url));
      console.log("poll", job.id, jobRes.data.status, "clips", playable.length);

      if (jobRes.data.status === "failed") {
        console.log("failed", job.id, jobRes.data.error_message || "");
        finished = true;
        break;
      }

      if (playable.length >= 3) {
        console.log("ready", job.id, playable.slice(0, 3).map((c) => ({ job_id: c.job_id, video_url: c.video_url })));
        finished = true;
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, 4000));
    }

    if (!finished) {
      console.log("timeout", job.id);
    }
  }
}

run().catch((err) => {
  console.error(err.message || String(err));
  process.exit(1);
});
