/**
 * Backend proxy for Vizard: browser never calls Vizard directly; only this server uses VIZARDAI_API_KEY.
 *
 * POST /api/vizard — body: { videoUrl | youtubeUrl | uploadRef, durationSec? } → forwards to Vizard
 * create, then returns { ok, projectId?, clips[], vizard } where clips are deterministic hook/middle/closing
 * windows (Vizard create is async and does not return segment timestamps in the create response).
 *
 * Run: node server/vizardServer.mjs
 * Env (repo root .env): VIZARDAI_API_KEY
 * Webhook URL is configured in the Vizard dashboard — do not put it in .env for Vizard.
 *
 * @see https://docs.vizard.ai/docs/quickstart
 */
import http from "http";
import { URL } from "url";
import { loadEnvFromRoot } from "./loadEnvFromRoot.mjs";

loadEnvFromRoot();

const VIZARD_CREATE =
  "https://elb-api.vizard.ai/hvizard-server-front/open-api/v1/project/create";
const VIZARD_QUERY_BASE =
  "https://elb-api.vizard.ai/hvizard-server-front/open-api/v1/project/query";
const PORT = Number(process.env.VIZARD_SERVER_PORT || process.env.PORT || 8787);
const CORS = process.env.CORS_ORIGIN || "*";
const QUERY_POLL_MS = Number(process.env.VIZARD_QUERY_POLL_MS || 5000);
const QUERY_MAX_ATTEMPTS = Number(process.env.VIZARD_QUERY_MAX_ATTEMPTS || 18);

/** Same window logic as `vision-clip-hub/src/lib/youtubeClipSegments.ts` (deterministic MVP clips). */
function clampSeg(s, e, D) {
  const start = Math.max(0, Math.min(s, D));
  let end = Math.max(e, start + 0.5);
  end = Math.min(D, end);
  if (end <= start) end = Math.min(D, start + 0.5);
  return { start, end };
}

function computeYoutubeClipWindows(durationSec) {
  const D = Math.max(1, durationSec);
  return [
    clampSeg(0, Math.min(15, D), D),
    clampSeg(D * 0.3, D * 0.45, D),
    clampSeg(D * 0.6, D * 0.75, D),
  ];
}

const STRUCTURED_LABELS = ["hook", "middle", "closing"];
const STRUCTURED_SCORES = [94, 87, 79];

/** @param {number} durationSec */
function buildStructuredClips(durationSec) {
  const D = Number.isFinite(durationSec) && durationSec > 0 ? durationSec : 120;
  const windows = computeYoutubeClipWindows(D);
  return windows.map((w, i) => ({
    start_time: w.start,
    end_time: w.end,
    score: STRUCTURED_SCORES[i] ?? 80 - i * 5,
    label: STRUCTURED_LABELS[i] ?? "closing",
  }));
}

function extractProjectId(data) {
  if (!data || typeof data !== "object") return null;
  const d = data.data && typeof data.data === "object" ? data.data : null;
  const id = data.projectId ?? data.project_id ?? (d && (d.projectId ?? d.project_id));
  return id != null ? String(id) : null;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toFinite(value) {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function buildTimestampFallback(durationSec) {
  return buildStructuredClips(durationSec).map((c) => ({
    ...c,
    video_url: null,
    download_url: null,
  }));
}

function extractVideos(queryData) {
  if (!queryData || typeof queryData !== "object") return [];
  const data = queryData.data && typeof queryData.data === "object" ? queryData.data : queryData;
  const videos = Array.isArray(data.videos) ? data.videos : [];
  return videos
    .map((v, i) => {
      if (!v || typeof v !== "object") return null;
      const start = toFinite(v.startTime ?? v.start_time ?? v.start);
      const end = toFinite(v.endTime ?? v.end_time ?? v.end);
      const videoUrl = String(v.videoUrl ?? v.video_url ?? v.downloadUrl ?? v.download_url ?? "").trim() || null;
      const score = toFinite(v.score) ?? (94 - i * 7);
      const label = String(v.title ?? v.label ?? `clip-${i + 1}`);
      if (start == null || end == null) return null;
      const s = Math.max(0, start);
      const e = Math.max(s + 0.5, end);
      return {
        start_time: s,
        end_time: e,
        score,
        label,
        video_url: videoUrl,
        download_url: videoUrl,
      };
    })
    .filter(Boolean);
}

function queryDone(queryData) {
  if (!queryData || typeof queryData !== "object") return false;
  const code = toFinite(queryData.code);
  if (code === 1000) return false;
  const status = String(
    queryData.status ??
      queryData.state ??
      queryData.projectStatus ??
      (queryData.data && queryData.data.status) ??
      (queryData.data && queryData.data.state) ??
      "",
  ).toLowerCase();
  if (["processing", "queued", "pending", "running", "in_progress"].includes(status)) return false;
  return true;
}

async function fetchVizardQuery(apiKey, projectId) {
  const r = await fetch(`${VIZARD_QUERY_BASE}/${encodeURIComponent(projectId)}`, {
    method: "GET",
    headers: {
      VIZARDAI_API_KEY: apiKey,
    },
  });
  const text = await r.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }
  if (!r.ok) {
    return {
      ok: false,
      status: r.status,
      data,
    };
  }
  return {
    ok: true,
    status: r.status,
    data,
  };
}

async function pollVizardForVideos(apiKey, projectId) {
  let last = null;
  for (let i = 0; i < QUERY_MAX_ATTEMPTS; i++) {
    const q = await fetchVizardQuery(apiKey, projectId);
    last = q;
    const clips = q.ok ? extractVideos(q.data) : [];
    console.log("[vizard] query poll", {
      projectId,
      attempt: i + 1,
      status: q.status,
      ok: q.ok,
      code: q.ok ? toFinite(q.data?.code) : null,
      videos_count: clips.length,
      first_video_url: clips[0]?.video_url ?? null,
    });
    if (!q.ok) return { ok: false, error: `Vizard query failed (${q.status})`, query: q.data };
    if (clips.length > 0 && clips.some((c) => c.video_url)) {
      return { ok: true, clips, query: q.data };
    }
    if (queryDone(q.data) && clips.length > 0 && !clips.some((c) => c.video_url)) {
      return {
        ok: false,
        error: "Vizard returned timestamps only. Clip export URL not available.",
        clips,
        query: q.data,
      };
    }
    if (queryDone(q.data) && clips.length === 0) {
      return { ok: false, error: "Vizard finished but returned no clip data.", query: q.data };
    }
    await sleep(QUERY_POLL_MS);
  }
  const fallbackClips = extractVideos(last?.data);
  if (fallbackClips.length > 0 && !fallbackClips.some((c) => c.video_url)) {
    return {
      ok: false,
      error: "Vizard returned timestamps only. Clip export URL not available.",
      clips: fallbackClips,
      query: last?.data,
    };
  }
  return { ok: false, error: "Vizard clip query timeout.", query: last?.data };
}

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    readRawBody(req)
      .then((raw) => {
        try {
          resolve(raw ? JSON.parse(raw) : {});
        } catch (e) {
          reject(e);
        }
      })
      .catch(reject);
  });
}

function sendJson(res, status, obj, extraHeaders = {}) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": CORS,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    ...extraHeaders,
  });
  res.end(JSON.stringify(obj));
}

async function handleCreate(req, res) {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": CORS,
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    res.end();
    return;
  }

  if (req.method !== "POST") {
    sendJson(res, 405, { ok: false, error: "Use POST" });
    return;
  }

  const apiKey = process.env.VIZARDAI_API_KEY;
  if (!apiKey) {
    sendJson(res, 500, {
      ok: false,
      error: "Server missing VIZARDAI_API_KEY (set in repo root .env)",
    });
    return;
  }

  let body;
  try {
    body = await parseBody(req);
  } catch {
    sendJson(res, 400, { ok: false, error: "Invalid JSON body" });
    return;
  }

  const videoUrl =
    (typeof body.videoUrl === "string" && body.videoUrl.trim()) ||
    (typeof body.youtubeUrl === "string" && body.youtubeUrl.trim()) ||
    (typeof body.uploadRef === "string" && body.uploadRef.trim());
  if (!videoUrl) {
    sendJson(res, 400, {
      ok: false,
      error: "Expected videoUrl, youtubeUrl, or uploadRef (string)",
    });
    return;
  }

  const durationRaw = body.durationSec ?? body.duration_sec;
  const durationSec =
    typeof durationRaw === "number" && Number.isFinite(durationRaw) && durationRaw > 0
      ? durationRaw
      : 120;
  const timestampFallback = buildTimestampFallback(durationSec);

  const payload = {
    lang: typeof body.lang === "string" ? body.lang : "en",
    preferLength: Array.isArray(body.preferLength) ? body.preferLength : [0],
    videoUrl,
    videoType: 2,
  };

  try {
    const r = await fetch(VIZARD_CREATE, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        VIZARDAI_API_KEY: apiKey,
      },
      body: JSON.stringify(payload),
    });
    const text = await r.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }
    if (!r.ok) {
      sendJson(res, r.status, {
        ok: false,
        vizardStatus: r.status,
        vizard: data,
        clips: timestampFallback,
      });
      return;
    }
    const projectId = extractProjectId(data);
    console.log("[vizard] create project", { projectId });
    if (!projectId) {
      sendJson(res, 502, {
        ok: false,
        error: "Vizard create response missing projectId",
        vizard: data,
        clips: timestampFallback,
      });
      return;
    }
    const queried = await pollVizardForVideos(apiKey, projectId);
    if (!queried.ok) {
      sendJson(res, 424, {
        ok: false,
        error: queried.error,
        projectId,
        clips: queried.clips || timestampFallback,
        vizard: {
          create: data,
          query: queried.query || null,
        },
      });
      return;
    }
    sendJson(res, 200, {
      ok: true,
      projectId,
      clips: queried.clips,
      vizard: {
        create: data,
        query: queried.query || null,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    sendJson(res, 502, { ok: false, error: msg, clips: timestampFallback });
  }
}

async function handleWebhook(req, res) {
  if (req.method !== "POST") {
    res.writeHead(405, { "Content-Type": "application/json", Allow: "POST" });
    res.end(JSON.stringify({ ok: false, error: "Use POST" }));
    return;
  }

  const raw = await readRawBody(req);
  let body;
  try {
    body = raw ? JSON.parse(raw) : {};
  } catch {
    body = raw;
  }

  console.log("[vizard webhook]", new Date().toISOString());
  console.log("req.body:", body);

  res.writeHead(200, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": CORS,
  });
  res.end(JSON.stringify({ ok: true }));
}

const server = http.createServer(async (req, res) => {
  let pathname;
  try {
    pathname = new URL(req.url || "/", `http://${req.headers.host}`).pathname;
  } catch {
    pathname = "/";
  }

  if (pathname === "/api/vizard") {
    await handleCreate(req, res);
    return;
  }
  if (pathname === "/api/webhooks/vizard") {
    if (req.method === "POST") {
      await handleWebhook(req, res);
      return;
    }
    res.writeHead(405, { "Content-Type": "application/json", Allow: "POST" });
    res.end(JSON.stringify({ ok: false, error: "Use POST" }));
    return;
  }
  if (pathname === "/health" && req.method === "GET") {
    sendJson(res, 200, { ok: true, service: "vizard-local-api" });
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ ok: false, error: "Not found" }));
});

server.listen(PORT, () => {
  console.log(`Vizard local API listening on http://localhost:${PORT}`);
  console.log(
    `  POST /api/vizard          (body: { "videoUrl": "https://...", "durationSec": 120 })`,
  );
  console.log(`  POST /api/webhooks/vizard (Vizard dashboard webhook URL)`);
  console.log(`  GET  /health`);
});
