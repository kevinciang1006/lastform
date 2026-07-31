import { defineConfig, devices } from '@playwright/test';

/**
 * Runs against a production build, never `next dev`. ISR, static prerendering
 * and the render badge all behave differently in development, so testing the
 * dev server would prove nothing about what actually ships.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env['CI']),
  retries: process.env['CI'] ? 2 : 0,
  workers: process.env['CI'] ? 1 : undefined,
  reporter: process.env['CI'] ? [['github'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'pnpm build && pnpm start',
    url: 'http://localhost:3000',
    // Never reuse: a stale server from another project on the same port silently
    // serves a different app, and the failure looks like broken assertions rather
    // than a wrong target. Cost is one build per run; the alternative cost is an
    // afternoon.
    reuseExistingServer: false,
    timeout: 240_000,
  },
});
