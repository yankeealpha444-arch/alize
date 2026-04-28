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
import ytdl from "ytdl-core";
import { loadEnvFromRoot } from "./loadEnvFromRoot.mjs";

const execFileAsync = promisify(execFile);
loadEnvFromRoot();
console.log("[clipper-worker] SHORTS_WINDOW_LOGIC_V2_ACTIVE");
console.log("[clipper-worker] VIRAL_HEURISTIC_V1_ACTIVE");

const CLIP_EXPORT_BUCKET = process.env.SUPABASE_STORAGE_BUCKET_CLIP_EXPORTS || "clip-exports";
const VIDEO_UPLOAD_BUCKET = process.env.SUPABASE_STORAGE_BUCKET_VIDEO_UPLOADS || "video-uploads";
const WIN = process.platform === "win32";
const FORBIDDEN_PLACEHOLDER_HOST = "interactive-examples.mdn.mozilla.net";

function existsFile(p) {
  try {
    return Boolean(p) && fs.existsSync(p);
  } catch {
    return false;
  }
}

function resolveExecutable(envVar, names, discovered = []) {
  const fromEnv = process.env[envVar];
  if (existsFile(fromEnv)) return fromEnv;

  const checks = [...discovered];
  if (WIN) {
    const local = process.env.LOCALAPPDATA || "";
    const winChecksByEnv = {
      YT_DLP_PATH: [
        path.join(local, "Microsoft", "WinGet", "Packages", "yt-dlp.yt-dlp_Microsoft.Winget.Source_8wekyb3d8bbwe", "yt-dlp.exe"),
      ],
      FFMPEG_PATH: [
        path.join(local, "Microsoft", "WinGet", "Packages", "Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe", "ffmpeg-8.1-full_build", "bin", "ffmpeg.exe"),
        path.join(local, "Microsoft", "WinGet", "Packages", "yt-dlp.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe", "ffmpeg-N-123778-g3b55818764-win64-gpl", "bin", "ffmpeg.exe"),
      ],
      FFPROBE_PATH: [
        path.join(local, "Microsoft", "WinGet", "Packages", "Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe", "ffmpeg-8.1-full_build", "bin", "ffprobe.exe"),
        path.join(local, "Microsoft", "WinGet", "Packages", "yt-dlp.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe", "ffmpeg-N-123778-g3b55818764-win64-gpl", "bin", "ffprobe.exe"),
      ],
    };
    checks.push(...(winChecksByEnv[envVar] || []));
  }
  const found = checks.find(existsFile);
  if (found) return found;

  return names[0];
}

const YT_DLP_BIN = resolveExecutable("YT_DLP_PATH", ["yt-dlp", "yt-dlp.exe"], [
  process.env.YT_DLP_PATH || "",
]);
const FFMPEG_BIN = resolveExecutable("FFMPEG_PATH", ["ffmpeg", "ffmpeg.exe"], [
  process.env.FFMPEG_PATH || "",
]);
const FFPROBE_BIN = resolveExecutable(
  "FFPROBE_PATH",
  ["ffprobe", "ffprobe.exe"],
  [
    process.env.FFPROBE_PATH || "",
    process.env.FFMPEG_PATH
      ? process.env.FFMPEG_PATH.replace(/ffmpeg(?:\.exe)?$/i, WIN ? "ffprobe.exe" : "ffprobe")
      : "",
  ],
);

/** YouTube Shorts–style: each export is a bounded-length MP4, never a third of a long file. */
const MIN_CLIP_SEC = 15;
const MAX_CLIP_SEC = 45;
const INTRO_SKIP_SEC = 5;
const GAP_SEC = 2;
const NUM_CLIPS = 3;

/** When ffprobe fails — still cut three short early windows (never 0–full). */
const FALLBACK_UNKNOWN_DURATION_SEGMENTS = [
  [5, 25],
  [30, 50],
  [60, 80],
];

/**
 * Clamp [start, end] to source length; enforce max duration MAX_CLIP_SEC; avoid sub-second exports.
 * @param {number} start
 * @param {number} end
 * @param {number} T
 * @returns {[number, number]}
 */
function clampWindow(start, end, T) {
  let s = Math.max(0, Math.min(T, start));
  let e = Math.max(s + 1, Math.min(T, end));
  let dur = e - s;
  if (dur > MAX_CLIP_SEC) {
    e = s + MAX_CLIP_SEC;
    dur = e - s;
  }
  if (dur < MIN_CLIP_SEC && T - s >= MIN_CLIP_SEC) {
    e = Math.min(T, s + MIN_CLIP_SEC);
  }
  return [Math.round(s * 100) / 100, Math.round(e * 100) / 100];
}

/**
 * Three non-overlapping Shorts-length windows spread through the timeline (heuristic “viral” placement).
 * @param {number} durationSec — ffprobe duration in seconds; 0 / NaN means unknown.
 * @returns {Array<[number, number]>}
 */
function computeClipWindows(durationSec) {
  const T = Number(durationSec);
  if (!Number.isFinite(T) || T <= 0) {
    log("clip windows", { reason: "duration_unknown_or_zero", segments: FALLBACK_UNKNOWN_DURATION_SEGMENTS });
    return FALLBACK_UNKNOWN_DURATION_SEGMENTS.map((x) => [...x]);
  }

  const total = Math.floor(T);

  /** Very short source: best-effort 3 tiles (may be <15s each). Never one clip = full length if avoidable. */
  if (total < INTRO_SKIP_SEC + NUM_CLIPS * 4 + (NUM_CLIPS - 1) * GAP_SEC) {
    const piece = Math.max(1, Math.floor((total - (NUM_CLIPS - 1) * GAP_SEC) / NUM_CLIPS));
    const out = [];
    let at = 0;
    for (let i = 0; i < NUM_CLIPS; i++) {
      const s = at;
      const e = i === NUM_CLIPS - 1 ? total : Math.min(total, at + piece);
      out.push(clampWindow(s, e, total));
      at = e + GAP_SEC;
    }
    log("clip windows", { reason: "very_short_source", total, segments: out });
    return out;
  }

  /** Choose target length (prefer 15–45s each) that fits three windows + gaps after intro skip. */
  const usable = total - INTRO_SKIP_SEC - (NUM_CLIPS - 1) * GAP_SEC;
  let L = Math.floor(usable / NUM_CLIPS);
  L = Math.min(MAX_CLIP_SEC, L);
  const minSlots = NUM_CLIPS * MIN_CLIP_SEC + (NUM_CLIPS - 1) * GAP_SEC;
  if (usable >= minSlots) {
    L = Math.max(MIN_CLIP_SEC, L);
  }
  L = Math.max(4, L);

  /**
   * Viral heuristic zones (launch-safe):
   *  - early hook: 8–25%
   *  - middle payoff: 40–55%
   *  - late tension: 70–85%
   */
  const zones = [
    { name: "early_hook_zone", startPct: 0.08, endPct: 0.25 },
    { name: "middle_payoff_zone", startPct: 0.4, endPct: 0.55 },
    { name: "late_high_tension_zone", startPct: 0.7, endPct: 0.85 },
  ];
  const picks = [];
  for (let i = 0; i < zones.length; i++) {
    const z = zones[i];
    const zoneStart = Math.floor(total * z.startPct);
    const zoneEnd = Math.ceil(total * z.endPct);
    const zoneSpan = Math.max(1, zoneEnd - zoneStart);
    let s = zoneStart + Math.max(0, Math.floor((zoneSpan - L) / 2));
    if (i === 0) s = Math.max(INTRO_SKIP_SEC, s);
    let e = s + L;
    if (e > total) {
      e = total;
      s = Math.max(i === 0 ? INTRO_SKIP_SEC : 0, e - L);
    }
    picks.push([s, e]);
  }

  // Enforce non-overlap with gap.
  for (let i = 1; i < picks.length; i++) {
    if (picks[i][0] < picks[i - 1][1] + GAP_SEC) {
      const ns = picks[i - 1][1] + GAP_SEC;
      picks[i][0] = ns;
      picks[i][1] = ns + L;
      if (picks[i][1] > total) {
        picks[i][1] = total;
        picks[i][0] = Math.max(i === 0 ? INTRO_SKIP_SEC : 0, total - L);
      }
    }
  }

  const out = picks.map(([s, e], i) => {
    const minStart = i === 0 ? INTRO_SKIP_SEC : 0;
    return clampWindow(Math.max(minStart, s), e, total);
  });
  log("clip windows", {
    reason: "viral_heuristic_zone_selection",
    total,
    clipLen: L,
    zones,
    segments: out,
  });
  return out;
}

function enforceShortsDurationWindows(segments, durationSec) {
  const T = Number(durationSec);
  return segments.map(([start, end]) => {
    let s = Number(start);
    let e = Number(end);
    if (!Number.isFinite(s)) s = 0;
    if (!Number.isFinite(e)) e = s + MIN_CLIP_SEC;
    if (e <= s) e = s + MIN_CLIP_SEC;
    let len = e - s;
    if (len > MAX_CLIP_SEC) {
      e = s + MAX_CLIP_SEC;
      len = e - s;
    }
    if (Number.isFinite(T) && T > 0) {
      if (e > T) {
        e = T;
        s = Math.max(0, e - Math.min(MAX_CLIP_SEC, Math.max(MIN_CLIP_SEC, len)));
        len = e - s;
      }
      // Enforce 15s minimum whenever source is long enough.
      if (T >= MIN_CLIP_SEC && len < MIN_CLIP_SEC) {
        e = Math.min(T, s + MIN_CLIP_SEC);
        if (e - s < MIN_CLIP_SEC) {
          s = Math.max(0, e - MIN_CLIP_SEC);
        }
      }
    }
    return [Math.round(s * 100) / 100, Math.round(e * 100) / 100];
  });
}

function heuristicCaption(index, start, end, total) {
  const labels = [
    "Early hook moment",
    "Mid-video payoff moment",
    "Late high-interest moment",
  ];
  return labels[index] || `Clip ${index + 1}`;
}

function heuristicScore(index) {
  return Math.max(55, 88 - index * 8);
}

function isRealSupabaseClipUrl(url, supabaseBaseUrl, bucket) {
  const u = String(url || "").trim();
  if (!u) return false;
  if (u.includes(FORBIDDEN_PLACEHOLDER_HOST)) return false;
  const expectedPrefix = `${supabaseBaseUrl}/storage/v1/object/public/${bucket}/`;
  return u.startsWith(expectedPrefix);
}

function log(tag, ...args) {
  console.log(`[clipper-worker] ${tag}`, ...args);
}

function formatExecError(err) {
  if (!err) return "Unknown command error";
  if (err instanceof Error) {
    const stderr = typeof err.stderr === "string" ? err.stderr.trim() : "";
    const stdout = typeof err.stdout === "string" ? err.stdout.trim() : "";
    if (stderr) return `${err.message}\n${stderr}`.trim();
    if (stdout) return `${err.message}\n${stdout}`.trim();
    return err.message;
  }
  return String(err);
}

function isExecutableMissingError(err) {
  if (!err) return false;
  const code = err && typeof err === "object" && "code" in err ? String(err.code || "") : "";
  const msg = formatExecError(err).toLowerCase();
  return code === "ENOENT" || msg.includes("spawn yt-dlp enoent");
}

async function resolveYoutubeStreamUrlWithYtdlCore(pageUrl) {
  const info = await ytdl.getInfo(pageUrl);
  const chosen = ytdl.chooseFormat(info.formats, {
    quality: "highestvideo",
    filter: (format) => {
      const hasMuxed = format.hasVideo && format.hasAudio;
      const withinHeight = Number.isFinite(format.height) ? format.height <= 720 : true;
      return hasMuxed && withinHeight;
    },
  });
  const url = String(chosen?.url || "").trim();
  if (!url) {
    throw new Error("ytdl-core returned no playable stream url");
  }
  return url;
}

async function downloadYoutubeWithYtdlCoreToFile(pageUrl, outputPath) {
  await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });
  const userAgent =
    process.env.YTDL_USER_AGENT ||
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
  await new Promise((resolve, reject) => {
    const stream = ytdl(pageUrl, {
      quality: "highest",
      filter: "audioandvideo",
      requestOptions: {
        headers: {
          "user-agent": userAgent,
          accept: "*/*",
          "accept-language": "en-US,en;q=0.9",
          referer: "https://www.youtube.com/",
          origin: "https://www.youtube.com",
        },
      },
    });
    const out = fs.createWriteStream(outputPath);
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      resolve();
    };
    const fail = (err) => {
      if (settled) return;
      settled = true;
      reject(err);
    };
    stream.on("error", fail);
    out.on("error", fail);
    out.on("finish", finish);
    stream.pipe(out);
  });
}

async function updateJobStage(sb, jobId, prevMeta, stage, details = {}) {
  const nextMeta = {
    ...prevMeta,
    worker: {
      ...(prevMeta.worker || {}),
      stage,
      stage_updated_at: new Date().toISOString(),
      ...details,
    },
  };

  await sb
    .from("video_jobs")
    .update({
      updated_at: new Date().toISOString(),
      metadata: nextMeta,
    })
    .eq("id", jobId)
    .eq("status", "processing");

  return nextMeta;
}

async function ffprobeDurationSec(filePath) {
  try {
    const { stdout, stderr } = await execFileAsync(FFPROBE_BIN, [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      filePath,
    ]);
    const trimmed = String(stdout ?? "").trim();
    const v = parseFloat(trimmed);
    if (!Number.isFinite(v) || v <= 0) {
      console.error("[clipper-worker][ffprobe] duration parse failed or zero", {
        filePath,
        stdout: trimmed,
        stderrPreview: String(stderr ?? "").slice(0, 800),
      });
      return 0;
    }
    return v;
  } catch (err) {
    console.error("[clipper-worker][ffprobe][ERROR]", {
      filePath,
      message: err && typeof err === "object" && "message" in err ? String(err.message) : String(err),
    });
    return 0;
  }
}

/**
 * @param {Record<string, unknown>} job — video_jobs row (must be status processing)
 * @returns {Promise<void>}
 */
export async function processVideoFromUrl(job) {
  const trace = Boolean(arguments[1]?.trace);
  const YTDLP_TIMEOUT_MS = 300000;
  const FFMPEG_CLIP_TIMEOUT_MS = 90000;
  const STORAGE_DOWNLOAD_TIMEOUT_MS = 120000;
  const FFPROBE_TIMEOUT_MS = 120000;
  const UPLOAD_TIMEOUT_MS = 120000;
  const step = (n, label, payload = undefined) => {
    if (!trace) return;
    if (payload === undefined) {
      console.log(`[clipper-worker][TRACE][${n}] ${label}`);
    } else {
      console.log(`[clipper-worker][TRACE][${n}] ${label}`, payload);
    }
  };
  const withTimeout = async (timeoutMs, label, fn) => {
    return await Promise.race([
      fn(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Step timeout: ${label}`)), timeoutMs),
      ),
    ]);
  };

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  const sb = createClient(supabaseUrl, supabaseKey);
  const jobId = job.id;
  const projectId = job.project_id;
  let jobMetadata =
    job.metadata && typeof job.metadata === "object" && !Array.isArray(job.metadata) ? job.metadata : {};
  const sourceKind = String(job.source_kind || "").trim();
  const pageUrl =
    String(job.source_url || "").trim() ||
    (job.youtube_video_id ? `https://www.youtube.com/watch?v=${job.youtube_video_id}` : "");
  step(2, "source_url read", { source_url: pageUrl || null, source_kind: sourceKind });

  const tmpRoot = path.join(os.tmpdir(), "alize-clipper", jobId);
  fs.mkdirSync(tmpRoot, { recursive: true });

  try {
    log("job claimed", { id: jobId, status: "processing", source_kind: sourceKind || null, source_url: pageUrl || null });
    jobMetadata = await updateJobStage(sb, jobId, jobMetadata, "starting");

    console.log("[clipper-worker] YT_DLP_BIN =", YT_DLP_BIN);
    console.log("[clipper-worker] FFMPEG_BIN =", FFMPEG_BIN);
    console.log("[clipper-worker] FFPROBE_BIN =", FFPROBE_BIN);
    log("binary", "yt-dlp", YT_DLP_BIN);
    log("binary", "ffmpeg", FFMPEG_BIN);
    log("binary", "ffprobe", FFPROBE_BIN);

    let inputMediaSource = "";
    let sourceIsLocalFile = false;
    if (sourceKind === "upload" || (!sourceKind && String(job.source_path || "").trim())) {
      const sourcePath = String(job.source_path || "").trim();
      if (!sourcePath) throw new Error("Job has no source_path for upload");
      log("upload source path", sourcePath);
      jobMetadata = await updateJobStage(sb, jobId, jobMetadata, "upload-source-download-starting", { source_path: sourcePath });
      step(3, "download command started", { mode: "storage-download", sourcePath });
      const dl = await withTimeout(STORAGE_DOWNLOAD_TIMEOUT_MS, "storage download source video", async () => {
        return await sb.storage.from(VIDEO_UPLOAD_BUCKET).download(sourcePath);
      });
      if (dl.error) throw new Error(dl.error.message || "Could not download uploaded source video");
      const arrayBuffer = await dl.data.arrayBuffer();
      inputMediaSource = path.join(tmpRoot, "source-upload.mp4");
      fs.writeFileSync(inputMediaSource, Buffer.from(arrayBuffer));
      sourceIsLocalFile = true;
      jobMetadata = await updateJobStage(sb, jobId, jobMetadata, "upload-source-download-complete");
      step(4, "download command completed", { mode: "storage-download", inputPath: inputMediaSource });
      log("upload video downloaded", inputMediaSource);
    } else if (sourceKind === "remote_url") {
      if (!pageUrl) throw new Error("Job has no source_url for remote_url processing");
      step(3, "download command started", { mode: "remote-url-direct", source_url: pageUrl });
      jobMetadata = await updateJobStage(sb, jobId, jobMetadata, "remote-url-direct", {
        source_url: pageUrl,
        strategy: "direct-media-url",
      });
      inputMediaSource = pageUrl;
      sourceIsLocalFile = false;
      step(4, "download command completed", { mode: "remote-url-direct", inputMediaSource });
      log("remote_url direct media source", { jobId, source_url: pageUrl });
    } else {
      if (!pageUrl) throw new Error("Job has no source_url / youtube_video_id");
      step(3, "download command started", { mode: "yt-dlp", source_url: pageUrl });
      console.log("[clipper-worker] yt-dlp start", { jobId, source_url: pageUrl });
      log("yt-dlp start", { jobId, source_url: pageUrl });
      jobMetadata = await updateJobStage(sb, jobId, jobMetadata, "yt-dlp-starting", { source_url: pageUrl });
      const cookiesFromBrowser = String(process.env.YTDLP_COOKIES_FROM_BROWSER || "").trim();
      const ytDlpArgs = [
        "-g",
        "-f",
        "best[height<=360][ext=mp4]/mp4",
        "--no-playlist",
        "--retries",
        "3",
        "--fragment-retries",
        "3",
        "--socket-timeout",
        "30",
        "--force-ipv4",
      ];
      if (cookiesFromBrowser) {
        ytDlpArgs.push("--cookies-from-browser", cookiesFromBrowser);
        log(`yt-dlp cookies-from-browser enabled: ${cookiesFromBrowser}`);
      }
      ytDlpArgs.push(pageUrl);
      log("yt-dlp args", { jobId, args: ytDlpArgs });
      jobMetadata = await updateJobStage(sb, jobId, jobMetadata, "yt-dlp-downloading", { strategy: "stream-url" });
      try {
        const { stdout } = await withTimeout(YTDLP_TIMEOUT_MS, "yt-dlp get stream url", async () => {
          return await execFileAsync(YT_DLP_BIN, ytDlpArgs);
        });
        inputMediaSource = String(stdout || "")
          .split(/\r?\n/)
          .map((line) => line.trim())
          .find((line) => /^https?:\/\//i.test(line)) || "";
        if (!inputMediaSource) {
          throw new Error("yt-dlp returned no playable stream url");
        }
        sourceIsLocalFile = false;
        jobMetadata = await updateJobStage(sb, jobId, jobMetadata, "yt-dlp-complete", { strategy: "stream-url" });
        console.log("[clipper-worker] yt-dlp success", { jobId, source_url: pageUrl, stream_url_found: true });
        log("yt-dlp success", { jobId, source_url: pageUrl, stream_url_found: true });
      } catch (err) {
        const msg = formatExecError(err);
        console.error("[clipper-worker] yt-dlp error", { jobId, error_message: msg });
        log("yt-dlp fail", { jobId, error_message: msg });
        if (!isExecutableMissingError(err)) {
          throw new Error(msg);
        }
        log("yt-dlp missing; fallback to ytdl-core", { jobId, source_url: pageUrl });
        jobMetadata = await updateJobStage(sb, jobId, jobMetadata, "ytdl-core-fallback-starting", {
          source_url: pageUrl,
          fallback_reason: "spawn_yt-dlp_enoent",
        });
        try {
          const ytdlFallbackPath = path.join(tmpRoot, "source-ytdl-core-fallback.mp4");
          await withTimeout(YTDLP_TIMEOUT_MS, "ytdl-core download source video", async () => {
            await downloadYoutubeWithYtdlCoreToFile(pageUrl, ytdlFallbackPath);
          });
          if (!existsFile(ytdlFallbackPath)) {
            throw new Error("ytdl-core fallback did not produce local source file");
          }
          inputMediaSource = ytdlFallbackPath;
          sourceIsLocalFile = true;
          jobMetadata = await updateJobStage(sb, jobId, jobMetadata, "ytdl-core-fallback-complete", {
            strategy: "local-file",
          });
          log("ytdl-core fallback success", { jobId, source_url: pageUrl, output_path: ytdlFallbackPath });
        } catch (fallbackErr) {
          const fallbackMsg = formatExecError(fallbackErr);
          if (fallbackMsg.includes("Status code: 410")) {
            throw new Error(`youtube_stream_410_source_unusable: ${fallbackMsg}`);
          }
          log("ytdl-core fallback fail", { jobId, error_message: fallbackMsg });
          throw new Error(fallbackMsg);
        }
      }
      step(4, "download command completed", { mode: "yt-dlp", inputMediaSource });
      log("video stream resolved", { inputMediaSource });
    }
    step(5, "input source ready", {
      inputMediaSource,
      sourceIsLocalFile,
      exists: sourceIsLocalFile ? fs.existsSync(inputMediaSource) : null,
    });

    jobMetadata = await updateJobStage(sb, jobId, jobMetadata, "ffprobe");
    step(6, "ffprobe started", { inputMediaSource });
    const durationSec = await withTimeout(FFPROBE_TIMEOUT_MS, "ffprobe duration", async () => {
      return await ffprobeDurationSec(inputMediaSource);
    });
    log("ffprobe duration", { jobId, duration_sec: durationSec });
    step(7, "ffprobe completed", { durationSec });
    log("source duration_sec", durationSec);
    if (!Number.isFinite(durationSec) || durationSec <= 0) {
      let bytes = null;
      try {
        bytes = sourceIsLocalFile ? fs.statSync(inputMediaSource).size : null;
      } catch {
        /* ignore */
      }
      console.error(
        "[clipper-worker] ffprobe reported no usable duration; continuing with fallback segment plan 0–15 / 15–30 / 30–45 (not a length failure)",
        { jobId, inputMediaSource, bytes },
      );
    }

    const segments = enforceShortsDurationWindows(computeClipWindows(durationSec), durationSec);
    log("clip window chosen", { jobId, segments });
    log("clip windows resolved", segments);

    const clipArtifacts = [];
    jobMetadata = await updateJobStage(sb, jobId, jobMetadata, "exporting-clips", {
      clip_count_target: segments.length,
    });
    for (let i = 0; i < segments.length; i++) {
      const [start, end] = segments[i];
      const len = end - start;
      const inputPath = inputMediaSource;
      const outputPath = path.join(tmpRoot, `clip-${i + 1}-out.mp4`);
      // Seek before -i for faster remote stream cutting.
      const ffmpegArgs = [
        "-y",
        "-ss",
        String(start),
        "-t",
        String(len),
        "-i",
        inputPath,
        "-map",
        "0:v:0?",
        "-map",
        "0:a:0?",
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-crf",
        "20",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-b:a",
        "128k",
        "-movflags",
        "+faststart",
      ];
      ffmpegArgs.push(outputPath);
      console.log("[ffmpeg] input:", inputPath);
      console.log("[ffmpeg] output:", outputPath);
      console.log("[ffmpeg-check] final input:", inputPath);
      console.log("[ffmpeg-check] final output:", outputPath);
      console.log("[ffmpeg-final] ARGS:", ffmpegArgs.join(" "));
      log("clip export plan", {
        clip_index: i + 1,
        start_time_sec: start,
        end_time_sec: end,
        output_path: outputPath,
        ffmpeg_args: ffmpegArgs,
      });
      if (i === 0) step(8, "ffmpeg clip 1 started", { start_time_sec: start, end_time_sec: end });
      log("ffmpeg export start", {
        jobId,
        clip_index: i + 1,
        start_time_sec: start,
        end_time_sec: end,
        output_path: outputPath,
      });
      await withTimeout(FFMPEG_CLIP_TIMEOUT_MS, `ffmpeg clip ${i + 1}`, async () => {
        try {
          await execFileAsync(FFMPEG_BIN, ffmpegArgs);
          log("ffmpeg export success", { jobId, clip_index: i + 1, output_path: outputPath });
        } catch (err) {
          const msg = formatExecError(err);
          log("ffmpeg export fail", { jobId, clip_index: i + 1, error_message: msg });
          throw new Error(`ffmpeg clip ${i + 1} failed: ${msg}`);
        }
      });
      if (i === 0) step(9, "clip 1 completed", { outputPath });
      console.log("[clipper-worker] clip file created", outputPath);
      log("clips cut", `clip ${i + 1}`, `${start}s–${end}s`);
      clipArtifacts.push({ start, end, localPath: outputPath });
    }

    const clipInserts = [];
    const uploadMeta = [];
    jobMetadata = await updateJobStage(sb, jobId, jobMetadata, "uploading-clips", {
      clip_count_target: clipArtifacts.length,
    });

    for (let i = 0; i < clipArtifacts.length; i++) {
      const { start, end, localPath } = clipArtifacts[i];
      const buf = fs.readFileSync(localPath);
      const storagePath = `${projectId}/rendered-clips/${jobId}/clip-${i + 1}.mp4`;

      if (i === 0) step(10, "upload started", { storagePath });
      log("Supabase upload start", { jobId, clip_index: i + 1, storage_path: storagePath });
      const { data: upData, error: upErr } = await withTimeout(UPLOAD_TIMEOUT_MS, `upload clip ${i + 1}`, async () => {
        return await sb.storage.from(CLIP_EXPORT_BUCKET).upload(storagePath, buf, {
          contentType: "video/mp4",
          upsert: true,
        });
      });
      console.log("[clipper-worker] upload result", { data: upData, error: upErr });
      if (upErr) {
        log("Supabase upload fail", { jobId, clip_index: i + 1, error_message: upErr.message });
        console.error("[clipper-worker][EXPORT ERROR]", upErr);
        throw new Error(upErr.message);
      }
      log("Supabase upload success", { jobId, clip_index: i + 1, storage_path: storagePath });

      const publicUrl = `${supabaseUrl}/storage/v1/object/public/${CLIP_EXPORT_BUCKET}/${storagePath}`;
      if (!publicUrl) throw new Error("Could not build public URL for clip upload");
      if (publicUrl.includes(FORBIDDEN_PLACEHOLDER_HOST)) {
        throw new Error(`Refusing placeholder clip URL: ${publicUrl}`);
      }

      log("clips uploaded", `clip ${i + 1}`, publicUrl);
      console.log("[clipper-worker] real clip uploaded", {
        label: `Clip ${i + 1}`,
        publicUrl,
      });
      if (i === 0) step(11, "upload completed", { storagePath, publicUrl });
      log("clip upload mapping", {
        clip_index: i + 1,
        start_time_sec: start,
        end_time_sec: end,
        output_path: localPath,
        storage_path: storagePath,
        public_url: publicUrl,
      });

      const clipScore = heuristicScore(i);
      const clipCaption = heuristicCaption(i, start, end, Number(durationSec) > 0 ? Number(durationSec) : end);
      if (!isRealSupabaseClipUrl(publicUrl, supabaseUrl, CLIP_EXPORT_BUCKET)) {
        throw new Error(`Clip upload URL is not a real Supabase export URL: ${publicUrl}`);
      }
      clipInserts.push({
        job_id: jobId,
        project_id: projectId,
        label: `Clip ${i + 1}`,
        start_time_sec: start,
        end_time_sec: end,
        duration_sec: end - start,
        score: clipScore,
        caption: clipCaption,
        thumbnail_url: null,
        video_url: publicUrl,
        status: "ready",
      });
      console.log("[clipper-worker] viral clip window chosen", {
        label: `Clip ${i + 1}`,
        start_time_sec: start,
        end_time_sec: end,
        duration: end - start,
        score: clipScore,
        caption: clipCaption,
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
      console.log("[clipper-worker] inserting clip row", {
        label: candidate.label,
        video_url: candidate.video_url,
      });
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
        if (upClipErr) {
          log("video_clips insert fail", { jobId, clip_index: i + 1, error_message: upClipErr.message });
          throw new Error(upClipErr.message);
        }
        log("video_clips insert success", { jobId, clip_index: i + 1, clip_id: match.id, mode: "update" });
        resolvedClipIds.push(match.id);
        log("clip row updated", {
          clip_id: match.id,
          label: candidate.label,
          start_time_sec: candidate.start_time_sec,
          end_time_sec: candidate.end_time_sec,
          video_url: candidate.video_url,
        });
      } else {
        const { data: insClip, error: insClipErr } = await sb
          .from("video_clips")
          .insert(candidate)
          .select("id")
          .single();
        if (insClipErr) {
          log("video_clips insert fail", { jobId, clip_index: i + 1, error_message: insClipErr.message });
          console.error("[clipper-worker][EXPORT ERROR]", insClipErr);
          throw new Error(insClipErr.message);
        }
        log("video_clips insert success", { jobId, clip_index: i + 1, clip_id: insClip.id, mode: "insert" });
        resolvedClipIds.push(insClip.id);
        log("clip row inserted", {
          clip_id: insClip.id,
          label: candidate.label,
          start_time_sec: candidate.start_time_sec,
          end_time_sec: candidate.end_time_sec,
          video_url: candidate.video_url,
        });
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
        if (expUpErr) {
          console.error("[clipper-worker][EXPORT ERROR]", expUpErr);
          throw new Error(expUpErr.message);
        }
        log("clip export row updated", { clip_id: clipId, export_id: prev.id, storage_path: payload.storage_path });
      } else {
        const { error: expInsErr } = await sb.from("clip_exports").insert(payload);
        if (expInsErr) {
          console.error("[clipper-worker][EXPORT ERROR]", expInsErr);
          throw new Error(expInsErr.message);
        }
        log("clip export row inserted", { clip_id: clipId, storage_path: payload.storage_path });
      }
    }

    const requiredClipCount = 3;
    const hasThreeRows = resolvedClipIds.length === requiredClipCount;
    const hasThreeUploads = uploadMeta.length === requiredClipCount;
    const hasOnlyRealUrls = clipInserts.every((c) => isRealSupabaseClipUrl(c.video_url, supabaseUrl, CLIP_EXPORT_BUCKET));
    if (!hasThreeRows || !hasThreeUploads || !hasOnlyRealUrls) {
      throw new Error(
        `Refusing completion without 3 real clip URLs (rows=${resolvedClipIds.length}, uploads=${uploadMeta.length}, realUrls=${hasOnlyRealUrls})`,
      );
    }

    const { data: completedRow, error: completeErr } = await sb
      .from("video_jobs")
      .update({
        status: "completed",
        error_message: null,
        updated_at: new Date().toISOString(),
        metadata: {
          ...jobMetadata,
          worker: {
            ...(jobMetadata.worker || {}),
            stage: "completed",
            stage_updated_at: new Date().toISOString(),
            pipeline: sourceKind === "upload" ? "upload+ffmpeg" : "yt-dlp-stream-url+ffmpeg",
            segments,
            source_duration_sec: Number.isFinite(durationSec) && durationSec > 0 ? durationSec : null,
            duration_probe_failed: !(Number.isFinite(durationSec) && durationSec > 0),
          },
        },
      })
      .eq("id", jobId)
      .eq("status", "processing")
      .select("id,status")
      .maybeSingle();
    if (completeErr) {
      throw new Error(completeErr.message || "Failed to mark job completed");
    }
    if (!completedRow) {
      throw new Error("Job completion update skipped because job was not in processing state");
    }

    log("job completed", { id: jobId, status: "completed", clip_count: resolvedClipIds.length });
    log("processing completed", jobId);
  } catch (err) {
    const msg = formatExecError(err);
    await sb
      .from("video_jobs")
      .update({
        status: "failed",
        error: msg,
        error_message: msg,
        updated_at: new Date().toISOString(),
        metadata: {
          ...jobMetadata,
          worker: {
            ...(jobMetadata.worker || {}),
            stage: "failed",
            stage_updated_at: new Date().toISOString(),
            failure_reason: msg,
          },
        },
      })
      .eq("id", jobId)
      .eq("status", "processing");
    log("job failed", { id: jobId, error_message: msg });
    throw err;
  } finally {
    try {
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
}
