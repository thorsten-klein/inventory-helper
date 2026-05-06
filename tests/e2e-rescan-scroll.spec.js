const { test, expect } = require('@playwright/test');
const { setupEditor } = require('./helpers');
const path = require('path');
const fs = require('fs');

test.describe('Rescan Modal Scroll Functionality', () => {
  const exampleFilePath = path.join(__dirname, '..', 'example', 'example.xlsx');

  test.beforeEach(async ({ page, context }) => {
    await setupEditor(page, context);
  });

  test('scanned items list should be scrollable', async ({ page }) => {
    // Verify example file exists
    expect(fs.existsSync(exampleFilePath)).toBeTruthy();

    // Upload and navigate to editor screen
    const fileInput = page.locator('#file-input');
    await fileInput.setInputFiles(exampleFilePath);
    // Removed 2000ms timeout - handled by helpers

    await page.click('#btn-next-category');
    // Removed 500ms timeout

    const categoryOptions = await page.locator('#category-select option').count();
    if (categoryOptions > 0) {
      const firstOptionValue = await page.locator('#category-select option').first().getAttribute('value');
      if (firstOptionValue) {
        await page.selectOption('#category-select', firstOptionValue);
        // Removed 300ms timeout

        await page.click('#btn-start-editing');
        // Removed 1000ms timeout

        // Click full rescan button
        const fullRescanBtn = page.locator('#btn-full-rescan');
        if (await fullRescanBtn.isVisible()) {
          await fullRescanBtn.click();
          // Removed 1000ms timeout

          // Rescan modal should be visible
          await expect(page.locator('#rescan-modal')).not.toHaveClass(/hidden/);

          // Enter shelf value to enable scanning
          await page.fill('#rescan-shelf', 'TestShelf');
          // Removed 300ms timeout

          // Simulate scanning multiple items by calling addScannedItem directly
          // We'll add 15 items to ensure scrolling is needed
          for (let i = 1; i <= 15; i++) {
            await page.evaluate((ean) => {
              addScannedItem(ean);
            }, `EAN${String(i).padStart(13, '0')}`);

            // Wait for item to be added to table
            await page.waitForFunction(
              (count) => document.querySelectorAll('.scanned-items-table tbody tr').length >= count,
              i,
              { timeout: 1000 }
            );
          }

          // Check that the table wrapper has overflow-y: auto
          const tableWrapper = page.locator('.scanned-items-table-wrapper');
          const overflowY = await tableWrapper.evaluate((el) => {
            return window.getComputedStyle(el).overflowY;
          });
          expect(overflowY).toBe('auto');

          // Check that the table wrapper is scrollable (scrollHeight > clientHeight)
          const isScrollable = await tableWrapper.evaluate((el) => {
            return el.scrollHeight > el.clientHeight;
          });
          expect(isScrollable).toBe(true);

          // Verify we can scroll
          const initialScrollTop = await tableWrapper.evaluate(el => el.scrollTop);

          // Scroll to middle
          await tableWrapper.evaluate(el => {
            el.scrollTop = el.scrollHeight / 2;
          });

          const middleScrollTop = await tableWrapper.evaluate(el => el.scrollTop);
          expect(middleScrollTop).toBeGreaterThan(initialScrollTop);
        }
      }
    }
  });

  test('should automatically scroll to show latest scanned item at end of list', async ({ page }) => {
    // Verify example file exists
    expect(fs.existsSync(exampleFilePath)).toBeTruthy();

    // Upload and navigate
    const fileInput = page.locator('#file-input');
    await fileInput.setInputFiles(exampleFilePath);
    // Removed 2000ms timeout - handled by helpers

    await page.click('#btn-next-category');
    // Removed 500ms timeout

    const categoryOptions = await page.locator('#category-select option').count();
    if (categoryOptions > 0) {
      const firstOptionValue = await page.locator('#category-select option').first().getAttribute('value');
      if (firstOptionValue) {
        await page.selectOption('#category-select', firstOptionValue);
        // Removed 300ms timeout

        await page.click('#btn-start-editing');
        // Removed 1000ms timeout

        const fullRescanBtn = page.locator('#btn-full-rescan');
        if (await fullRescanBtn.isVisible()) {
          await fullRescanBtn.click();
          // Removed 1000ms timeout

          await page.fill('#rescan-shelf', 'TestShelf');
          // Removed 300ms timeout

          const tableWrapper = page.locator('.scanned-items-table-wrapper');

          // Add multiple items to create a scrollable list
          for (let i = 1; i <= 10; i++) {
            await page.evaluate((ean) => {
              addScannedItem(ean);
            }, `EAN${String(i).padStart(13, '0')}`);

            // Wait for item to be added to table
            await page.waitForFunction(
              (count) => document.querySelectorAll('.scanned-items-table tbody tr').length >= count,
              i,
              { timeout: 1000 }
            );
          }

          // Scroll to top manually
          await tableWrapper.evaluate(el => {
            el.scrollTop = 0;
          });

          // Wait for scroll to complete
          await page.waitForFunction(
            () => document.querySelector('.scanned-items-table-wrapper')?.scrollTop === 0,
            { timeout: 1000 }
          );

          const scrollTopAfterReset = await tableWrapper.evaluate(el => el.scrollTop);
          expect(scrollTopAfterReset).toBe(0);

          // Add a new item
          await page.evaluate(() => {
            addScannedItem('EAN0000000000999');
          });

          // Wait for new item to be added and scroll to complete
          await page.waitForFunction(
            () => {
              const rows = document.querySelectorAll('.scanned-items-table tbody tr');
              return rows.length === 11 &&
                     Array.from(rows).some(row => row.textContent.includes('EAN0000000000999'));
            },
            { timeout: 2000 }
          );

          // The list should automatically scroll to the bottom to show the new item
          const scrollTopAfterNewItem = await tableWrapper.evaluate(el => el.scrollTop);
          const scrollHeight = await tableWrapper.evaluate(el => el.scrollHeight);
          const clientHeight = await tableWrapper.evaluate(el => el.clientHeight);

          // scrollTop should be near the bottom (scrollHeight - clientHeight)
          const maxScrollTop = scrollHeight - clientHeight;
          expect(scrollTopAfterNewItem).toBeGreaterThan(0);
          expect(scrollTopAfterNewItem).toBeGreaterThanOrEqual(maxScrollTop - 5); // Allow 5px tolerance
        }
      }
    }
  });

  test('latest scanned item should be visible at bottom after manual scroll up', async ({ page }) => {
    // This test reproduces the user's bug:
    // After scrolling up in the list, a newly scanned item should auto-scroll to show it at the bottom

    expect(fs.existsSync(exampleFilePath)).toBeTruthy();

    const fileInput = page.locator('#file-input');
    await fileInput.setInputFiles(exampleFilePath);
    // Removed 2000ms timeout - handled by helpers

    await page.click('#btn-next-category');
    // Removed 500ms timeout

    const categoryOptions = await page.locator('#category-select option').count();
    if (categoryOptions > 0) {
      const firstOptionValue = await page.locator('#category-select option').first().getAttribute('value');
      if (firstOptionValue) {
        await page.selectOption('#category-select', firstOptionValue);
        // Removed 300ms timeout

        await page.click('#btn-start-editing');
        // Removed 1000ms timeout

        const fullRescanBtn = page.locator('#btn-full-rescan');
        if (await fullRescanBtn.isVisible()) {
          await fullRescanBtn.click();
          // Removed 1000ms timeout

          await page.fill('#rescan-shelf', 'TestShelf');
          // Removed 300ms timeout

          const tableWrapper = page.locator('.scanned-items-table-wrapper');

          // Add 20 items to ensure we have a long scrollable list
          for (let i = 1; i <= 20; i++) {
            await page.evaluate((ean) => {
              addScannedItem(ean);
            }, `PRODUCT${String(i).padStart(10, '0')}`);

            // Wait for item to be added to table
            await page.waitForFunction(
              (count) => document.querySelectorAll('.scanned-items-table tbody tr').length >= count,
              i,
              { timeout: 1000 }
            );
          }

          // User scrolls up to review earlier items
          await tableWrapper.evaluate(el => {
            el.scrollTop = 50; // Scroll up, not at bottom
          });

          // Wait for scroll to settle at position
          await page.waitForFunction(
            () => {
              const wrapper = document.querySelector('.scanned-items-table-wrapper');
              return wrapper && wrapper.scrollTop >= 45 && wrapper.scrollTop <= 55;
            },
            { timeout: 1000 }
          );

          const scrollTopBeforeScan = await tableWrapper.evaluate(el => el.scrollTop);
          expect(scrollTopBeforeScan).toBeLessThan(200); // Verify we're not at bottom

          // User scans a new item
          await page.evaluate(() => {
            addScannedItem('NEWPRODUCT001');
          });

          // Wait for new item to be added and auto-scroll to complete
          await page.waitForFunction(
            () => {
              const rows = document.querySelectorAll('.scanned-items-table tbody tr');
              return rows.length === 21 &&
                     Array.from(rows).some(row => row.textContent.includes('NEWPRODUCT001'));
            },
            { timeout: 2000 }
          );

          // EXPECTED: List should auto-scroll to show the new item at the bottom
          const scrollTopAfterScan = await tableWrapper.evaluate(el => el.scrollTop);
          const scrollHeight = await tableWrapper.evaluate(el => el.scrollHeight);
          const clientHeight = await tableWrapper.evaluate(el => el.clientHeight);
          const maxScrollTop = scrollHeight - clientHeight;

          // New item should be visible at the bottom
          expect(scrollTopAfterScan).toBeGreaterThanOrEqual(maxScrollTop - 5);

          // The last row should be the newly added item
          const lastRowEan = await page.locator('.scanned-items-table tbody tr:last-child td:first-child').textContent();
          expect(lastRowEan).toBe('NEWPRODUCT001');
        }
      }
    }
  });

  test('should maintain scroll position at bottom when removing items', async ({ page }) => {
    expect(fs.existsSync(exampleFilePath)).toBeTruthy();

    const fileInput = page.locator('#file-input');
    await fileInput.setInputFiles(exampleFilePath);
    // Removed 2000ms timeout - handled by helpers

    await page.click('#btn-next-category');
    // Removed 500ms timeout

    const categoryOptions = await page.locator('#category-select option').count();
    if (categoryOptions > 0) {
      const firstOptionValue = await page.locator('#category-select option').first().getAttribute('value');
      if (firstOptionValue) {
        await page.selectOption('#category-select', firstOptionValue);
        // Removed 300ms timeout

        await page.click('#btn-start-editing');
        // Removed 1000ms timeout

        const fullRescanBtn = page.locator('#btn-full-rescan');
        if (await fullRescanBtn.isVisible()) {
          await fullRescanBtn.click();
          // Removed 1000ms timeout

          await page.fill('#rescan-shelf', 'TestShelf');
          // Removed 300ms timeout

          // Add several items
          for (let i = 1; i <= 10; i++) {
            await page.evaluate((ean) => {
              addScannedItem(ean);
            }, `ITEM${String(i).padStart(10, '0')}`);

            // Wait for item to be added to table
            await page.waitForFunction(
              (count) => document.querySelectorAll('.scanned-items-table tbody tr').length >= count,
              i,
              { timeout: 1000 }
            );
          }

          // Verify we're at the bottom
          const tableWrapper = page.locator('.scanned-items-table-wrapper');
          const scrollHeightBefore = await tableWrapper.evaluate(el => el.scrollHeight);
          const clientHeight = await tableWrapper.evaluate(el => el.clientHeight);
          const scrollTopBefore = await tableWrapper.evaluate(el => el.scrollTop);

          expect(scrollTopBefore).toBeGreaterThanOrEqual(scrollHeightBefore - clientHeight - 5);

          // Click remove button on last item (if available)
          const removeBtn = page.locator('.btn-remove-scan').first();
          if (await removeBtn.isVisible()) {
            // Get initial row count
            const initialRowCount = await page.locator('.scanned-items-table tbody tr').count();

            await removeBtn.click();

            // Wait for item to be removed from table
            await page.waitForFunction(
              (expectedCount) => document.querySelectorAll('.scanned-items-table tbody tr').length === expectedCount,
              initialRowCount - 1,
              { timeout: 2000 }
            );

            // List should still be scrollable if there are enough items
            const rowCount = await page.locator('.scanned-items-table tbody tr').count();
            if (rowCount > 5) {
              const isStillScrollable = await tableWrapper.evaluate((el) => {
                return el.scrollHeight > el.clientHeight;
              });
              expect(isStillScrollable).toBe(true);
            }
          }
        }
      }
    }
  });
});
