/**
 * processVideoFromUrl(job)
 * Downloads source with yt-dlp, cuts fixed segments with ffmpeg, uploads to Supabase clip-exports, writes DB rows.
 *
 * Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * Optional: SUPABASE_STORAGE_BUCKET_CLIP_EXPORTS (default clip-exports; must match app + dashboard)
 * System: yt-dlp and ffmpeg on PATH (see server/README.txt)
 */

import { createClient } from "@supabase/supabase-js";
import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import os from "os";

const execFileAsync = promisify(execFile);

const CLIP_EXPORT_BUCKET = process.env.SUPABASE_STORAGE_BUCKET_CLIP_EXPORTS || "clip-exports";

/** MVP fixed windows (start_sec inclusive, end_sec exclusive in naming — we use duration end-start). */
const SEGMENTS = [
  [0, 15],
  [30, 45],
  [60, 75],
];

function log(tag, ...args) {
  console.log(`[clipper-worker] ${tag}`, ...args);
}

async function ffprobeDurationSec(filePath) {
  const { stdout } = await execFileAsync("ffprobe", [
    "-v",
    "error",
    "-show_entries",
    "format=duration",
    "-of",
    "default=noprint_wrappers=1:nokey=1",
    filePath,
  ]);
  return Math.max(0, parseFloat(String(stdout).trim()) || 0);
}

async function findDownloadedVideo(tmpRoot) {
  const names = fs.readdirSync(tmpRoot);
  const vid = names.find((n) => /\.(mp4|webm|mkv|mov)$/i.test(n));
  if (!vid) throw new Error("yt-dlp did not produce a video file in temp dir");
  return path.join(tmpRoot, vid);
}

/**
 * @param {Record<string, unknown>} job — video_jobs row (must be status processing)
 * @returns {Promise<void>}
 */
export async function processVideoFromUrl(job) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  const sb = createClient(supabaseUrl, supabaseKey);
  const jobId = job.id;
  const projectId = job.project_id;
  const pageUrl =
    String(job.source_url || "").trim() ||
    (job.youtube_video_id ? `https://www.youtube.com/watch?v=${job.youtube_video_id}` : "");
  if (!pageUrl) throw new Error("Job has no source_url / youtube_video_id");

  const tmpRoot = path.join(os.tmpdir(), "alize-clipper", jobId);
  fs.mkdirSync(tmpRoot, { recursive: true });

  try {
    log("job claimed", jobId);

    const outTemplate = path.join(tmpRoot, "source.%(ext)s");
    await execFileAsync("yt-dlp", [
      "-f",
      "bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4]/b",
      "--merge-output-format",
      "mp4",
      "-o",
      outTemplate,
      "--no-playlist",
      pageUrl,
    ]);

    const inputPath = await findDownloadedVideo(tmpRoot);
    log("video downloaded", inputPath);

    const durationSec = await ffprobeDurationSec(inputPath);
    log("source duration_sec", durationSec);

    const lastEnd = SEGMENTS[SEGMENTS.length - 1][1];
    if (durationSec < lastEnd) {
      throw new Error(
        `Video is shorter than ${lastEnd}s (got ${Math.floor(durationSec)}s). Need at least 75s for fixed MVP segments.`,
      );
    }

    const clipArtifacts = [];
    for (let i = 0; i < SEGMENTS.length; i++) {
      const [start, end] = SEGMENTS[i];
      const len = end - start;
      const outp = path.join(tmpRoot, `clip-${i + 1}.mp4`);
      await execFileAsync("ffmpeg", [
        "-y",
        "-ss",
        String(start),
        "-i",
        inputPath,
        "-t",
        String(len),
        "-c",
        "copy",
        outp,
      ]);
      log("clips cut", `clip ${i + 1}`, `${start}s–${end}s`);
      clipArtifacts.push({ start, end, localPath: outp });
    }

    const clipInserts = [];
    const uploadMeta = [];

    for (let i = 0; i < clipArtifacts.length; i++) {
      const { start, end, localPath } = clipArtifacts[i];
      const buf = fs.readFileSync(localPath);
      const storagePath = `${projectId}/rendered-clips/${jobId}/clip-${i + 1}.mp4`;

      const { error: upErr } = await sb.storage.from(CLIP_EXPORT_BUCKET).upload(storagePath, buf, {
        contentType: "video/mp4",
        upsert: true,
      });
      if (upErr) throw new Error(upErr.message);

      const { data: pub } = sb.storage.from(CLIP_EXPORT_BUCKET).getPublicUrl(storagePath);
      const publicUrl = pub?.publicUrl;
      if (!publicUrl) throw new Error("Could not build public URL for clip upload");

      log("clips uploaded", `clip ${i + 1}`, publicUrl);

      clipInserts.push({
        job_id: jobId,
        project_id: projectId,
        label: `Clip ${i + 1}`,
        start_time_sec: start,
        end_time_sec: end,
        duration_sec: end - start,
        score: 80 - i * 5,
        caption: null,
        thumbnail_url: null,
        video_url: publicUrl,
        status: "ready",
      });

      uploadMeta.push({
        storage_path: storagePath,
        download_url: publicUrl,
      });
    }

    const { data: existingClips, error: existingErr } = await sb
      .from("video_clips")
      .select("id,label")
      .eq("job_id", jobId)
      .order("created_at", { ascending: true });
    if (existingErr) throw new Error(existingErr.message);

    const resolvedClipIds = [];
    for (let i = 0; i < clipInserts.length; i++) {
      const candidate = clipInserts[i];
      const match = (existingClips || []).find((r) => r.label === candidate.label);
      if (match) {
        const { error: upClipErr } = await sb
          .from("video_clips")
          .update({
            start_time_sec: candidate.start_time_sec,
            end_time_sec: candidate.end_time_sec,
            duration_sec: candidate.duration_sec,
            score: candidate.score,
            caption: candidate.caption,
            thumbnail_url: candidate.thumbnail_url,
            video_url: candidate.video_url,
            status: "ready",
          })
          .eq("id", match.id);
        if (upClipErr) throw new Error(upClipErr.message);
        resolvedClipIds.push(match.id);
      } else {
        const { data: insClip, error: insClipErr } = await sb
          .from("video_clips")
          .insert(candidate)
          .select("id")
          .single();
        if (insClipErr) throw new Error(insClipErr.message);
        resolvedClipIds.push(insClip.id);
      }
    }

    for (let i = 0; i < resolvedClipIds.length; i++) {
      const clipId = resolvedClipIds[i];
      const payload = {
        project_id: projectId,
        clip_id: clipId,
        status: "ready",
        storage_path: uploadMeta[i].storage_path,
        download_url: uploadMeta[i].download_url,
      };
      const { data: existingExport, error: exportFindErr } = await sb
        .from("clip_exports")
        .select("id")
        .eq("clip_id", clipId)
        .order("created_at", { ascending: false })
        .limit(1);
      if (exportFindErr) throw new Error(exportFindErr.message);
      const prev = existingExport?.[0];
      if (prev?.id) {
        const { error: expUpErr } = await sb.from("clip_exports").update(payload).eq("id", prev.id);
        if (expUpErr) throw new Error(expUpErr.message);
      } else {
        const { error: expInsErr } = await sb.from("clip_exports").insert(payload);
        if (expInsErr) throw new Error(expInsErr.message);
      }
    }

    const prevMeta =
      job.metadata && typeof job.metadata === "object" && !Array.isArray(job.metadata) ? job.metadata : {};
    await sb
      .from("video_jobs")
      .update({
        status: "completed",
        error_message: null,
        updated_at: new Date().toISOString(),
        metadata: {
          ...prevMeta,
          worker: {
            pipeline: "yt-dlp+ffmpeg",
            segments: SEGMENTS,
            source_duration_sec: durationSec,
          },
        },
      })
      .eq("id", jobId)
      .eq("status", "processing");

    log("processing completed", jobId);
  } finally {
    try {
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
}
