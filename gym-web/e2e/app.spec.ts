import { expect, test } from "@playwright/test";
import { DEMO, logIn } from "./helpers";

test.describe("admin", () => {
  test.beforeEach(async ({ page }) => {
    await logIn(page, DEMO.admin);
  });

  test("members list loads real rows from the API", async ({ page }) => {
    await page.goto("/en/dashboard/members");
    await expect(page.getByRole("heading", { name: "Members", level: 1 })).toBeVisible();
    await expect(page.locator("tbody tr").first()).toBeVisible();
  });

  test("add-member wizard blocks an empty form with field errors", async ({ page }) => {
    await page.goto("/en/dashboard/members/new");
    await expect(page.getByRole("heading", { name: "Add a member" })).toBeVisible();
    await page.getByRole("button", { name: "Continue" }).click();
    // Nothing is sent to the API: the required fields are flagged instead.
    await expect(page.locator('[aria-invalid="true"]').first()).toBeVisible();
    await expect(page).toHaveURL(/\/members\/new$/);
  });
});

test.describe("member", () => {
  test("can open the class booking page", async ({ page }) => {
    await logIn(page, DEMO.member);
    await page.goto("/en/me/classes");
    await expect(page).toHaveTitle(/Book a class/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
});
