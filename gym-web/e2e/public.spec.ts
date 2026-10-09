import { expect, test } from "@playwright/test";

test.describe("public website", () => {
  test("home page renders in English", async ({ page }) => {
    await page.goto("/en");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page).toHaveTitle(/Power Fitness/);
  });

  test("home page renders in Arabic, right to left", async ({ page }) => {
    await page.goto("/ar");
    await expect(page.locator("html")).toHaveAttribute("lang", "ar");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("language switcher moves to the Arabic page and remembers it", async ({ page }) => {
    await page.goto("/en");
    await page
      .locator("header")
      .getByRole("button", { name: /العربية/ })
      .click();
    await expect(page).toHaveURL(/\/ar$/);
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");

    // The choice is saved: opening the bare address again stays in Arabic.
    await page.goto("/");
    await expect(page).toHaveURL(/\/ar$/);
  });

  test("unknown address shows the translated 404 page", async ({ page }) => {
    const response = await page.goto("/en/this-page-does-not-exist");
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "We couldn't find that page" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Go to the home page" })).toBeVisible();
  });
});
