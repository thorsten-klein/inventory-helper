const { test, expect } = require('@playwright/test');

test.describe('Search Modal Barcode Scanner Z-Index Bug', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('barcode scanner modal should have higher z-index than search modal', async ({ page }) => {
    // Get the computed z-index values
    const zIndexes = await page.evaluate(() => {
      const searchModal = document.getElementById('search-modal');
      const scannerModal = document.getElementById('barcode-scanner-modal');

      const searchZIndex = window.getComputedStyle(searchModal).zIndex;
      const scannerZIndex = window.getComputedStyle(scannerModal).zIndex;

      return {
        search: searchZIndex,
        scanner: scannerZIndex
      };
    });

    console.log('Search modal z-index:', zIndexes.search);
    console.log('Scanner modal z-index:', zIndexes.scanner);

    // Scanner modal should have higher z-index
    const searchZ = parseInt(zIndexes.search) || 0;
    const scannerZ = parseInt(zIndexes.scanner) || 0;

    expect(scannerZ).toBeGreaterThan(searchZ);
    expect(scannerZ).toBe(1100); // Should be 1100 as per fix
  });

  test('all modals have correct z-index hierarchy', async ({ page }) => {
    // Check z-index of various modals
    const zIndexes = await page.evaluate(() => {
      const modals = {
        search: document.getElementById('search-modal'),
        scanner: document.getElementById('barcode-scanner-modal'),
        itemDetails: document.getElementById('item-details-modal'),
        manualEan: document.getElementById('manual-ean-modal')
      };

      const result = {};
      for (const [name, modal] of Object.entries(modals)) {
        if (modal) {
          result[name] = parseInt(window.getComputedStyle(modal).zIndex) || 0;
        }
      }
      return result;
    });

    console.log('Modal z-indexes:', zIndexes);

    // Scanner modal should have z-index 1100 (same as other priority modals)
    expect(zIndexes.scanner).toBe(1100);

    // Scanner should be higher than search modal
    expect(zIndexes.scanner).toBeGreaterThan(zIndexes.search || 1000);

    // Verify other priority modals also have 1100
    if (zIndexes.itemDetails) {
      expect(zIndexes.itemDetails).toBe(1100);
    }
    if (zIndexes.manualEan) {
      expect(zIndexes.manualEan).toBe(1100);
    }
  });
});
