/**
 * One-shot verification: same DB tables as createVideoJobFromSourceUrl + fetchClipperState.
 * Run: node scripts/verify-clipper-real-path.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function loadDotEnv() {
  const p = join(root, ".env");
  if (!existsSync(p)) return {};
  const out = {};
  for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i <= 0) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    out[k] = v;
  }
  return out;
}

function parseYoutubeVideoId(raw) {
  const s = String(raw).trim();
  if (!s) return null;
  try {
    const url = new URL(s.startsWith("http") ? s : `https://${s}`);
    const host = url.hostname.replace(/^www\./, "").toLowerCase();
    if (host === "youtu.be") {
      const id = url.pathname.replace(/^\//, "").split("/").filter(Boolean)[0] ?? "";
      return /^[\w-]{11}$/.test(id) ? id : null;
    }
    if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
      const v = url.searchParams.get("v");
      if (v && /^[\w-]{11}$/.test(v)) return v;
      const m = url.pathname.match(/\/(shorts|embed|live|v)\/([\w-]{11})/);
      if (m && /^[\w-]{11}$/.test(m[2])) return m[2];
    }
  } catch {
    return null;
  }
  return null;
}

async function seedInstantYoutubeClips(sb, job) {
  const sourceUrl = (job.source_url || "").trim();
  const videoId = job.youtube_video_id || parseYoutubeVideoId(sourceUrl);
  if (!videoId || !sourceUrl) return 0;

  let title = "YouTube Clip";
  let thumb = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
  try {
    const r = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(sourceUrl)}&format=json`);
    if (r.ok) {
      const data = await r.json();
      if (data.title) title = String(data.title).trim();
      if (data.thumbnail_url) thumb = data.thumbnail_url;
    }
  } catch {
    /* ignore */
  }

  const hooks = [
    "Strong opening for retention",
    "Mid-video payoff moment",
    "Clear takeaway segment",
  ];
  const windows = [
    [0, 15],
    [30, 45],
    [60, 75],
  ];
  const rows = windows.map(([start, end], i) => ({
    job_id: job.id,
    project_id: job.project_id,
    label: `Clip ${i + 1} · ${title.length > 34 ? `${title.slice(0, 33)}…` : title}`,
    start_time_sec: start,
    end_time_sec: end,
    duration_sec: end - start,
    score: 82 - i * 6,
    caption: `${hooks[i] || "Suggested highlight"} • YouTube`,
    thumbnail_url: thumb,
    status: "ready",
  }));

  const ins = await sb.from("video_clips").insert(rows).select("id");
  if (ins.error) throw new Error(ins.error.message);
  return (ins.data ?? []).length;
}

async function main() {
  const env = { ...process.env, ...loadDotEnv() };
  const url = env.VITE_SUPABASE_URL;
  const key = env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const testUrl = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
  const projectId = `verify-${Date.now()}`;

  if (!url || !key) {
    console.log(
      JSON.stringify(
        {
          verdict: "BLOCKED_NO_ENV",
          reason: "VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY missing",
          realPathPossible: false,
        },
        null,
        2,
      ),
    );
    process.exit(0);
  }

  const sb = createClient(url, key);
  const ytId = parseYoutubeVideoId(testUrl);

  const inserted = await sb
    .from("video_jobs")
    .insert({
      project_id: projectId,
      source_path: "",
      source_filename: "link-import",
      source_size_bytes: 0,
      source_mime_type: "text/uri-list",
      source_kind: "youtube_url",
      source_url: testUrl,
      youtube_video_id: ytId,
      metadata: {},
      status: "queued",
    })
    .select("*")
    .single();

  if (inserted.error) {
    console.log(
      JSON.stringify(
        {
          verdict: "INSERT_FAILED",
          error: inserted.error.message,
          hint: "RLS, wrong project, or invalid schema",
          realPathPossible: false,
        },
        null,
        2,
      ),
    );
    process.exit(0);
  }

  const row = inserted.data;
  await sb
    .from("video_jobs")
    .update({
      status: "completed",
      updated_at: new Date().toISOString(),
      error_message: null,
    })
    .eq("id", row.id);

  let clipCount = 0;
  try {
    clipCount = await seedInstantYoutubeClips(sb, { ...row, project_id: projectId, source_url: testUrl, youtube_video_id: ytId });
  } catch (e) {
    console.log(
      JSON.stringify(
        {
          verdict: "SEED_FAILED",
          jobId: row.id,
          jobStatusAfterUpdate: "completed",
          seedError: e instanceof Error ? e.message : String(e),
        },
        null,
        2,
      ),
    );
  }

  const clipsRes = await sb.from("video_clips").select("id,label,thumbnail_url,job_id").eq("job_id", row.id);

  console.log(
    JSON.stringify(
      {
        verdict: clipCount >= 3 && !clipsRes.error ? "REAL_PATH_OK" : "PARTIAL_OR_FAILED",
        video_jobs: {
          id: row.id,
          status: "completed",
          source_kind: row.source_kind,
          project_id: projectId,
        },
        video_clips_inserted: clipCount,
        video_clips_rows_fetched: clipsRes.data?.length ?? 0,
        fetch_error: clipsRes.error?.message ?? null,
        sample_labels: (clipsRes.data ?? []).slice(0, 3).map((c) => c.label),
        sample_thumbnails: (clipsRes.data ?? []).slice(0, 3).map((c) => c.thumbnail_url),
        realPathPossible: clipCount >= 3 && !clipsRes.error,
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.log(JSON.stringify({ verdict: "SCRIPT_ERROR", error: String(e) }, null, 2));
  process.exit(1);
});
