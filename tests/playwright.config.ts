import { defineConfig, devices } from '@playwright/test';
import path from 'path';

export default defineConfig({
  testDir: '.',
  testMatch: '*.spec.ts',
  
  // Headed mode as requested
  headless: false,
  
  // Global timeout for each test
  timeout: 60000,
  
  // Retry configuration
  retries: process.env.CI ? 2 : 0,
  
  // Reporter configuration
  reporter: [
    ['list'],
    ['html', { open: 'never' }]
  ],
  
  // Shared settings for all projects
  use: {
    // Slow down actions for visibility (helps in headed mode)
    launchOptions: {
      slowMo: 100,
    },
    // Collect traces for debugging
    trace: 'on-first-retry',
    // Take screenshots on failure
    screenshot: 'only-on-failure',
    // Record video on failure
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chrome',
      use: {
        ...devices['Desktop Chrome'],
        // Chrome extension loading configuration
        channel: 'chrome',
        launchOptions: {
          args: [
            `--disable-extensions-except=${path.join(process.cwd(), '..', 'chrome')}`,
            `--load-extension=${path.join(process.cwd(), '..', 'chrome')}`,
            '--no-first-run',
            '--disable-features=ChromeWhatsNewUI',
          ],
          slowMo: 100,
        },
      },
    },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        // Firefox extension loading
        launchOptions: {
          firefoxUserPrefs: {
            'extensions.enabledScopes': 5,
            'extensions.autoDisableScopes': 0,
            'extensions.install.requireBuiltInCerts': false,
            'extensions.install.requireSecureOrigin': false,
            'xpinstall.signatures.required': false,
            'xpinstall.whitelist.required': false,
          },
          args: [
            '-wait-for-browser',
          ],
          slowMo: 100,
        },
      },
    },
  ],
});
