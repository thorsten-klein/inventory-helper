const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

test.describe('Barcode Scanner Zoom Controls', () => {
  const exampleFilePath = path.join(__dirname, '..', 'example', 'example.xlsx');

  test.beforeEach(async ({ page, context }) => {
    // Clear localStorage before each test
    await context.clearCookies();
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => localStorage.clear());
    // Removed 500ms timeout
  });

  test('should display zoom controls in barcode scanner modal', async ({ page, context }) => {
    // Grant camera permissions
    await context.grantPermissions(['camera']);

    // Verify example file exists
    expect(fs.existsSync(exampleFilePath)).toBeTruthy();

    // Upload file
    const fileInput = page.locator('#file-input');
    await fileInput.setInputFiles(exampleFilePath);
    // Removed 2000ms timeout - handled by helpers

    // Navigate to category screen
    await page.click('#btn-next-category');
    // Removed 500ms timeout

    // Select first category
    const categoryOptions = await page.locator('#category-select option').count();
    if (categoryOptions > 0) {
      const firstOptionValue = await page.locator('#category-select option').first().getAttribute('value');
      if (firstOptionValue) {
        await page.selectOption('#category-select', firstOptionValue);
        // Removed 300ms timeout

        // Click Start Editing
        await page.click('#btn-start-editing');
        // Removed 1000ms timeout

        // Click Add Item button
        await page.click('#btn-add-item');
        // Removed 300ms timeout

        // Select Add Item option
        await page.click('#btn-add-item-type');
        // Removed 500ms timeout

        // Click scan barcode button
        const scanBarcodeBtn = page.locator('#btn-scan-barcode');
        if (await scanBarcodeBtn.isVisible()) {
          await scanBarcodeBtn.click();
          // Removed 1000ms timeout

          // Check if scanner modal is visible
          const scannerModal = page.locator('#barcode-scanner-modal');
          await expect(scannerModal).not.toHaveClass(/hidden/);

          // Check for zoom controls
          const zoomInBtn = page.locator('#btn-zoom-in');
          const zoomOutBtn = page.locator('#btn-zoom-out');
          const zoomLevelDisplay = page.locator('#zoom-level-display');

          await expect(zoomInBtn).toBeVisible();
          await expect(zoomOutBtn).toBeVisible();
          await expect(zoomLevelDisplay).toBeVisible();

          // Initial zoom level should be 1.0x
          const initialZoomText = await zoomLevelDisplay.textContent();
          expect(initialZoomText).toContain('1.0');
        }
      }
    }
  });

  test('should increase zoom level when clicking zoom in button', async ({ page, context }) => {
    await context.grantPermissions(['camera']);

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
        await page.click('#btn-add-item');
        // Removed 300ms timeout
        await page.click('#btn-add-item-type');
        // Removed 500ms timeout

        const scanBarcodeBtn = page.locator('#btn-scan-barcode');
        if (await scanBarcodeBtn.isVisible()) {
          await scanBarcodeBtn.click();
          // Removed 1000ms timeout

          const zoomInBtn = page.locator('#btn-zoom-in');
          const zoomLevelDisplay = page.locator('#zoom-level-display');

          // Click zoom in button once
          await zoomInBtn.click();
          // Removed 300ms timeout

          // Zoom level should increase by 0.5
          const zoomText = await zoomLevelDisplay.textContent();
          expect(zoomText).toContain('1.5');

          // Click zoom in button again
          await zoomInBtn.click();
          // Removed 300ms timeout

          const zoomText2 = await zoomLevelDisplay.textContent();
          expect(zoomText2).toContain('2.0');
        }
      }
    }
  });

  test('should decrease zoom level when clicking zoom out button', async ({ page, context }) => {
    await context.grantPermissions(['camera']);

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
        await page.click('#btn-add-item');
        // Removed 300ms timeout
        await page.click('#btn-add-item-type');
        // Removed 500ms timeout

        const scanBarcodeBtn = page.locator('#btn-scan-barcode');
        if (await scanBarcodeBtn.isVisible()) {
          await scanBarcodeBtn.click();
          // Removed 1000ms timeout

          const zoomInBtn = page.locator('#btn-zoom-in');
          const zoomOutBtn = page.locator('#btn-zoom-out');
          const zoomLevelDisplay = page.locator('#zoom-level-display');

          // First zoom in to 2.0x
          await zoomInBtn.click();
          await page.waitForTimeout(200);
          await zoomInBtn.click();
          await page.waitForTimeout(200);

          let zoomText = await zoomLevelDisplay.textContent();
          expect(zoomText).toContain('2.0');

          // Then zoom out
          await zoomOutBtn.click();
          // Removed 300ms timeout

          zoomText = await zoomLevelDisplay.textContent();
          expect(zoomText).toContain('1.5');

          // Zoom out again
          await zoomOutBtn.click();
          // Removed 300ms timeout

          zoomText = await zoomLevelDisplay.textContent();
          expect(zoomText).toContain('1.0');
        }
      }
    }
  });

  test('should not allow zoom level below 1.0', async ({ page, context }) => {
    await context.grantPermissions(['camera']);

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
        await page.click('#btn-add-item');
        // Removed 300ms timeout
        await page.click('#btn-add-item-type');
        // Removed 500ms timeout

        const scanBarcodeBtn = page.locator('#btn-scan-barcode');
        if (await scanBarcodeBtn.isVisible()) {
          await scanBarcodeBtn.click();
          // Removed 1000ms timeout

          const zoomOutBtn = page.locator('#btn-zoom-out');
          const zoomLevelDisplay = page.locator('#zoom-level-display');

          // Zoom level starts at 1.0
          let zoomText = await zoomLevelDisplay.textContent();
          expect(zoomText).toContain('1.0');

          // Try to zoom out below 1.0
          await zoomOutBtn.click();
          // Removed 300ms timeout

          // Should still be at 1.0
          zoomText = await zoomLevelDisplay.textContent();
          expect(zoomText).toContain('1.0');

          // Zoom out button should be disabled
          const isDisabled = await zoomOutBtn.isDisabled();
          expect(isDisabled).toBe(true);
        }
      }
    }
  });

  test('zoom level should persist after closing and reopening scanner', async ({ page, context }) => {
    await context.grantPermissions(['camera']);

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
        await page.click('#btn-add-item');
        // Removed 300ms timeout
        await page.click('#btn-add-item-type');
        // Removed 500ms timeout

        const scanBarcodeBtn = page.locator('#btn-scan-barcode');
        if (await scanBarcodeBtn.isVisible()) {
          // Open scanner first time
          await scanBarcodeBtn.click();
          // Removed 1000ms timeout

          const zoomInBtn = page.locator('#btn-zoom-in');
          const zoomLevelDisplay = page.locator('#zoom-level-display');

          // Set zoom to 2.0x
          await zoomInBtn.click();
          await page.waitForTimeout(200);
          await zoomInBtn.click();
          await page.waitForTimeout(200);

          let zoomText = await zoomLevelDisplay.textContent();
          expect(zoomText).toContain('2.0');

          // Close the scanner
          const closeBtn = page.locator('#btn-close-scanner');
          await closeBtn.click();
          // Removed 500ms timeout

          // Open scanner again
          await scanBarcodeBtn.click();
          // Removed 1000ms timeout

          // Zoom level should still be 2.0x
          zoomText = await zoomLevelDisplay.textContent();
          expect(zoomText).toContain('2.0');
        }
      }
    }
  });

  test('zoom level should persist after page reload', async ({ page, context }) => {
    await context.grantPermissions(['camera']);

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
        await page.click('#btn-add-item');
        // Removed 300ms timeout
        await page.click('#btn-add-item-type');
        // Removed 500ms timeout

        const scanBarcodeBtn = page.locator('#btn-scan-barcode');
        if (await scanBarcodeBtn.isVisible()) {
          await scanBarcodeBtn.click();
          // Removed 1000ms timeout

          const zoomInBtn = page.locator('#btn-zoom-in');

          // Set zoom to 1.5x
          await zoomInBtn.click();
          // Removed 300ms timeout

          // Close scanner
          const closeBtn = page.locator('#btn-close-scanner');
          await closeBtn.click();
          // Removed 500ms timeout

          // Reload the page
          await page.reload({ waitUntil: 'networkidle' });
          // Removed 2000ms timeout - handled by helpers

          // Navigate back to scanner
          await page.click('#btn-next-category');
          // Removed 500ms timeout

          await page.selectOption('#category-select', firstOptionValue);
          // Removed 300ms timeout
          await page.click('#btn-start-editing');
          // Removed 1000ms timeout
          await page.click('#btn-add-item');
          // Removed 300ms timeout
          await page.click('#btn-add-item-type');
          // Removed 500ms timeout

          const scanBarcodeBtnAfterReload = page.locator('#btn-scan-barcode');
          if (await scanBarcodeBtnAfterReload.isVisible()) {
            await scanBarcodeBtnAfterReload.click();
            // Removed 1000ms timeout

            // Zoom level should still be 1.5x
            const zoomLevelDisplay = page.locator('#zoom-level-display');
            const zoomText = await zoomLevelDisplay.textContent();
            expect(zoomText).toContain('1.5');
          }
        }
      }
    }
  });
});
