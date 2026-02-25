import { test as base, chromium, type BrowserContext, type Page } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import os from 'os';

// Extension directories
const CHROME_EXT_DIR = path.resolve(__dirname, '..', 'chrome');
const SRC_DIR = path.resolve(__dirname, '..', 'src');

// Type declaration for window.__messageListener
declare global {
  interface Window {
    __messageListener?: (message: { action: string }) => void;
  }
}

// Extension IDs (these will be set during fixture setup)
export type TestFixtures = {
  context: BrowserContext;
  extensionId: string;
  extensionPage: Page;
  openPopup: () => Promise<Page>;
  loadLocalPage: () => Promise<Page>;
};

export const test = base.extend<TestFixtures>({
  // Override context fixture to load extension
  context: async ({ browserName }, use) => {
    if (browserName !== 'chromium') {
      // For non-chromium browsers, use default context
      const browser = await chromium.launch({ headless: false });
      const context = await browser.newContext({
        viewport: { width: 1280, height: 720 },
      });
      await use(context);
      await context.close();
      await browser.close();
      return;
    }
    
    // For Chromium with extensions, we must use persistent context
    // Create a temp directory for user data
    const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'playwright-ext-test-'));
    
    try {
      const context = await chromium.launchPersistentContext(userDataDir, {
        headless: false,  // Extensions require headed mode
        args: [
          `--disable-extensions-except=${CHROME_EXT_DIR}`,
          `--load-extension=${CHROME_EXT_DIR}`,
          '--no-first-run',
          '--disable-features=ChromeWhatsNewUI',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
        ],
        viewport: { width: 1280, height: 720 },
      });
      
      await use(context);
      await context.close();
    } finally {
      // Cleanup temp directory
      try {
        fs.rmSync(userDataDir, { recursive: true, force: true });
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  },

  // Extension ID fixture
  extensionId: async ({ context, browserName }, use) => {
    if (browserName !== 'chromium') {
      await use('');
      return;
    }
    
    let extensionId = '';
    
    try {
      // Wait for service worker with timeout
      const background = await Promise.race([
        context.waitForEvent('serviceworker', { timeout: 10000 }),
        new Promise<undefined>((_, reject) => 
          setTimeout(() => reject(new Error('Service worker timeout')), 10000)
        ),
      ]).catch(() => undefined);
      
      if (background) {
        const url = background.url();
        const match = url.match(/chrome-extension:\/\/([^\/]+)/);
        if (match) {
          extensionId = match[1];
        }
      }
    } catch (e) {
      console.log('Could not get extension ID:', e);
    }
    
    await use(extensionId);
  },

  // Extension page fixture - a page where we can interact with the extension
  extensionPage: async ({ context }, use) => {
    const page = context.pages()[0] || await context.newPage();
    await use(page);
  },

  // Helper to open the extension popup
  openPopup: async ({ context, extensionId, browserName }, use) => {
    const openPopup = async (): Promise<Page> => {
      const page = context.pages()[0] || await context.newPage();
      
      if (browserName === 'chromium' && extensionId) {
        // Navigate to the popup HTML directly in Chrome
        await page.goto(`chrome-extension://${extensionId}/popup.html`);
      } else {
        // For non-chromium, open popup from file system (limited functionality)
        const popupPath = path.join(CHROME_EXT_DIR, 'popup.html');
        await page.goto(`file://${popupPath}`);
      }
      
      // Wait for the popup to be ready (check for visible toggle-slider, not hidden input)
      await page.waitForSelector('.toggle-slider', { timeout: 5000 });
      return page;
    };
    
    await use(openPopup);
  },

  // Helper to load the local HTML dump
  loadLocalPage: async ({ context }, use) => {
    const loadLocalPage = async (): Promise<Page> => {
      const page = context.pages()[0] || await context.newPage();
      const htmlPath = path.join(__dirname, 'fixtures', 'Nykredit Privat.html');
      await page.goto(`file://${htmlPath}`);
      
      // Wait for the page to have the expected elements (check existence, not visibility)
      await page.waitForSelector('.PostingTable-tr', { state: 'attached', timeout: 10000 });
      
      // Inject the content script manually for testing
      const contentScriptPath = path.join(SRC_DIR, 'content.js');
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
