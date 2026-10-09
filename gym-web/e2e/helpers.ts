import { expect, type Page } from "@playwright/test";

/** The demo accounts created by the database seeder (see README). */
export const DEMO = {
  admin: "admin@demo.gym",
  member: "member@demo.gym",
  trainer: "trainer@demo.gym",
  password: "Demo@Gym2026",
} as const;

/** Logs in through the real login form, in English, and waits until the app has moved on. */
export async function logIn(page: Page, email: string, password: string = DEMO.password) {
  await page.goto("/en/login");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  // Leaving /login means the API accepted the credentials and the session was stored.
  await expect(page).not.toHaveURL(/\/login/);
}
