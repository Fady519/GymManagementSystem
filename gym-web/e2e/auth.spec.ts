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

  // Regression: switching language keeps two copies of the layout alive. They used to have two
  // separate stores, so after logging in the first requests went out without a token (401) and the
  // member area said "your session has expired". Now the whole tab shares one store.
  test("logging in after switching language loads the member area", async ({ page }) => {
    // Only visible elements: the hidden copy of the layout is still in the page.
    const header = page.locator("header").filter({ visible: true });
    await page.goto("/ar");
    await header.getByRole("button", { name: /English/ }).click();
    await expect(page).not.toHaveURL(/\/ar/);
    await header.getByRole("button", { name: /Arabic|العربية/ }).click();
    await expect(page).toHaveURL(/\/ar$/);

    // Client-side navigation to the login page (no full reload), like a real visitor.
    await header.getByRole("link", { name: "تسجيل الدخول", exact: true }).click();
    await page.locator("#email").fill(DEMO.member);
    await page.locator("#password").fill(DEMO.password);
    const memberships = page.waitForResponse((r) => r.url().includes("/api/me/memberships"));
    await page.getByRole("button", { name: "تسجيل الدخول", exact: true }).click();

    await expect(page).toHaveURL(/\/me$/);
    expect((await memberships).status()).toBe(200);
  });
});
