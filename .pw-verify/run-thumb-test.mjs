/**
 * Local browser verification: upload → clips → pick clip → Step 3 thumbnails → dashboard preview → reload.
 * Run with dev server up: node .pw-verify/run-thumb-test.mjs
 * Env: BASE_URL (default http://127.0.0.1:8084)
 */
import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://127.0.0.1:8084";
const YT = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";

const results = {
  step3ImagesVisible: false,
  step3ImgCount: 0,
  step3MaxNaturalWidth: 0,
  dashboardThumbLabelAfterConfirm: "",
  dashboardDeltaAfterConfirm: "",
  afterReloadThumbLabel: "",
  afterReloadFlowThumbId: null,
  errors: [],
};

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  page.on("console", (msg) => {
    if (msg.text().includes("[mvp-thumb-pipeline]")) {
      // eslint-disable-next-line no-console
      console.log("browser:", msg.text());
    }
  });

  try {
    await page.goto(`${BASE}/#/video`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(800);

    const input = page.locator('input[type="url"]').first();
    await input.fill(YT);
    await page.getByRole("button", { name: /continue/i }).click();

    await page.waitForURL(/#\/clips/, { timeout: 120000 });
    await page.waitForSelector("text=Step 2", { timeout: 120000 });
    await page.waitForTimeout(2000);

    const useClip = page.getByRole("button", { name: /use this clip/i }).first();
    await useClip.click({ timeout: 30000 });
    await page.waitForTimeout(1500);

    await page.waitForSelector('[data-mvp-step="3-thumbnail"]', { timeout: 60000 });
    const step3 = page.locator('[data-mvp-step="3-thumbnail"]');
    await page.waitForFunction(
      () => {
        const root = document.querySelector('[data-mvp-step="3-thumbnail"]');
        if (!root) return false;
        const list = root.querySelectorAll("img");
        return list.length >= 3;
      },
      { timeout: 30000 },
    );
    await page.waitForTimeout(1500);
    const imgs = step3.locator("img");
    results.step3ImgCount = await imgs.count();
    for (let i = 0; i < results.step3ImgCount; i++) {
      const nw = await imgs.nth(i).evaluate((el) => (el instanceof HTMLImageElement ? el.naturalWidth : 0));
      results.step3MaxNaturalWidth = Math.max(results.step3MaxNaturalWidth, nw);
    }
    results.step3ImagesVisible = results.step3MaxNaturalWidth > 0;

    const selectBtns = step3.getByRole("button", { name: /^select$/i });
    await selectBtns.first().click();
    await page.waitForTimeout(300);
    await page.getByRole("button", { name: /use this thumbnail/i }).click();
    await page.waitForTimeout(800);

    const dash = page.locator('[data-mvp-widget="dashboard-preview"]');
    const thumbBlock = dash.locator(".grid").locator("> div").nth(3);
    results.dashboardThumbLabelAfterConfirm =
      (await thumbBlock.locator("p.font-display").first().textContent().catch(() => "")) || "";
    results.dashboardDeltaAfterConfirm =
      (await thumbBlock.locator("p.text-\\[11px\\]").first().textContent().catch(() => "")) ||
      (await thumbBlock.locator("p").last().textContent().catch(() => "")) ||
      "";

    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2500);

    await page.waitForSelector('[data-mvp-step="3-thumbnail"]', { timeout: 120000 });
    await page.waitForTimeout(2000);
    const dash2 = page.locator('[data-mvp-widget="dashboard-preview"]');
    const thumbBlock2 = dash2.locator(".grid").locator("> div").nth(3);
    results.afterReloadThumbLabel =
      (await thumbBlock2.locator("p.font-display").first().textContent().catch(() => "")) || "";

    results.afterReloadFlowThumbId = await page.evaluate(() => {
      try {
        const raw = localStorage.getItem("alize_projectId");
        if (!raw) return null;
        const key = `alize_video_mvp_project_${raw}`;
        const j = localStorage.getItem(key);
        if (!j) return null;
        const p = JSON.parse(j);
        return p?.selected_thumbnail?.id ?? null;
      } catch {
        return null;
      }
    });
  } catch (e) {
    results.errors.push(String(e && e.message ? e.message : e));
  } finally {
    await browser.close();
  }

  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ base: BASE, ...results }, null, 2));
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
