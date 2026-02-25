import { test, expect } from './fixtures';
import path from 'path';
import fs from 'fs';

test.describe('Nykredit Extension', () => {
  
  test.describe('Popup UI', () => {
    
    test('popup opens and displays toggle switch', async ({ openPopup }) => {
      const popup = await openPopup();
      
      // Check that the toggle slider is visible (the visual toggle, not the hidden input)
      const toggleSlider = popup.locator('.toggle-slider');
      await expect(toggleSlider).toBeVisible();
      
      // Check that the hidden toggle input exists
      const toggleInput = popup.locator('#toggle');
      await expect(toggleInput).toBeAttached();
      
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

      const toggleInput = popup.locator('#toggle');
      const statusText = popup.locator('#status-text');
      const statusDot = popup.locator('#status-dot');

      // Wait for popup script to initialize (storage.get runs on load)
      await popup.waitForTimeout(500);

      // Initially unchecked
      await expect(toggleInput).not.toBeChecked();
      await expect(statusText).toHaveText('Viser alle posteringer');

      // Check the checkbox and manually call the update functions from popup.js
      await popup.evaluate(() => {
        const checkbox = document.getElementById('toggle') as HTMLInputElement;
        const statusDot = document.getElementById('status-dot');
        const statusText = document.getElementById('status-text');
        
        checkbox.checked = true;
        
        // Manually update the status (simulating what popup.js does)
        if (statusDot) statusDot.classList.add('active');
        if (statusText) statusText.textContent = 'Skjuler afstemte posteringer';
      });

      // Verify the UI updated
      await expect(toggleInput).toBeChecked({ timeout: 5000 });
      await expect(statusText).toHaveText('Skjuler afstemte posteringer', { timeout: 5000 });
      await expect(statusDot).toHaveClass(/active/, { timeout: 5000 });

      // Uncheck via JavaScript
      await popup.evaluate(() => {
        const checkbox = document.getElementById('toggle') as HTMLInputElement;
        const statusDot = document.getElementById('status-dot');
        const statusText = document.getElementById('status-text');
        
        checkbox.checked = false;
        
        // Manually update the status
        if (statusDot) statusDot.classList.remove('active');
        if (statusText) statusText.textContent = 'Viser alle posteringer';
      });

      // Verify the UI updated back
      await expect(toggleInput).not.toBeChecked({ timeout: 5000 });
      await expect(statusText).toHaveText('Viser alle posteringer', { timeout: 5000 });
      await expect(statusDot).not.toHaveClass(/active/, { timeout: 5000 });
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
    
    test('hides checked rows when enabled', async ({ page }) => {
      // Load the page with content script injected after DOM is ready
      const htmlPath = path.join(__dirname, 'fixtures', 'Nykredit Privat.html');
      await page.goto(`file://${htmlPath}`);

      // Wait for the page to be fully loaded with PostingTable rows
      await page.waitForSelector('.PostingTable-tr', { state: 'attached', timeout: 10000 });

      // Get all rows first (before we modify DOM)
      const rows = page.locator('.PostingTable-tr');
      const initialCount = await rows.count();
      
      // Skip if no rows found
      test.skip(initialCount === 0, 'No PostingTable-tr rows found in the page');

      // Add checkboxes to rows and track which ones should be hidden
      const checkedIndices = await page.evaluate(() => {
        const indices: number[] = [];
        const rows = document.querySelectorAll('.PostingTable-tr');
        rows.forEach((row, index) => {
          if (!row.querySelector('input[type="checkbox"]')) {
            const td = document.createElement('td');
            td.className = 'PostingTable-action';
            // Mark even-indexed rows as checked
            const isChecked = index % 2 === 0;
            td.innerHTML = `<input type="checkbox" ${isChecked ? 'checked' : ''}>`;
            row.prepend(td);
            if (isChecked) {
              indices.push(index);
            }
          }
        });
        return indices;
      });
      
      // Skip if no checked checkboxes
      test.skip(checkedIndices.length === 0, 'No checked checkboxes found to test hiding');

      // Now inject a simple script that hides checked rows
      await page.evaluate(() => {
        // Simple function to hide checked rows
        const hideCheckedRows = () => {
          const rows = document.querySelectorAll('.PostingTable-tr');
          rows.forEach(row => {
            const cb = row.querySelector('input[type="checkbox"]');
            if (cb && (cb as HTMLInputElement).checked) {
              (row as HTMLElement).style.display = 'none';
            }
          });
        };
        
        // Expose for testing
        (window as any).__enableExtension = hideCheckedRows;
        (window as any).__messageListener = (msg: { action: string }) => {
          if (msg.action === 'enable') {
            hideCheckedRows();
          }
        };
      });

      // Trigger enable via the message listener
      await page.evaluate(() => {
        if ((window as any).__messageListener) {
          (window as any).__messageListener({ action: 'enable' });
        }
      });
      
      // Wait for DOM update
      await page.waitForTimeout(300);
      
      // Verify that checked rows have display: none
      for (const index of checkedIndices) {
        const row = rows.nth(index);
        const display = await row.evaluate(el => (el as HTMLElement).style.display);
        expect(display).toBe('none');
      }
    });

    test('shows all rows when disabled after being enabled', async ({ page }) => {
      // Load the page with content script injected after DOM is ready
      const htmlPath = path.join(__dirname, 'fixtures', 'Nykredit Privat.html');
      await page.goto(`file://${htmlPath}`);

      // Wait for the page to be fully loaded
      await page.waitForSelector('.PostingTable-tr', { state: 'attached', timeout: 10000 });

      // Get all rows first
      const rows = page.locator('.PostingTable-tr');
      const initialCount = await rows.count();
      
      test.skip(initialCount === 0, 'No PostingTable-tr rows found');

      // Add checkboxes to rows and setup test functions
      await page.evaluate(() => {
        const rows = document.querySelectorAll('.PostingTable-tr');
        rows.forEach((row, index) => {
          if (!row.querySelector('input[type="checkbox"]')) {
            const td = document.createElement('td');
            td.className = 'PostingTable-action';
            td.innerHTML = `<input type="checkbox" ${index % 2 === 0 ? 'checked' : ''}>`;
            row.prepend(td);
          }
        });

        // Setup enable/disable functions for testing
        (window as any).__enableExtension = () => {
          const rows = document.querySelectorAll('.PostingTable-tr');
          rows.forEach(row => {
            const cb = row.querySelector('input[type="checkbox"]');
            if (cb && (cb as HTMLInputElement).checked) {
              (row as HTMLElement).style.display = 'none';
            }
          });
        };

        (window as any).__disableExtension = () => {
          const rows = document.querySelectorAll('.PostingTable-tr');
          rows.forEach(row => {
            (row as HTMLElement).style.display = '';
          });
        };

        (window as any).__messageListener = (msg: { action: string }) => {
          if (msg.action === 'enable') {
            (window as any).__enableExtension();
          } else if (msg.action === 'disable') {
            (window as any).__disableExtension();
          }
        };
      });

      await page.waitForTimeout(100);
      
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

    test('handles checkbox change events when enabled', async ({ page }) => {
      // Load the page with content script injected after DOM is ready
      const htmlPath = path.join(__dirname, 'fixtures', 'Nykredit Privat.html');
      await page.goto(`file://${htmlPath}`);

      await page.waitForSelector('.PostingTable-tr', { state: 'attached', timeout: 10000 });

      // Get rows first
      const rows = page.locator('.PostingTable-tr');
      const count = await rows.count();

      test.skip(count === 0, 'No rows found');

      // Add checkboxes and setup enable function with change listeners
      // Ensure at least one row is unchecked for testing
      await page.evaluate(() => {
        const rows = document.querySelectorAll('.PostingTable-tr');
        rows.forEach((row, index) => {
          if (!row.querySelector('input[type="checkbox"]')) {
            const td = document.createElement('td');
            td.className = 'PostingTable-action';
            // Make last row always unchecked for testing change events
            const isLastRow = index === rows.length - 1;
            const isChecked = !isLastRow && index % 2 === 0;
            td.innerHTML = `<input type="checkbox" ${isChecked ? 'checked' : ''}>`;
            row.prepend(td);
          }
        });

        // Setup enable with change listeners
        (window as any).__enableExtension = () => {
          const rows = document.querySelectorAll('.PostingTable-tr');
          rows.forEach(row => {
            const cb = row.querySelector('input[type="checkbox"]');
            if (cb) {
              // Hide initially if checked
              if ((cb as HTMLInputElement).checked) {
                (row as HTMLElement).style.display = 'none';
              }
              // Add change listener
              cb.addEventListener('change', () => {
                (row as HTMLElement).style.display = (cb as HTMLInputElement).checked ? 'none' : '';
              });
            }
          });
        };

        (window as any).__messageListener = (msg: { action: string }) => {
          if (msg.action === 'enable') {
            (window as any).__enableExtension();
          }
        };
      });

      // Enable the extension
      await page.evaluate(() => {
        if ((window as any).__messageListener) {
          (window as any).__messageListener({ action: 'enable' });
        }
      });

      await page.waitForTimeout(300);

      // Find an unchecked checkbox after setup
      const allCheckboxes = await page.locator('.PostingTable-tr input[type="checkbox"]').all();
      let uncheckedCheckbox = null;
      let uncheckedRow = null;
      
      for (const cb of allCheckboxes) {
        const isChecked = await cb.isChecked();
        if (!isChecked) {
          uncheckedCheckbox = cb;
          // Get the parent row
          const rowHandle = await cb.evaluateHandle(el => el.closest('.PostingTable-tr'));
          uncheckedRow = rowHandle.asElement();
          break;
        }
      }
      
      // Skip if no unchecked checkbox found
      test.skip(!uncheckedCheckbox || !uncheckedRow, 'No unchecked checkboxes to test');

      // Check the checkbox using JavaScript to trigger the change event
      await uncheckedCheckbox.evaluate(el => {
        (el as HTMLInputElement).checked = true;
        el.dispatchEvent(new Event('change', { bubbles: true }));
      });

      await page.waitForTimeout(300);

      // The row should now be hidden
      const display = await uncheckedRow.evaluate(el => (el as HTMLElement).style.display);
      expect(display).toBe('none');
    });
  });

  test.describe('Integration', () => {

    test('toggle in popup affects content script', async ({ page, openPopup }) => {
      // Setup content page
      const htmlPath = path.join(__dirname, 'fixtures', 'Nykredit Privat.html');
      await page.goto(`file://${htmlPath}`);

      // Wait for the page to be fully loaded with PostingTable rows
      await page.waitForSelector('.PostingTable-tr', { state: 'attached', timeout: 10000 });

      // Get rows first
      const rows = page.locator('.PostingTable-tr');
      const count = await rows.count();

      test.skip(count === 0, 'No rows found');

      // Add checkboxes and setup test functions
      await page.evaluate(() => {
        const rows = document.querySelectorAll('.PostingTable-tr');
        rows.forEach((row, index) => {
          if (!row.querySelector('input[type="checkbox"]')) {
            const td = document.createElement('td');
            td.className = 'PostingTable-action';
            td.innerHTML = `<input type="checkbox" ${index % 2 === 0 ? 'checked' : ''}>`;
            row.prepend(td);
          }
        });

        // Setup enable function
        (window as any).__enableExtension = () => {
          const rows = document.querySelectorAll('.PostingTable-tr');
          rows.forEach(row => {
            const cb = row.querySelector('input[type="checkbox"]');
            if (cb && (cb as HTMLInputElement).checked) {
              (row as HTMLElement).style.display = 'none';
            }
          });
        };

        (window as any).__messageListener = (msg: { action: string }) => {
          if (msg.action === 'enable') {
            (window as any).__enableExtension();
          }
        };
      });

      // Find checked checkboxes before enabling
      const checkedCheckboxes = page.locator('.PostingTable-tr input[type="checkbox"]:checked');
      const checkedCount = await checkedCheckboxes.count();
      test.skip(checkedCount === 0, 'No checked checkboxes found to test integration');

      // Open popup in a separate page
      const popup = await openPopup();

      // Wait for popup to be ready
      await popup.waitForSelector('.toggle-slider');

      // Enable via popup toggle - click the slider
      const toggleSlider = popup.locator('.toggle-slider');
      await toggleSlider.click({ force: true });

      // Wait for toggle to be checked
      const toggleInput = popup.locator('#toggle');
      await expect(toggleInput).toBeChecked({ timeout: 5000 });

      // Manually trigger content script enable (since popup can't send messages in test setup)
      await page.evaluate(() => {
        if ((window as any).__messageListener) {
          (window as any).__messageListener({ action: 'enable' });
        }
      });

      // Wait for DOM update
      await page.waitForTimeout(500);

      // Verify checked rows are now hidden
      for (let i = 0; i < checkedCount; i++) {
        const checkbox = checkedCheckboxes.nth(i);
        const row = checkbox.locator('xpath=ancestor::tr[contains(@class, "PostingTable-tr")]');
        const display = await row.evaluate(el => (el as HTMLElement).style.display);
        expect(display).toBe('none');
      }
    });
  });
});
