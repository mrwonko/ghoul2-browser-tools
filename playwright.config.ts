import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // 'html' (not just 'github') is required in CI: it's the only reporter
  // that writes playwright-report/ with the actual/expected/diff PNGs for a
  // failed comparison, which ci.yml's `visual` job uploads as an artifact
  // on failure — 'github' alone only produces inline annotations, no report
  // directory for upload-artifact to pick up.
  reporter: process.env.CI ? [['html'], ['github']] : 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    headless: true, // explicit, not just relying on Playwright's default
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'node e2e/serve.mjs',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    {
      name: 'chromium',
      use: {
        // Deliberately NOT `...devices['Desktop Chrome']` — that descriptor
        // (viewport, UA, deviceScaleFactor) is versioned inside Playwright
        // and can shift slightly across @playwright/test upgrades, which
        // would silently invalidate baselines on a routine `npm update`
        // with zero app changes. Pin the bits we actually care about instead.
        viewport: { width: 1280, height: 800 },
        deviceScaleFactor: 1,
        browserName: 'chromium',
      },
    },
  ],
});
