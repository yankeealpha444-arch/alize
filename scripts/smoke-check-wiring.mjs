#!/usr/bin/env node
import { chromium } from "@playwright/test";
import path from "node:path";
import { existsSync } from "node:fs";

const liveUrl = process.argv[2];
const uploadFileArg = process.argv[3] || "";

if (!liveUrl) {
  console.error("[smoke-wiring] FAIL: Missing URL argument.");
  console.error("[smoke-wiring] Usage: node scripts/smoke-check-wiring.mjs https://alize-one.vercel.app/clips [optional-local-mp4-path]");
  process.exit(1);
}

const uploadFilePath = uploadFileArg ? path.resolve(uploadFileArg) : "";
if (uploadFilePath && !existsSync(uploadFilePath)) {
  console.error(`[smoke-wiring] FAIL: Upload file not found: ${uploadFilePath}`);
  process.exit(1);
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const failures = [];

try {
  await page.goto(liveUrl, { waitUntil: "networkidle", timeout: 120000 });

  const markerCount = await page.getByText("PROGRESS_FIX_NO_95_ACTIVE", { exact: false }).count();
  if (markerCount < 1) failures.push("missing_active_marker:PROGRESS_FIX_NO_95_ACTIVE");

  const urlInputCount = await page.locator('input[type="url"]').count();
  if (urlInputCount !== 0) failures.push("unexpected_url_input_present");

  const uploadOnlyTextCount = await page.getByText("Upload an MP4 and get 3 suggested Shorts clips.", { exact: false }).count();
  if (uploadOnlyTextCount < 1) failures.push("missing_upload_only_text");

  const apiCheck = await page.evaluate(async (origin) => {
    try {
      const res = await fetch(`${origin}/api/process-job`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: "00000000-0000-0000-0000-000000000000" }),
      });
      const raw = await res.text();
      let parsed = null;
      try {
        parsed = raw ? JSON.parse(raw) : null;
      } catch {
        parsed = null;
      }
      return {
        status: res.status,
        isObject: Boolean(parsed && typeof parsed === "object"),
        hasShape:
          Boolean(parsed && typeof parsed === "object") &&
          ("ok" in parsed) &&
          (("status" in parsed) || ("error" in parsed)),
        raw,
      };
    } catch (err) {
      return {
        status: -1,
        isObject: false,
        hasShape: false,
        raw: err instanceof Error ? err.message : String(err),
      };
    }
  }, new URL(liveUrl).origin);

  if (!apiCheck.isObject || !apiCheck.hasShape) {
    failures.push(`invalid_api_process_job_shape:http_${apiCheck.status}:${apiCheck.raw.slice(0, 180)}`);
  }

  if (uploadFilePath) {
    await page.setInputFiles('input[type="file"]', uploadFilePath);
    await page.getByRole("button", { name: /Upload and Generate Clips/i }).click({ timeout: 15000 });

    await page.waitForFunction(
      () => {
        const body = document.body?.innerText || "";
        return body.includes("Clip 1") && body.includes("Clip 2") && body.includes("Clip 3");
      },
      { timeout: 240000 },
    );
  } else {
    console.log("[smoke-wiring] INFO: Skipping 3-clip render check (no local MP4 path provided).");
  }

  if (failures.length > 0) {
    console.error(`[smoke-wiring] FAIL: ${failures.join(", ")}`);
    process.exit(1);
  }

  console.log("[smoke-wiring] PASS");
  process.exit(0);
} catch (err) {
  const msg = err instanceof Error ? err.message : String(err);
  console.error(`[smoke-wiring] FAIL: ${msg}`);
  process.exit(1);
} finally {
  await browser.close();
}
