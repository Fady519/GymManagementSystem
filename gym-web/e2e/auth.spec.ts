import { expect, test } from "@playwright/test";
import { DEMO, logIn } from "./helpers";

test.describe("logging in", () => {
  test("wrong password shows a clear error and stays on the form", async ({ page }) => {
    await page.goto("/en/login");
    await page.locator("#email").fill(DEMO.admin);
    await page.locator("#password").fill("Wrong@Pass123");
    await page.getByRole("button", { name: "Log in", exact: true }).click();
    await expect(page.getByText("Email or password is incorrect.")).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test("each role lands in its own area", async ({ browser }) => {
    const cases = [
      { email: DEMO.admin, home: /\/dashboard$/ },
      { email: DEMO.member, home: /\/me$/ },
      { email: DEMO.trainer, home: /\/trainer$/ },
    ];
    for (const { email, home } of cases) {
      // A fresh browser context per account = no cookies left over from the previous login.
      const context = await browser.newContext();
      const page = await context.newPage();
      await logIn(page, email);
      await expect(page).toHaveURL(home);
      await context.close();
    }
  });

  test("private pages send visitors to the login page", async ({ page }) => {
    await page.goto("/en/dashboard/members");
    await expect(page).toHaveURL(/\/login\?next=/);
  });
});
