import { expect, test } from "@playwright/test";
import path from "node:path";

test("loads the studio shell and canvas workspace", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle(/Line Atelier/);
  await expect(page.locator("#ui-shell")).toBeVisible();
  await expect(page.locator("[data-mode-summary]").first()).not.toHaveText("");
  await expect(page.locator("#canvas-mount canvas")).toBeVisible({ timeout: 15000 });

  const sceneScaleSlider = page.locator("#scene-scale");
  await sceneScaleSlider.fill("175");
  await expect(sceneScaleSlider).toHaveValue("175");

  await page.locator("#reset-settings").click();
  await expect(sceneScaleSlider).toHaveValue("130");
});

test("falls back to the main-thread image pipeline when image worker is disabled", async ({ page }) => {
  const figurePath = path.resolve("public/figure.avif");

  await page.addInitScript(() => {
    window.__forceLegacyImageFallback = true;
  });
  await page.goto("/");

  await expect(page.locator("#canvas-mount canvas")).toBeVisible({ timeout: 15000 });
  await expect.poll(() => page.evaluate(() => canUseLegacyImageWorker())).toBe(false);

  await page.locator("#image-upload").setInputFiles(figurePath);

  await expect.poll(async () => {
    return page.locator("body").getAttribute("data-export-ready");
  }).toBe("true");
  await expect(page.locator("[data-file-summary]").first()).toContainText("figure.avif");
});

test("falls back to the main-thread render pipeline when render worker is disabled", async ({ page }) => {
  await page.addInitScript(() => {
    window.__forceLegacyRenderFallback = true;
  });
  await page.goto("/");

  await expect(page.locator("#canvas-mount canvas")).toBeVisible({ timeout: 15000 });
  await expect.poll(() => page.evaluate(() => canUseLegacyRenderWorker())).toBe(false);

  await page.locator("#render-mode").selectOption("contour");
  await page.locator("#contour-variant").selectOption("wave-contour");
  await expect.poll(async () => {
    return page.locator("body").getAttribute("data-export-ready");
  }).toBe("true");

  await page.evaluate(() => {
    window.__lineAtelierUiBridge?.actions.setActiveControlTab("stroke");
  });
  const waveAmplitudeSlider = page.locator("#wave-amplitude");
  await expect(waveAmplitudeSlider).toBeVisible();
  await waveAmplitudeSlider.fill("18");
  await expect(waveAmplitudeSlider).toHaveValue("18");
  await expect.poll(async () => {
    return page.locator("body").getAttribute("data-export-ready");
  }).toBe("true");
});

test("restores the scene after a long background-style suspension", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator("#canvas-mount canvas")).toBeVisible({ timeout: 15000 });
  await expect.poll(async () => {
    return page.locator("body").getAttribute("data-export-ready");
  }).toBe("true");

  await page.evaluate(() => {
    if (typeof clearSceneAssetImage === "function") {
      clearSceneAssetImage("source");
    } else {
      sourceImage = null;
    }
    if (typeof clearRenderFrameCache === "function") {
      clearRenderFrameCache();
    }
    if (Array.isArray(edgeSamples)) {
      edgeSamples.length = 0;
    }
    if (Array.isArray(strokePaths)) {
      strokePaths.length = 0;
    }
  });

  await page.evaluate(() => {
    return restoreSceneAfterBackgroundPause(true);
  });

  await expect.poll(() => {
    return page.evaluate(() => {
      return {
        hasSource: Boolean(sourceImage && sourceImage.width && sourceImage.height),
        exportReady: document.body.dataset.exportReady,
        drawable: typeof hasDrawableOutput === "function" ? hasDrawableOutput() : false
      };
    });
  }).toEqual({
    hasSource: true,
    exportReady: "true",
    drawable: true
  });
});
