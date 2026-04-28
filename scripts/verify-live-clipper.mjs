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

  const input = page.locator('input[type="url"]').first();
  if ((await input.count()) < 1) {
    missing.push("missing_url_input");
  } else {
    await input.fill(testVideoUrl);
  }

  const generateButton = page.getByRole("button", { name: /Generate Clips/i }).first();
  if ((await generateButton.count()) < 1) {
    missing.push("missing_generate_button");
  } else {
    await generateButton.click({ timeout: 15000 });
  }

  await page.waitForTimeout(8000);

  for (const line of requiredLogs) {
    if (!consoleLines.some((entry) => entry.includes(line))) {
      missing.push(`missing_console_log:${line}`);
    }
  }

  const hasProcessJobRequest = requestUrls.some((line) => line.startsWith("POST ") && line.includes("/api/process-job"));
  if (!hasProcessJobRequest) {
    missing.push("missing_network_post:/api/process-job");
  }

  if (missing.length > 0) {
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
