#!/usr/bin/env node
import { spawn } from "node:child_process";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const hubDir = path.join(repoRoot, "vision-clip-hub");
const appPath = path.join(hubDir, "src", "App.tsx");
const distIndexPath = path.join(hubDir, "dist", "index.html");

function logStep(message) {
  console.log(`\n[stable-check] ${message}`);
}

function run(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: "inherit",
      shell: process.platform === "win32",
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) return resolve();
      reject(new Error(`${command} ${args.join(" ")} failed with exit code ${code}`));
    });
  });
}

function assertRoute(appSource, routePath) {
  const expected = `<Route path="${routePath}" element={<LinkClipperMvp />} />`;
  if (!appSource.includes(expected)) {
    throw new Error(`Missing route mapping for "${routePath}" -> LinkClipperMvp`);
  }
}

async function main() {
  try {
    logStep("Installing dependencies in vision-clip-hub");
    await run("npm", ["install"], hubDir);

    logStep("Building vision-clip-hub");
    await run("npm", ["run", "build"], hubDir);

    logStep("Verifying dist/index.html exists");
    await access(distIndexPath);

    logStep("Verifying stable route mappings in vision-clip-hub/src/App.tsx");
    const appSource = await readFile(appPath, "utf8");
    assertRoute(appSource, "/");
    assertRoute(appSource, "/clips");
    assertRoute(appSource, "/link-clipper");

    console.log("\n[stable-check] PASS: Stable Video MVP deploy checks passed.");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`\n[stable-check] FAIL: ${message}`);
    process.exit(1);
  }
}

await main();
