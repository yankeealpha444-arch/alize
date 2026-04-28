#!/usr/bin/env node
import { chromium } from "@playwright/test";

const liveUrl = process.argv[2];
const testVideoUrl = "https://www.youtube.com/watch?v=JSW8otExjgI";

if (!liveUrl) {
  console.error("[live-verify] FAIL: Missing URL argument.");
  console.error("[live-verify] Usage: node scripts/verify-live-clipper.mjs https://alize-one.vercel.app/");
  process.exit(1);
}

const requiredText = ["V26 BUILD ACTIVE", "LIVE FILE: LinkClipperMvp", "Alize Clips"];
const requiredLogs = [
  "[UI] Generate clicked",
  "[backend] createVideoJobFromSourceUrl entered",
  "[backend] calling process-job",
];

const consoleLines = [];
const requestUrls = [];
const missing = [];
let processJobHttpStatus = null;
let processJobResponse = null;
let processJobResponseRaw = null;
let lastSuccessfulStep = "page_loaded";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

page.on("console", (msg) => {
  const line = msg.text();
  consoleLines.push(line);
  console.log(`[browser-console] ${line}`);
});
page.on("request", (req) => {
  const method = req.method();
  const url = req.url();
  requestUrls.push(`${method} ${url}`);
  if (method === "POST" && url.includes("/api/process-job")) {
    console.log(`[browser-network] ${method} ${url}`);
  }
});
page.on("response", async (res) => {
  const req = res.request();
  if (req.method() === "POST" && req.url().includes("/api/process-job")) {
    processJobHttpStatus = res.status();
    const raw = await res.text();
    processJobResponseRaw = raw;
    try {
      processJobResponse = raw ? JSON.parse(raw) : { parse_error: true, raw: "" };
    } catch {
      processJobResponse = { parse_error: true, raw };
    }
    lastSuccessfulStep = "process_job_http_response_received";
  }
});
page.on("dialog", async (dialog) => {
  console.log(`[browser-dialog] ${dialog.message()}`);
  await dialog.accept();
});

try {
  await page.goto(liveUrl, { waitUntil: "networkidle", timeout: 120000 });

  for (const text of requiredText) {
    const locator = page.getByText(text, { exact: false });
    const count = await locator.count();
    if (count < 1) missing.push(`missing_text:${text}`);
  }
  if (missing.length === 0) lastSuccessfulStep = "page_markers_verified";

  const input = page.locator('input[type="url"]').first();
  if ((await input.count()) < 1) {
    missing.push("missing_url_input");
  } else {
    await input.fill(testVideoUrl);
    lastSuccessfulStep = "video_input_filled";
  }

  const generateButton = page.getByRole("button", { name: /Generate Clips/i }).first();
  if ((await generateButton.count()) < 1) {
    missing.push("missing_generate_button");
  } else {
    await generateButton.click({ timeout: 15000 });
    lastSuccessfulStep = "generate_clicked";
  }

  // Give process-job enough time to respond on slower cold starts.
  for (let i = 0; i < 30; i++) {
    if (processJobResponse) break;
    await page.waitForTimeout(1000);
  }

  for (const line of requiredLogs) {
    if (!consoleLines.some((entry) => entry.includes(line))) {
      missing.push(`missing_console_log:${line}`);
    }
  }
  if (!missing.some((m) => m.startsWith("missing_console_log:"))) {
    lastSuccessfulStep = "required_console_logs_seen";
  }

  const hasProcessJobRequest = requestUrls.some((line) => line.startsWith("POST ") && line.includes("/api/process-job"));
  if (!hasProcessJobRequest) {
    missing.push("missing_network_post:/api/process-job");
  } else {
    lastSuccessfulStep = "process_job_post_seen";
  }

  const createdJobLine = consoleLines.find((line) => line.includes("[job-created]"));
  let createdJobId = null;
  if (createdJobLine) {
    const m = createdJobLine.match(/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i);
    createdJobId = m ? m[0] : null;
  }
  if (!createdJobId) {
    missing.push("missing_job_created_id");
  } else {
    lastSuccessfulStep = "job_created";
  }

  if (!processJobResponse) {
    missing.push("missing_process_job_response");
  } else {
    if (typeof processJobResponse !== "object") {
      missing.push("invalid_process_job_response_shape");
    } else {
      const finalStatus = processJobResponse?.status;
      const jobId = processJobResponse?.job_id;
      const errorMessage = processJobResponse?.error_message;
      if (processJobHttpStatus !== 200) {
        missing.push(`process_job_http_status_${processJobHttpStatus}`);
      }
      if (!["processing", "completed"].includes(finalStatus)) {
        missing.push(`invalid_final_status:${String(finalStatus)}`);
      }
      if (!jobId || (createdJobId && jobId !== createdJobId)) {
        missing.push(`job_id_mismatch:created=${createdJobId || "unknown"} response=${jobId || "missing"}`);
      }
      if (["completed", "processing"].includes(finalStatus)) {
        lastSuccessfulStep = `terminal_status_seen:${finalStatus}`;
      }
    }
  }

  if (missing.length > 0) {
    console.error(`[live-verify] LAST_SUCCESSFUL_STEP: ${lastSuccessfulStep}`);
    if (processJobHttpStatus !== null) {
      console.error(`[live-verify] process-job HTTP status: ${processJobHttpStatus}`);
    }
    if (processJobResponseRaw !== null) {
      console.error(`[live-verify] process-job raw response: ${processJobResponseRaw}`);
    }
    console.error(`[live-verify] FAIL: ${missing.join(", ")}`);
    process.exit(1);
  }

  console.log("[live-verify] PASS");
  process.exit(0);
} catch (err) {
  const msg = err instanceof Error ? err.message : String(err);
  console.error(`[live-verify] FAIL: ${msg}`);
  process.exit(1);
} finally {
  await browser.close();
}
