import { defineConfig } from "@playwright/test";

/**
 * End-to-end smoke tests: a real browser clicks through the most important journeys.
 *
 * Before running: start the API (https://localhost:7080) and the web app, then
 *   npm run test:e2e                       (uses http://localhost:3000)
 *   E2E_BASE_URL=http://localhost:3005 npm run test:e2e
 *
 * channel "msedge" uses the Edge already installed on Windows, so no browser download is needed.
 * The tests only read data or check validation; they never create or delete records, so they are
 * safe to run against the demo database.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    channel: "msedge",
    // The local API uses the ASP.NET development certificate.
    ignoreHTTPSErrors: true,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  outputDir: "./e2e/.results",
});
