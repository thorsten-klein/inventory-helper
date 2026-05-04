const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

test.describe('Barcode Scanner Zoom Controls', () => {
  const exampleFilePath = path.join(__dirname, '..', 'example', 'example.xlsx');

  test.beforeEach(async ({ page, context }) => {
    // Clear localStorage before each test
    await context.clearCookies();
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.evaluate(() => localStorage.clear());
    await page.waitForTimeout(1000);
  });

  test('should display zoom controls in barcode scanner modal', async ({ page, context }) => {
    // Grant camera permissions
    await context.grantPermissions(['camera']);

    // Skip if example file doesn't exist
    if (!fs.existsSync(exampleFilePath)) {
      test.skip();
      return;
    }

    // Upload file
    const fileInput = page.locator('#file-input');
    await fileInput.setInputFiles(exampleFilePath);
    await page.waitForTimeout(2000);

    // Navigate to category screen
    await page.click('#btn-next-category');
    await page.waitForTimeout(500);

    // Select first category
    const categoryOptions = await page.locator('#category-select option').count();
    if (categoryOptions > 0) {
      const firstOptionValue = await page.locator('#category-select option').first().getAttribute('value');
      if (firstOptionValue) {
        await page.selectOption('#category-select', firstOptionValue);
        await page.waitForTimeout(300);

        // Click Start Editing
        await page.click('#btn-start-editing');
        await page.waitForTimeout(1000);

        // Click Add Item button
        await page.click('#btn-add-item');
        await page.waitForTimeout(300);

        // Select Add Item option
        await page.click('#btn-add-item-type');
        await page.waitForTimeout(500);

        // Click scan barcode button
        const scanBarcodeBtn = page.locator('#btn-scan-barcode');
        if (await scanBarcodeBtn.isVisible()) {
          await scanBarcodeBtn.click();
          await page.waitForTimeout(1000);

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

    if (!fs.existsSync(exampleFilePath)) {
      test.skip();
      return;
    }

    const fileInput = page.locator('#file-input');
    await fileInput.setInputFiles(exampleFilePath);
    await page.waitForTimeout(2000);

    await page.click('#btn-next-category');
    await page.waitForTimeout(500);

    const categoryOptions = await page.locator('#category-select option').count();
    if (categoryOptions > 0) {
      const firstOptionValue = await page.locator('#category-select option').first().getAttribute('value');
      if (firstOptionValue) {
        await page.selectOption('#category-select', firstOptionValue);
        await page.waitForTimeout(300);
        await page.click('#btn-start-editing');
        await page.waitForTimeout(1000);
        await page.click('#btn-add-item');
        await page.waitForTimeout(300);
        await page.click('#btn-add-item-type');
        await page.waitForTimeout(500);

        const scanBarcodeBtn = page.locator('#btn-scan-barcode');
        if (await scanBarcodeBtn.isVisible()) {
          await scanBarcodeBtn.click();
          await page.waitForTimeout(1000);

          const zoomInBtn = page.locator('#btn-zoom-in');
          const zoomLevelDisplay = page.locator('#zoom-level-display');

          // Click zoom in button once
          await zoomInBtn.click();
          await page.waitForTimeout(300);

          // Zoom level should increase by 0.5
          const zoomText = await zoomLevelDisplay.textContent();
          expect(zoomText).toContain('1.5');

          // Click zoom in button again
          await zoomInBtn.click();
          await page.waitForTimeout(300);

          const zoomText2 = await zoomLevelDisplay.textContent();
          expect(zoomText2).toContain('2.0');
        }
      }
    }
  });

  test('should decrease zoom level when clicking zoom out button', async ({ page, context }) => {
    await context.grantPermissions(['camera']);

    if (!fs.existsSync(exampleFilePath)) {
      test.skip();
      return;
    }

    const fileInput = page.locator('#file-input');
    await fileInput.setInputFiles(exampleFilePath);
    await page.waitForTimeout(2000);

    await page.click('#btn-next-category');
    await page.waitForTimeout(500);

    const categoryOptions = await page.locator('#category-select option').count();
    if (categoryOptions > 0) {
      const firstOptionValue = await page.locator('#category-select option').first().getAttribute('value');
      if (firstOptionValue) {
        await page.selectOption('#category-select', firstOptionValue);
        await page.waitForTimeout(300);
        await page.click('#btn-start-editing');
        await page.waitForTimeout(1000);
        await page.click('#btn-add-item');
        await page.waitForTimeout(300);
        await page.click('#btn-add-item-type');
        await page.waitForTimeout(500);

        const scanBarcodeBtn = page.locator('#btn-scan-barcode');
        if (await scanBarcodeBtn.isVisible()) {
          await scanBarcodeBtn.click();
          await page.waitForTimeout(1000);

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
          await page.waitForTimeout(300);

          zoomText = await zoomLevelDisplay.textContent();
          expect(zoomText).toContain('1.5');

          // Zoom out again
          await zoomOutBtn.click();
          await page.waitForTimeout(300);

          zoomText = await zoomLevelDisplay.textContent();
          expect(zoomText).toContain('1.0');
        }
      }
    }
  });

  test('should not allow zoom level below 1.0', async ({ page, context }) => {
    await context.grantPermissions(['camera']);

    if (!fs.existsSync(exampleFilePath)) {
      test.skip();
      return;
    }

    const fileInput = page.locator('#file-input');
    await fileInput.setInputFiles(exampleFilePath);
    await page.waitForTimeout(2000);

    await page.click('#btn-next-category');
    await page.waitForTimeout(500);

    const categoryOptions = await page.locator('#category-select option').count();
    if (categoryOptions > 0) {
      const firstOptionValue = await page.locator('#category-select option').first().getAttribute('value');
      if (firstOptionValue) {
        await page.selectOption('#category-select', firstOptionValue);
        await page.waitForTimeout(300);
        await page.click('#btn-start-editing');
        await page.waitForTimeout(1000);
        await page.click('#btn-add-item');
        await page.waitForTimeout(300);
        await page.click('#btn-add-item-type');
        await page.waitForTimeout(500);

        const scanBarcodeBtn = page.locator('#btn-scan-barcode');
        if (await scanBarcodeBtn.isVisible()) {
          await scanBarcodeBtn.click();
          await page.waitForTimeout(1000);

          const zoomOutBtn = page.locator('#btn-zoom-out');
          const zoomLevelDisplay = page.locator('#zoom-level-display');

          // Zoom level starts at 1.0
          let zoomText = await zoomLevelDisplay.textContent();
          expect(zoomText).toContain('1.0');

          // Try to zoom out below 1.0
          await zoomOutBtn.click();
          await page.waitForTimeout(300);

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

    if (!fs.existsSync(exampleFilePath)) {
      test.skip();
      return;
    }

    const fileInput = page.locator('#file-input');
    await fileInput.setInputFiles(exampleFilePath);
    await page.waitForTimeout(2000);

    await page.click('#btn-next-category');
    await page.waitForTimeout(500);

    const categoryOptions = await page.locator('#category-select option').count();
    if (categoryOptions > 0) {
      const firstOptionValue = await page.locator('#category-select option').first().getAttribute('value');
      if (firstOptionValue) {
        await page.selectOption('#category-select', firstOptionValue);
        await page.waitForTimeout(300);
        await page.click('#btn-start-editing');
        await page.waitForTimeout(1000);
        await page.click('#btn-add-item');
        await page.waitForTimeout(300);
        await page.click('#btn-add-item-type');
        await page.waitForTimeout(500);

        const scanBarcodeBtn = page.locator('#btn-scan-barcode');
        if (await scanBarcodeBtn.isVisible()) {
          // Open scanner first time
          await scanBarcodeBtn.click();
          await page.waitForTimeout(1000);

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
          await page.waitForTimeout(500);

          // Open scanner again
          await scanBarcodeBtn.click();
          await page.waitForTimeout(1000);

          // Zoom level should still be 2.0x
          zoomText = await zoomLevelDisplay.textContent();
          expect(zoomText).toContain('2.0');
        }
      }
    }
  });

  test('zoom level should persist after page reload', async ({ page, context }) => {
    await context.grantPermissions(['camera']);

    if (!fs.existsSync(exampleFilePath)) {
      test.skip();
      return;
    }

    const fileInput = page.locator('#file-input');
    await fileInput.setInputFiles(exampleFilePath);
    await page.waitForTimeout(2000);

    await page.click('#btn-next-category');
    await page.waitForTimeout(500);

    const categoryOptions = await page.locator('#category-select option').count();
    if (categoryOptions > 0) {
      const firstOptionValue = await page.locator('#category-select option').first().getAttribute('value');
      if (firstOptionValue) {
        await page.selectOption('#category-select', firstOptionValue);
        await page.waitForTimeout(300);
        await page.click('#btn-start-editing');
        await page.waitForTimeout(1000);
        await page.click('#btn-add-item');
        await page.waitForTimeout(300);
        await page.click('#btn-add-item-type');
        await page.waitForTimeout(500);

        const scanBarcodeBtn = page.locator('#btn-scan-barcode');
        if (await scanBarcodeBtn.isVisible()) {
          await scanBarcodeBtn.click();
          await page.waitForTimeout(1000);

          const zoomInBtn = page.locator('#btn-zoom-in');

          // Set zoom to 1.5x
          await zoomInBtn.click();
          await page.waitForTimeout(300);

          // Close scanner
          const closeBtn = page.locator('#btn-close-scanner');
          await closeBtn.click();
          await page.waitForTimeout(500);

          // Reload the page
          await page.reload({ waitUntil: 'networkidle' });
          await page.waitForTimeout(2000);

          // Navigate back to scanner
          await page.click('#btn-next-category');
          await page.waitForTimeout(500);

          await page.selectOption('#category-select', firstOptionValue);
          await page.waitForTimeout(300);
          await page.click('#btn-start-editing');
          await page.waitForTimeout(1000);
          await page.click('#btn-add-item');
          await page.waitForTimeout(300);
          await page.click('#btn-add-item-type');
          await page.waitForTimeout(500);

          const scanBarcodeBtnAfterReload = page.locator('#btn-scan-barcode');
          if (await scanBarcodeBtnAfterReload.isVisible()) {
            await scanBarcodeBtnAfterReload.click();
            await page.waitForTimeout(1000);

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
