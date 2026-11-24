import { defineConfig } from '@playwright/test';

/** Environment variables, read without depending on Node's types. */
const env =
  (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {};

/**
 * End-to-end smoke tests: the real production build in a real browser, on low graphics so they
 * run on machines without a GPU. `npm run e2e` builds, serves the build and runs them.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 120_000,
  expect: { timeout: 30_000 },
  fullyParallel: false,
  workers: 1,
  retries: env.CI ? 1 : 0,
  reporter: env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:4173/',
    viewport: { width: 1280, height: 800 },
    trace: 'off',
    launchOptions: {
      args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'],
      // Where a browser is preinstalled (as in Claude's cloud sessions), use it.
      ...(env.PW_CHROMIUM ? { executablePath: env.PW_CHROMIUM } : {}),
    },
  },
  webServer: {
    command: 'npx vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173/',
    reuseExistingServer: !env.CI,
  },
});
