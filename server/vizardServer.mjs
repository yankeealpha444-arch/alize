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
const PORT = Number(process.env.VIZARD_SERVER_PORT || process.env.PORT || 8787);
const CORS = process.env.CORS_ORIGIN || "*";

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
  const clips = buildStructuredClips(durationSec);

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
        clips,
      });
      return;
    }
    const projectId = extractProjectId(data);
    sendJson(res, 200, {
      ok: true,
      projectId,
      clips,
      vizard: data,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    sendJson(res, 502, { ok: false, error: msg, clips });
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
