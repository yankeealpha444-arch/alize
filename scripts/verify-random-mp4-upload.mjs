#!/usr/bin/env node
/**
 * Live probe: random public MP4 + mobile-ish viewport, upload flow on /clips.
 * Usage: node scripts/verify-random-mp4-upload.mjs https://alize-one.vercel.app/clips
 */
import { chromium, devices } from "@playwright/test";
import crypto from "crypto";
import fs from "fs";
import https from "https";
import os from "os";
import path from "path";

const liveUrl = process.argv[2];

const SAMPLE_MP4_URLS = [
  "https://filesamples.com/samples/video/mp4/sample_640x360.mp4",
  "https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4",
  "https://file-examples.com/storage/fe68c0b2b5b7a4c4b3c4b5b/2017/04/file_example_MP4_480_1_5MG.mp4",
];

function pickRandom(arr) {
  return arr[crypto.randomInt(0, arr.length)];
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https
      .get(url, (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`download_http_${res.statusCode}`));
          return;
        }
        res.pipe(file);
        file.on("finish", () => file.close(resolve));
      })
      .on("error", reject);
  });
}

if (!liveUrl) {
  console.error("[random-upload] FAIL: pass base URL, e.g. https://alize-one.vercel.app/clips");
  process.exit(1);
}

const urlParam = `${liveUrl}${liveUrl.includes("?") ? "&" : "?"}cb=${Date.now()}`;

const shuffled = [...SAMPLE_MP4_URLS].sort(() => crypto.randomInt(0, 3) - 1);
let lastErr = null;
let usedUrl = null;
const tmp = path.join(os.tmpdir(), `alize-random-${Date.now()}.mp4`);

const phone = devices["iPhone 12"] || devices["iPhone 13"] || null;

for (const src of shuffled) {
  usedUrl = src;
  try {
    await downloadFile(src, tmp);
    const st = fs.statSync(tmp);
    if (st.size < 10_000) {
      lastErr = new Error("file_too_small");
      continue;
    }
    lastErr = null;
    break;
  } catch (e) {
    lastErr = e;
  }
}

if (lastErr) {
  console.error(`[random-upload] FAIL: could not download any sample MP4. last=${String(lastErr)}`);
  process.exit(1);
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext(
  phone
    ? {
        ...phone,
        locale: "en-AU",
      }
    : {},
);
const page = await context.newPage();

let processJob = null;
page.on("response", async (res) => {
  if (res.url().includes("/api/process-job") && res.request().method() === "POST") {
    const txt = await res.text();
    try {
      processJob = JSON.parse(txt);
    } catch {
      processJob = { raw: txt };
    }
  }
});

await page.goto(urlParam, { waitUntil: "networkidle", timeout: 120000 });

const bodyAfterLoad = await page.locator("body").innerText();
if (!bodyAfterLoad.includes("CLIPPER_REALWORLD_DIAG_v1")) {
  console.log(`[random-upload] WARN: version marker not found (cache or old deploy). url=${urlParam}`);
}

await page.locator('input[type="file"]').setInputFiles(tmp);
await page.getByRole("button", { name: "Upload and Generate Clips" }).click();

await page.waitForTimeout(45000);

const body = await page.locator("body").innerText();
const videos = await page.locator("video").count();
const hasDiag = body.includes("Upload diagnostics");
const hasPreview = body.includes("Preview Mode (clipping failed)");
const hasFail = body.includes("Failed to generate clips");

console.log(`[random-upload] sample_source=${usedUrl}`);
console.log(`[random-upload] process-job=${JSON.stringify(processJob)}`);
console.log(`[random-upload] VIDEO_COUNT=${videos}`);
console.log(`[random-upload] HAS_DIAG=${hasDiag}`);
console.log(`[random-upload] HAS_PREVIEW_FALLBACK=${hasPreview}`);
console.log(`[random-upload] HAS_FAILED_PANEL=${hasFail}`);
console.log(`[random-upload] HAS_MARKER=${body.includes("CLIPPER_REALWORLD_DIAG_v1")}`);

fs.unlink(tmp, () => {});
await browser.close();

const ok = processJob && (processJob.status === "completed" || processJob.status === "failed");
if (ok && (videos >= 3 || hasPreview)) {
  console.log("[random-upload] PASS (terminal + visible playback or preview fallback)");
  process.exit(0);
}

console.error("[random-upload] FAIL: missing terminal response or no playable/preview outcome");
process.exit(1);
