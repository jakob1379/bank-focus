import { defineConfig, devices } from '@playwright/test';
import path from 'path';

// Get extension directory (relative to tests/)
const chromeExtensionDir = path.resolve(__dirname, '..', 'chrome');

export default defineConfig({
  testDir: '.',
  testMatch: '*.spec.ts',
  
  // Extensions require headed mode, but tests can run headless for content script tests
  // Override with HEADLESS=true env var for CI
  headless: process.env.HEADLESS === 'true' ? true : false,
  
  // Global timeout for each test
  timeout: 60000,
  
  // Run tests in parallel (4 workers in CI, auto-detect locally)
  workers: process.env.CI ? 4 : undefined,
  
  // Fully parallel mode - tests within a file run in parallel too
  fullyParallel: true,
  
  // Retry configuration
  retries: process.env.CI ? 2 : 0,
  
  // Reporter configuration
  reporter: [
    ['list'],
    ['html', { open: 'never' }]
  ],
  
  // Shared settings for all projects
  use: {
    // Collect traces for debugging
    trace: 'on-first-retry',
    // Take screenshots on failure
    screenshot: 'only-on-failure',
    // Record video on failure
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Launch with extension loaded
        launchOptions: {
          args: [
            `--disable-extensions-except=${chromeExtensionDir}`,
            `--load-extension=${chromeExtensionDir}`,
            '--no-first-run',
            '--disable-features=ChromeWhatsNewUI',
          ],
        },
      },
    },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
      },
    },
  ],
});
