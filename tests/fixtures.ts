import { test as base, chromium, firefox, type BrowserContext, type Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';

// Extension IDs (these will be set during fixture setup)
export type TestFixtures = {
  context: BrowserContext;
  extensionId: string;
  extensionPage: Page;
  openPopup: () => Promise<Page>;
  loadLocalPage: () => Promise<Page>;
};

// Helper to copy extension source files for testing
function ensureExtensionFiles(browser: 'chrome' | 'firefox') {
  const extDir = path.join(process.cwd(), '..', browser);
  const srcDir = path.join(process.cwd(), '..', 'src');
  
  // Copy source files to extension directory if they don't exist
  const files = ['content.js', 'popup.js', 'popup.html'];
  for (const file of files) {
    const srcFile = path.join(srcDir, file);
    const destFile = path.join(extDir, file);
    if (fs.existsSync(srcFile) && !fs.existsSync(destFile)) {
      fs.copyFileSync(srcFile, destFile);
    }
  }
}

export const test = base.extend<TestFixtures>({
  // Override context fixture to load extension
  context: async ({ browserName }, use) => {
    const extDir = path.join(process.cwd(), '..', browserName === 'chromium' ? 'chrome' : 'firefox');
    
    // Ensure extension files are present
    ensureExtensionFiles(browserName === 'chromium' ? 'chrome' : 'firefox');
    
    let context: BrowserContext;
    
    if (browserName === 'chromium') {
      // Chrome/Chromium with extension
      context = await chromium.launchPersistentContext('', {
        headless: false,
        args: [
          `--disable-extensions-except=${extDir}`,
          `--load-extension=${extDir}`,
          '--no-first-run',
          '--disable-features=ChromeWhatsNewUI',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
        ],
        viewport: { width: 1280, height: 720 },
      });
    } else {
      // Firefox with extension
      context = await firefox.launchPersistentContext('', {
        headless: false,
        firefoxUserPrefs: {
          'extensions.enabledScopes': 5,
          'extensions.autoDisableScopes': 0,
          'extensions.install.requireBuiltInCerts': false,
          'extensions.install.requireSecureOrigin': false,
          'xpinstall.signatures.required': false,
          'xpinstall.whitelist.required': false,
          'devtools.chrome.enabled': true,
        },
        viewport: { width: 1280, height: 720 },
      });
      
      // For Firefox, we need to install the extension manually
      try {
        const xpiPath = path.join(process.cwd(), '..', 'firefox.xpi');
        // Create xpi if it doesn't exist
        if (!fs.existsSync(xpiPath)) {
          const { execSync } = require('child_process');
          execSync('cd .. && bash pack.sh', { stdio: 'ignore' });
        }
        
        // Note: Firefox extension installation in Playwright is limited
        // The extension files are in the firefox/ directory and will be
        // available but may need manual installation during tests
      } catch (e) {
        console.log('Note: Firefox extension auto-install not available in Playwright');
      }
    }
    
    await use(context);
    await context.close();
  },

  // Extension ID fixture
  extensionId: async ({ context, browserName }, use) => {
    let extensionId = '';
    
    if (browserName === 'chromium') {
      // For Chrome, get extension ID from the service worker
      let [background] = context.serviceWorkers();
      if (!background) {
        background = await context.waitForEvent('serviceworker');
      }
      
      // Extract extension ID from URL
      const url = background.url();
      const match = url.match(/chrome-extension:\/\/([^\/]+)/);
      if (match) {
        extensionId = match[1];
      }
    } else {
      // Firefox uses a different system - we'll use the extension name
      // Firefox doesn't expose extension ID easily in Playwright
      extensionId = 'nykredit-hide-checked-rows@extension';
    }
    
    await use(extensionId);
  },

  // Extension page fixture - a page where we can interact with the extension
  extensionPage: async ({ context, browserName }, use) => {
    // Create a new page for testing
    const page = context.pages()[0] || await context.newPage();
    
    if (browserName === 'firefox') {
      // For Firefox, we need to install the extension via about:debugging
      // This is a workaround since Playwright doesn't support extension loading in Firefox
      console.log('Firefox: Extension may need manual installation for full testing');
    }
    
    await use(page);
  },

  // Helper to open the extension popup
  openPopup: async ({ context, extensionId, browserName }, use) => {
    const openPopup = async (): Promise<Page> => {
      const page = context.pages()[0] || await context.newPage();
      
      if (browserName === 'chromium') {
        // Navigate to the popup HTML directly in Chrome
        await page.goto(`chrome-extension://${extensionId}/popup.html`);
      } else {
        // For Firefox, open popup from file system
        const popupPath = path.join(process.cwd(), '..', 'firefox', 'popup.html');
        await page.goto(`file://${popupPath}`);
      }
      
      // Wait for the popup to be ready
      await page.waitForSelector('#toggle', { timeout: 5000 });
      return page;
    };
    
    await use(openPopup);
  },

  // Helper to load the local HTML dump
  loadLocalPage: async ({ context }, use) => {
    const loadLocalPage = async (): Promise<Page> => {
      const page = context.pages()[0] || await context.newPage();
      const htmlPath = path.join(process.cwd(), 'fixtures', 'Nykredit Privat.html');
      await page.goto(`file://${htmlPath}`);
      
      // Wait for the page to have the expected elements
      await page.waitForSelector('.PostingTable-tr', { timeout: 10000 });
      
      // Inject the content script manually for testing
      const contentScriptPath = path.join(process.cwd(), '..', 'src', 'content.js');
      if (fs.existsSync(contentScriptPath)) {
        const contentScript = fs.readFileSync(contentScriptPath, 'utf-8');
        
        // Mock the browser API for content script in file:// context
        const mockBrowserAPI = `
          if (typeof browser === 'undefined' && typeof chrome === 'undefined') {
            window.browser = {
              storage: {
                local: {
                  get: (key) => Promise.resolve({ hideEnabled: false }),
                  set: (obj) => Promise.resolve()
                }
              },
              runtime: {
                onMessage: {
                  addListener: (fn) => {
                    window.__messageListener = fn;
                  }
                },
                sendMessage: () => Promise.resolve()
              },
              tabs: {
                query: () => Promise.resolve([{id: 1}]),
                sendMessage: () => Promise.resolve()
              }
            };
            window.chrome = window.browser;
          }
        `;
        
        await page.addInitScript(mockBrowserAPI + '\n' + contentScript);
      }
      
      return page;
    };
    
    await use(loadLocalPage);
  },
});

export { expect } from '@playwright/test';
