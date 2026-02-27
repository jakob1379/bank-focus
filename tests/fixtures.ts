import { test as base, chromium, firefox, type BrowserContext, type Page, type Browser } from '@playwright/test';
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
    __isContentPage?: boolean;
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

// Detect headless mode from env var
const isHeadless = process.env.HEADLESS === 'true';

export const test = base.extend<TestFixtures>({
  // Override context fixture to load extension
  context: async ({ browserName, browser: baseBrowser }, use) => {
    if (browserName === 'firefox') {
      // For Firefox, use the base browser context (extensions not supported via CLI)
      const context = await baseBrowser.newContext({
        viewport: { width: 1280, height: 720 },
      });
      await use(context);
      await context.close();
      return;
    }
    
    if (browserName !== 'chromium') {
      // For other non-chromium browsers, use default context
      const context = await baseBrowser.newContext({
        viewport: { width: 1280, height: 720 },
      });
      await use(context);
      await context.close();
      return;
    }
    
    // For Chromium with extensions, we must use persistent context
    // Create a temp directory for user data
    const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'playwright-ext-test-'));
    
    try {
      const context = await chromium.launchPersistentContext(userDataDir, {
        headless: isHeadless,
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

      const browserMockScript = `
        if (typeof browser === 'undefined' && typeof chrome === 'undefined') {
          const mockStorage = { hideEnabled: false, filterMode: 'all' };
          const normalizeGetResult = (key) => {
            if (Array.isArray(key)) {
              return key.reduce((acc, k) => {
                acc[k] = mockStorage[k];
                return acc;
              }, {});
            }
            if (typeof key === 'string') {
              return { [key]: mockStorage[key] };
            }
            if (key && typeof key === 'object') {
              return Object.keys(key).reduce((acc, k) => {
                acc[k] = mockStorage[k] ?? key[k];
                return acc;
              }, {});
            }
            return { ...mockStorage };
          };

          window.browser = {
            storage: {
              local: {
                get: (key) => Promise.resolve(normalizeGetResult(key)),
                set: (obj) => {
                  Object.assign(mockStorage, obj);
                  return Promise.resolve();
                },
                remove: (key) => {
                  const keys = Array.isArray(key) ? key : [key];
                  keys.forEach((k) => delete mockStorage[k]);
                  return Promise.resolve();
                }
              }
            },
            runtime: {
              onMessage: { addListener: () => {} },
              sendMessage: () => Promise.resolve()
            },
            tabs: {
              query: () => Promise.resolve([{ id: 1 }]),
              sendMessage: () => Promise.resolve()
            },
            action: {
              setIcon: () => Promise.resolve()
            }
          };
          window.chrome = window.browser;
        }
      `;
      
      if (browserName === 'chromium' && extensionId) {
        // Navigate to the popup HTML directly in Chrome
        await page.goto(`chrome-extension://${extensionId}/popup.html`);
      } else {
        // For non-chromium, open popup from file system with mocked extension APIs
        await page.addInitScript(browserMockScript);
        const popupPath = path.join(CHROME_EXT_DIR, 'popup.html');
        await page.goto(`file://${popupPath}`);
      }
      
      await page.waitForSelector('.radio-group', { timeout: 5000 });
      return page;
    };
    
    await use(openPopup);
  },

  // Store reference to content script pages for integration testing
  _contentPages: [],

  // Helper to load the local HTML dump from HTTP server
  loadLocalPage: async ({ context }, use) => {
    const contentPages: Page[] = [];
    
    const loadLocalPage = async (): Promise<Page> => {
      const page = context.pages()[0] || await context.newPage();
      // Use HTTP server instead of file:// protocol
      await page.goto('http://localhost:8080/Nykredit%20Privat.html');
      
      // Wait for the page to have the expected elements (check existence, not visibility)
      await page.waitForSelector('.PostingTable-tr', { state: 'attached', timeout: 10000 });
      
      // Inject the content script manually for testing
      const contentScriptPath = path.join(SRC_DIR, 'content.js');
      if (fs.existsSync(contentScriptPath)) {
        const contentScript = fs.readFileSync(contentScriptPath, 'utf-8');
        
        // Mock the browser API for content script in file:// context
        // Also expose a function to enable/disable for integration testing
         const mockBrowserAPI = `
           if (typeof browser === 'undefined' && typeof chrome === 'undefined') {
             const mockStorage = { hideEnabled: false, filterMode: 'all' };
             const normalizeGetResult = (key) => {
               if (Array.isArray(key)) {
                 return key.reduce((acc, k) => {
                   acc[k] = mockStorage[k];
                   return acc;
                 }, {});
               }
               if (typeof key === 'string') {
                 return { [key]: mockStorage[key] };
               }
               if (key && typeof key === 'object') {
                 return Object.keys(key).reduce((acc, k) => {
                   acc[k] = mockStorage[k] ?? key[k];
                   return acc;
                 }, {});
               }
               return { ...mockStorage };
             };
             window.browser = {
               storage: {
                 local: {
                   get: (key) => Promise.resolve(normalizeGetResult(key)),
                   set: (obj) => {
                     Object.assign(mockStorage, obj);
                     return Promise.resolve();
                   },
                   remove: (key) => {
                     const keys = Array.isArray(key) ? key : [key];
                     keys.forEach((k) => delete mockStorage[k]);
                     return Promise.resolve();
                   }
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
               },
               action: {
                 setIcon: () => Promise.resolve()
               }
             };
             window.chrome = window.browser;
          }
        `;
        
        await page.addInitScript(mockBrowserAPI + '\n' + contentScript);
      }
      
      // Store reference for integration tests
      contentPages.push(page);
      // Expose to window for access from popup context
      await page.evaluate(() => {
        window.__isContentPage = true;
      });
      
      return page;
    };
    
    await use(loadLocalPage);
  },
});

export { expect } from '@playwright/test';
