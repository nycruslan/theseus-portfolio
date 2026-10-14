import { defineConfig, devices } from "@playwright/test";

// Set it to test a deployed site (a Vercel preview or production) instead of a local build.
const deployedURL = process.env.PLAYWRIGHT_BASE_URL;
// A port no dev server uses; Playwright starts and stops this server itself. Agents running the
// suite side by side each pick a free one with PLAYWRIGHT_PORT, since a port in use fails the run.
const port = Number(process.env.PLAYWRIGHT_PORT || 3300);
// CI sets PLAYWRIGHT_PREBUILT=1 after `pnpm verify` built this checkout in the same job, so it builds once.
const build = process.env.PLAYWRIGHT_PREBUILT === "1" ? "" : "pnpm build && ";

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  // No retries: a test that passes only on a second try is a bug to fix, not noise to hide.
  retries: 0,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: {
    baseURL: deployedURL ?? `http://localhost:${port}`,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: deployedURL
    ? undefined
    : {
        // A fresh production build, never the dev server or a stale one: test what ships.
        command: `${build}pnpm start --port ${port}`,
        url: `http://localhost:${port}`,
        reuseExistingServer: false,
        timeout: 180_000,
      },
});
