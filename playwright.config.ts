import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 180000,
  expect: {
    timeout: 15000,
  },
  use: {
    headless: true,
    viewport: { width: 1366, height: 900 },
    ignoreHTTPSErrors: true,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
  ],
});
