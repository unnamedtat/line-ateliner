import { expect, test } from "@playwright/test";

test("loads the studio shell and canvas workspace", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle(/Line Atelier/);
  await expect(page.locator("#ui-shell")).toBeVisible();
  await expect(page.locator("[data-mode-summary]").first()).toContainText("模式");
  await expect(page.locator("#canvas-mount canvas")).toBeVisible({ timeout: 15000 });

  const sceneScaleSlider = page.locator("#scene-scale");
  await sceneScaleSlider.fill("175");
  await expect(sceneScaleSlider).toHaveValue("175");

  await page.getByRole("button", { name: "重置全部参数" }).click();
  await expect(sceneScaleSlider).toHaveValue("130");
});
