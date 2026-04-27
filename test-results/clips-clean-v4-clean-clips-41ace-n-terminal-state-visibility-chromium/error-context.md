# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: clips-clean-v4-clean.spec.ts >> clips-clean-v4-clean: terminal state visibility
- Location: tests\e2e\clips-clean-v4-clean.spec.ts:6:1

# Error details

```
Error: Expected final state: 3 playable clips OR exact backend error OR explicit long-processing state

expect(received).toBeTruthy()

Received: false
```

# Page snapshot

```yaml
- generic [ref=e2]:
  - region "Notifications (F8)":
    - list
  - region "Notifications alt+T"
  - main [ref=e4]:
    - generic [ref=e5]: "VERSION: V18 CLEAN CLIPPER REBUILD NO PRELOADED DATA"
    - heading "Alizé Clips" [level=1] [ref=e6]
    - generic [ref=e7]:
      - generic [ref=e8]: Video URL
      - textbox "Paste video URL" [ref=e9]: https://www.youtube.com/watch?v=66nTQotO_dU
      - button "Generate Clips" [active] [ref=e10] [cursor=pointer]
      - paragraph [ref=e11]: "Step timeout after 120000ms: yt-dlp download"
      - paragraph [ref=e12]: "Active job: 39d00a44-542e-4374-ac97-3ecd2e1cf400"
      - paragraph [ref=e13]: "Source: https://www.youtube.com/watch?v=66nTQotO_dU"
      - paragraph [ref=e14]: "Stage: failed"
```

# Test source

```ts
  10  |   await expect(page).toHaveURL(/\/clips-clean-v4-clean$/);
  11  | 
  12  |   // 2) No flowers appear
  13  |   const bodyTextAtLoad = (await page.locator("body").innerText()).toLowerCase();
  14  |   expect(bodyTextAtLoad).not.toContain("flower");
  15  |   expect(bodyTextAtLoad).not.toContain("interactive-examples.mdn.mozilla.net");
  16  | 
  17  |   // 3) No fake clip cards appear before submit
  18  |   const videosBeforeSubmit = page.locator("video");
  19  |   await expect(videosBeforeSubmit).toHaveCount(0);
  20  | 
  21  |   // 4) User pastes URL
  22  |   const input = page.locator('input[type="url"], input[placeholder*="video" i]').first();
  23  |   await expect(input).toBeVisible();
  24  |   await input.fill(SUBMIT_URL);
  25  | 
  26  |   // 5) Click Generate Clips
  27  |   const generateButton = page.getByRole("button", { name: /generate clips/i }).first();
  28  |   await expect(generateButton).toBeVisible();
  29  |   await generateButton.click();
  30  | 
  31  |   // 6) Active job appears
  32  |   const activeJobText = page.locator("text=/Active job:\\s*[a-f0-9-]{8,}/i").first();
  33  |   await expect(activeJobText).toBeVisible({ timeout: 30000 });
  34  | 
  35  |   // 7) Final state must become either:
  36  |   //    A) 3 playable clip cards with video URLs
  37  |   //    B) exact backend error message (non-generic)
  38  |   //    C) explicit long-processing visibility message with active job + stage
  39  |   const deadlineMs = Date.now() + 170000;
  40  |   let gotPlayableThree = false;
  41  |   let gotExactError = false;
  42  |   let gotExplicitLongProcessing = false;
  43  | 
  44  |   while (Date.now() < deadlineMs) {
  45  |     const bodyText = await page.locator("body").innerText();
  46  |     const bodyTextLower = bodyText.toLowerCase();
  47  | 
  48  |     // 8) Immediate fail conditions
  49  |     expect(bodyTextLower).not.toContain("flower");
  50  |     expect(bodyTextLower).not.toContain("interactive-examples.mdn.mozilla.net");
  51  |     expect(bodyTextLower).not.toContain("clip still processing");
  52  |     expect(bodyTextLower).not.toContain("placeholder");
  53  | 
  54  |     // Generic-only errors are not allowed
  55  |     expect(bodyText).not.toContain("Something went wrong. Try again.");
  56  |     expect(bodyText).not.toContain("That video could not be processed.");
  57  |     expect(bodyText).not.toContain("Job timed out while processing this video.");
  58  | 
  59  |     const videos = page.locator("video");
  60  |     const videoCount = await videos.count();
  61  |     if (videoCount >= 3) {
  62  |       let playableCount = 0;
  63  |       for (let i = 0; i < videoCount; i += 1) {
  64  |         const src = (await videos.nth(i).getAttribute("src")) || "";
  65  |         if (src.trim().length > 0 && /^https?:\/\//i.test(src.trim())) {
  66  |           playableCount += 1;
  67  |         }
  68  |       }
  69  |       if (playableCount >= 3) {
  70  |         gotPlayableThree = true;
  71  |         break;
  72  |       }
  73  |       throw new Error("Detected video cards without real video_url src values.");
  74  |     }
  75  | 
  76  |     // Backend exact error should include a concrete reason and not be generic.
  77  |     const failureLine =
  78  |       bodyText
  79  |         .split(/\r?\n/)
  80  |         .map((line) => line.trim())
  81  |         .find((line) => /^Failed:\s+/i.test(line) || /^Error:\s+/i.test(line)) || "";
  82  | 
  83  |     if (failureLine) {
  84  |       const genericErrorPatterns = [
  85  |         /^Failed:\s*Something went wrong\.?$/i,
  86  |         /^Failed:\s*Unknown error\.?$/i,
  87  |         /^Failed:\s*That video could not be processed\.?$/i,
  88  |         /^Error:\s*Something went wrong\.?$/i,
  89  |       ];
  90  |       const isGeneric = genericErrorPatterns.some((pattern) => pattern.test(failureLine));
  91  |       expect(isGeneric, `Expected exact backend error, got generic: ${failureLine}`).toBeFalsy();
  92  |       gotExactError = true;
  93  |       break;
  94  |     }
  95  | 
  96  |     const longProcessingVisible = bodyText.includes("Still processing: yt-dlp may take longer than 3 minutes");
  97  |     const hasActiveJob = /Active job:\s*[a-f0-9-]{8,}/i.test(bodyText);
  98  |     const hasStage = /Stage:\s*(?!-)[^\n]+/i.test(bodyText);
  99  |     if (longProcessingVisible && hasActiveJob && hasStage) {
  100 |       gotExplicitLongProcessing = true;
  101 |       break;
  102 |     }
  103 | 
  104 |     await page.waitForTimeout(2000);
  105 |   }
  106 | 
  107 |   expect(
  108 |     gotPlayableThree || gotExactError || gotExplicitLongProcessing,
  109 |     "Expected final state: 3 playable clips OR exact backend error OR explicit long-processing state",
> 110 |   ).toBeTruthy();
      |     ^ Error: Expected final state: 3 playable clips OR exact backend error OR explicit long-processing state
  111 | });
  112 | 
```