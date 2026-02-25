import { test, expect } from './fixtures';
import path from 'path';

test.describe('Nykredit Extension', () => {
  
  test.describe('Popup UI', () => {
    
    test('popup opens and displays toggle switch', async ({ openPopup }) => {
      const popup = await openPopup();
      
      // Check that the toggle exists
      const toggle = popup.locator('#toggle');
      await expect(toggle).toBeVisible();
      
      // Check that the status text is visible
      const statusText = popup.locator('#status-text');
      await expect(statusText).toBeVisible();
      await expect(statusText).toHaveText('Viser alle posteringer');
      
      // Check that the status dot is not active initially
      const statusDot = popup.locator('#status-dot');
      await expect(statusDot).not.toHaveClass(/active/);
    });

    test('toggle switch enables and disables extension', async ({ openPopup }) => {
      const popup = await openPopup();
      
      const toggle = popup.locator('#toggle');
      const statusText = popup.locator('#status-text');
      const statusDot = popup.locator('#status-dot');
      
      // Initially unchecked
      await expect(toggle).not.toBeChecked();
      await expect(statusText).toHaveText('Viser alle posteringer');
      
      // Click to enable
      await toggle.click();
      
      // Should be checked and show active status
      await expect(toggle).toBeChecked();
      await expect(statusText).toHaveText('Skjuler afstemte posteringer');
      await expect(statusDot).toHaveClass(/active/);
      
      // Click again to disable
      await toggle.click();
      
      // Should be unchecked and show inactive status
      await expect(toggle).not.toBeChecked();
      await expect(statusText).toHaveText('Viser alle posteringer');
      await expect(statusDot).not.toHaveClass(/active/);
    });

    test('popup shows correct title and description', async ({ openPopup }) => {
      const popup = await openPopup();
      
      // Check title
      const title = popup.locator('.title');
      await expect(title).toBeVisible();
      await expect(title).toHaveText('Nykredit Extension');
      
      // Check label text
      const labelText = popup.locator('.label-text');
      await expect(labelText).toHaveText('Skjul afstemte posteringer');
      
      // Check description
      const description = popup.locator('.label-description');
      await expect(description).toHaveText('Vis kun uafstemte transaktioner');
    });
  });

  test.describe('Content Script', () => {
    
    test('hides checked rows when enabled', async ({ loadLocalPage, browserName }) => {
      const page = await loadLocalPage();
      
      // Wait for the page to be fully loaded with PostingTable rows
      await page.waitForSelector('.PostingTable-tr', { timeout: 10000 });
      
      // Get all rows
      const rows = page.locator('.PostingTable-tr');
      const initialCount = await rows.count();
      
      // Skip if no rows found (page might have different structure)
      test.skip(initialCount === 0, 'No PostingTable-tr rows found in the page');
      
      // Find checked checkboxes
      const checkedCheckboxes = page.locator('.PostingTable-tr input[type="checkbox"]:checked');
      const checkedCount = await checkedCheckboxes.count();
      
      // Skip if no checked checkboxes
      test.skip(checkedCount === 0, 'No checked checkboxes found to test hiding');
      
      // Enable the extension by triggering the enable function
      await page.evaluate(() => {
        // Trigger the enable action through the mocked message listener
        if (window.__messageListener) {
          window.__messageListener({ action: 'enable' });
        }
      });
      
      // Wait a bit for the DOM to update
      await page.waitForTimeout(500);
      
      // Check that checked rows are now hidden
      const visibleRows = page.locator('.PostingTable-tr[style*="display: none"], .PostingTable-tr:not([style*="display: none"])');
      
      // Verify that checked rows have display: none
      for (let i = 0; i < checkedCount; i++) {
        const checkbox = checkedCheckboxes.nth(i);
        const row = checkbox.locator('xpath=ancestor::tr[contains(@class, "PostingTable-tr")]');
        const display = await row.evaluate(el => (el as HTMLElement).style.display);
        expect(display).toBe('none');
      }
    });

    test('shows all rows when disabled after being enabled', async ({ loadLocalPage }) => {
      const page = await loadLocalPage();
      
      // Wait for the page to be fully loaded
      await page.waitForSelector('.PostingTable-tr', { timeout: 10000 });
      
      const rows = page.locator('.PostingTable-tr');
      const initialCount = await rows.count();
      
      test.skip(initialCount === 0, 'No PostingTable-tr rows found');
      
      // First enable
      await page.evaluate(() => {
        if (window.__messageListener) {
          window.__messageListener({ action: 'enable' });
        }
      });
      
      await page.waitForTimeout(300);
      
      // Then disable
      await page.evaluate(() => {
        if (window.__messageListener) {
          window.__messageListener({ action: 'disable' });
        }
      });
      
      await page.waitForTimeout(300);
      
      // Check that all rows are visible (no display: none)
      for (let i = 0; i < initialCount; i++) {
        const row = rows.nth(i);
        const display = await row.evaluate(el => (el as HTMLElement).style.display);
        expect(display).toBe('');
      }
    });

    test('handles checkbox change events when enabled', async ({ loadLocalPage }) => {
      const page = await loadLocalPage();
      
      await page.waitForSelector('.PostingTable-tr', { timeout: 10000 });
      
      const rows = page.locator('.PostingTable-tr');
      const count = await rows.count();
      
      test.skip(count === 0, 'No rows found');
      
      // Enable the extension
      await page.evaluate(() => {
        if (window.__messageListener) {
          window.__messageListener({ action: 'enable' });
        }
      });
      
      await page.waitForTimeout(300);
      
      // Find an unchecked checkbox and check it
      const uncheckedCheckboxes = page.locator('.PostingTable-tr input[type="checkbox"]:not(:checked)');
      const uncheckedCount = await uncheckedCheckboxes.count();
      
      if (uncheckedCount > 0) {
        const firstUnchecked = uncheckedCheckboxes.first();
        const row = firstUnchecked.locator('xpath=ancestor::tr[contains(@class, "PostingTable-tr")]');
        
        // Check the checkbox
        await firstUnchecked.check();
        
        await page.waitForTimeout(300);
        
        // The row should now be hidden
        const display = await row.evaluate(el => (el as HTMLElement).style.display);
        expect(display).toBe('none');
      }
    });
  });

  test.describe('Integration', () => {
    
    test('toggle in popup affects content script', async ({ loadLocalPage, openPopup, browserName }) => {
      // This test is Chrome-specific since Firefox extension loading is limited in Playwright
      test.skip(browserName === 'firefox', 'Extension messaging test is Chrome-only');
      
      const page = await loadLocalPage();
      const popup = await openPopup();
      
      // Wait for both pages to be ready
      await page.waitForSelector('.PostingTable-tr', { timeout: 10000 });
      await popup.waitForSelector('#toggle');
      
      const rows = page.locator('.PostingTable-tr');
      const count = await rows.count();
      
      test.skip(count === 0, 'No rows found');
      
      // Enable via popup toggle
      const toggle = popup.locator('#toggle');
      await toggle.click();
      
      // Wait for storage to update and content script to respond
      await page.waitForTimeout(1000);
      
      // Check that extension state is stored
      const isEnabled = await popup.evaluate(() => {
        const browserAPI = typeof browser !== 'undefined' ? browser : chrome;
        return browserAPI.storage.local.get('hideEnabled').then(r => r.hideEnabled);
      });
      
      expect(isEnabled).toBe(true);
    });
  });
});
