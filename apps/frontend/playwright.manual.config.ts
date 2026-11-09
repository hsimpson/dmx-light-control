import { defineConfig, devices } from '@playwright/test';
import baseConfig from './playwright.config';

/** Writes the user manual's screenshots; kept apart so `nx e2e frontend` never touches docs/. */
export default defineConfig({
  ...baseConfig,
  testDir: './e2e/manual',
  testMatch: '*.screenshots.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 800 },
        deviceScaleFactor: 1,
        // Operators run the console in dark mode; the app follows the system setting.
        colorScheme: 'dark',
      },
    },
  ],
});
