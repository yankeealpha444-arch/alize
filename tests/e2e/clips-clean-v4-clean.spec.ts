import { expect, test } from "@playwright/test";

const ROUTE_URL = "https://alize-one.vercel.app/clips-clean-v4-clean";
const SUBMIT_URL = "https://www.youtube.com/watch?v=66nTQotO_dU";

test("clips-clean-v4-clean: terminal state visibility", async ({ page }) => {
  await page.goto(ROUTE_URL, { waitUntil: "domcontentloaded" });

  // 1) Page opens
  await expect(page).toHaveURL(/\/clips-clean-v4-clean$/);

  // 2) No flowers appear
  const bodyTextAtLoad = (await page.locator("body").innerText()).toLowerCase();
  expect(bodyTextAtLoad).not.toContain("flower");
  expect(bodyTextAtLoad).not.toContain("interactive-examples.mdn.mozilla.net");

  // 3) No fake clip cards appear before submit
  const videosBeforeSubmit = page.locator("video");
  await expect(videosBeforeSubmit).toHaveCount(0);

  // 4) User pastes URL
  const input = page.locator('input[type="url"], input[placeholder*="video" i]').first();
  await expect(input).toBeVisible();
  await input.fill(SUBMIT_URL);

  // 5) Click Generate Clips
  const generateButton = page.getByRole("button", { name: /generate clips/i }).first();
  await expect(generateButton).toBeVisible();
  await generateButton.click();

  // 6) Active job appears
  const activeJobText = page.locator("text=/Active job:\\s*[a-f0-9-]{8,}/i").first();
  await expect(activeJobText).toBeVisible({ timeout: 30000 });

  // 7) Final state must become either:
  //    A) 3 playable clip cards with video URLs
  //    B) exact backend error message (non-generic)
  //    C) explicit long-processing visibility message with active job + stage
  const deadlineMs = Date.now() + 170000;
  let gotPlayableThree = false;
  let gotExactError = false;
  let gotExplicitLongProcessing = false;

  while (Date.now() < deadlineMs) {
    const bodyText = await page.locator("body").innerText();
    const bodyTextLower = bodyText.toLowerCase();

    // 8) Immediate fail conditions
    expect(bodyTextLower).not.toContain("flower");
    expect(bodyTextLower).not.toContain("interactive-examples.mdn.mozilla.net");
    expect(bodyTextLower).not.toContain("clip still processing");
    expect(bodyTextLower).not.toContain("placeholder");

    // Generic-only errors are not allowed
    expect(bodyText).not.toContain("Something went wrong. Try again.");
    expect(bodyText).not.toContain("That video could not be processed.");
    expect(bodyText).not.toContain("Job timed out while processing this video.");

    const videos = page.locator("video");
    const videoCount = await videos.count();
    if (videoCount >= 3) {
      let playableCount = 0;
      for (let i = 0; i < videoCount; i += 1) {
        const src = (await videos.nth(i).getAttribute("src")) || "";
        if (src.trim().length > 0 && /^https?:\/\//i.test(src.trim())) {
          playableCount += 1;
        }
      }
      if (playableCount >= 3) {
        gotPlayableThree = true;
        break;
      }
      throw new Error("Detected video cards without real video_url src values.");
    }

    // Backend exact error should include a concrete reason and not be generic.
    const failureLine =
      bodyText
        .split(/\r?\n/)
        .map((line) => line.trim())
        .find((line) => /^Failed:\s+/i.test(line) || /^Error:\s+/i.test(line)) || "";

    if (failureLine) {
      const genericErrorPatterns = [
        /^Failed:\s*Something went wrong\.?$/i,
        /^Failed:\s*Unknown error\.?$/i,
        /^Failed:\s*That video could not be processed\.?$/i,
        /^Error:\s*Something went wrong\.?$/i,
      ];
      const isGeneric = genericErrorPatterns.some((pattern) => pattern.test(failureLine));
      expect(isGeneric, `Expected exact backend error, got generic: ${failureLine}`).toBeFalsy();
      gotExactError = true;
      break;
    }

    const longProcessingVisible = bodyText.includes("Still processing: yt-dlp may take longer than 3 minutes");
    const hasActiveJob = /Active job:\s*[a-f0-9-]{8,}/i.test(bodyText);
    const hasStage = /Stage:\s*(?!-)[^\n]+/i.test(bodyText);
    if (longProcessingVisible && hasActiveJob && hasStage) {
      gotExplicitLongProcessing = true;
      break;
    }

    await page.waitForTimeout(2000);
  }

  expect(
    gotPlayableThree || gotExactError || gotExplicitLongProcessing,
    "Expected final state: 3 playable clips OR exact backend error OR explicit long-processing state",
  ).toBeTruthy();
});
