const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

test.describe('Zoom Canvas Fixed Size', () => {
  const exampleFilePath = path.join(__dirname, '..', 'example', 'example.xlsx');

  test.beforeEach(async ({ page, context }) => {
    await context.clearCookies();
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => localStorage.clear());
    await page.waitForTimeout(500);
  });

  test('rescan canvas should maintain fixed display size when zooming', async ({ page, context }) => {
    await context.grantPermissions(['camera']);

    if (!fs.existsSync(exampleFilePath)) {
      test.skip();
      return;
    }

    // Upload file and navigate to editor
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

        // Open rescan modal
        await page.click('#btn-full-rescan');
        await page.waitForTimeout(500);
        await page.fill('#rescan-shelf', 'TestShelf');
        await page.waitForTimeout(1500); // Wait for camera to start

        // Get initial video dimensions
        const video = page.locator('#rescan-video');
        const videoBox = await video.boundingBox();

        console.log('Initial video dimensions:', videoBox);

        // Zoom in to 2.0x
        const zoomInButton = page.locator('#btn-rescan-zoom-in');
        await zoomInButton.click();
        await page.waitForTimeout(500);
        await zoomInButton.click();
        await page.waitForTimeout(500);

        // Verify zoom level is 2.0x
        const zoomLevelDisplay = page.locator('#rescan-zoom-level-display');
        await expect(zoomLevelDisplay).toHaveText('2.0x');

        // Get canvas dimensions when zoomed
        const canvas = page.locator('#rescan-canvas');
        const canvasBox = await canvas.boundingBox();
        const canvasDimensions = await canvas.evaluate(el => ({
          width: el.width,
          height: el.height,
          displayWidth: el.getBoundingClientRect().width,
          displayHeight: el.getBoundingClientRect().height
        }));

        console.log('Canvas dimensions at 2.0x zoom:', canvasBox);
        console.log('Canvas intrinsic size:', canvasDimensions);

        // Get video intrinsic dimensions for comparison
        const videoDimensions = await video.evaluate(el => ({
          width: el.videoWidth,
          height: el.videoHeight
        }));
        console.log('Video intrinsic size:', videoDimensions);

        // Canvas intrinsic size should stay close to video size (not shrink with zoom)
        // At 2x zoom, if we're cropping, canvas.width would be videoWidth/2
        // But we want it to stay at videoWidth
        const intrinsicWidthRatio = canvasDimensions.width / videoDimensions.width;
        const intrinsicHeightRatio = canvasDimensions.height / videoDimensions.height;

        console.log('Intrinsic size ratio:', intrinsicWidthRatio, intrinsicHeightRatio);

        // Canvas intrinsic dimensions should be close to video dimensions (0.9 to 1.1 range)
        expect(intrinsicWidthRatio).toBeGreaterThan(0.9);
        expect(intrinsicWidthRatio).toBeLessThan(1.1);
        expect(intrinsicHeightRatio).toBeGreaterThan(0.9);
        expect(intrinsicHeightRatio).toBeLessThan(1.1);

        // Canvas display size should match original video size (approximately)
        // Allow 5% tolerance for rounding
        const widthDiff = Math.abs(canvasBox.width - videoBox.width);
        const heightDiff = Math.abs(canvasBox.height - videoBox.height);
        const tolerance = videoBox.width * 0.05;

        expect(widthDiff).toBeLessThan(tolerance);
        expect(heightDiff).toBeLessThan(tolerance);

        // Zoom in more to 3.0x
        await zoomInButton.click();
        await page.waitForTimeout(500);
        await expect(zoomLevelDisplay).toHaveText('3.0x');

        // Get canvas dimensions at higher zoom
        const canvasBox3x = await canvas.boundingBox();
        console.log('Canvas dimensions at 3.0x zoom:', canvasBox3x);

        // Canvas should still be same size
        const widthDiff3x = Math.abs(canvasBox3x.width - videoBox.width);
        const heightDiff3x = Math.abs(canvasBox3x.height - videoBox.height);

        expect(widthDiff3x).toBeLessThan(tolerance);
        expect(heightDiff3x).toBeLessThan(tolerance);

        // Zoom back to 1.0x
        const zoomOutButton = page.locator('#btn-rescan-zoom-out');
        await zoomOutButton.click();
        await page.waitForTimeout(300);
        await zoomOutButton.click();
        await page.waitForTimeout(300);
        await zoomOutButton.click();
        await page.waitForTimeout(300);

        // Video should be visible again, canvas hidden
        await expect(video).toBeVisible();
        const canvasVisible = await canvas.evaluate(el => {
          return window.getComputedStyle(el).display !== 'none';
        });
        expect(canvasVisible).toBe(false);
      }
    }
  });

  test('barcode scanner canvas should maintain fixed display size when zooming', async ({ page, context }) => {
    await context.grantPermissions(['camera']);

    if (!fs.existsSync(exampleFilePath)) {
      test.skip();
      return;
    }

    // Upload file and navigate to editor
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

        // Click Add Item button
        await page.click('#btn-add-item');
        await page.waitForTimeout(300);

        // Select "Add item" type
        const btnAddItemType = page.locator('#btn-add-item-type');
        if (await btnAddItemType.isVisible()) {
          await btnAddItemType.click();
          await page.waitForTimeout(300);
        }

        // Click scan barcode button
        await page.click('#btn-scan-barcode');
        await page.waitForTimeout(1500);

        // Get initial video dimensions
        const video = page.locator('#barcode-scanner-video');
        const videoBox = await video.boundingBox();

        console.log('Scanner initial video dimensions:', videoBox);

        // Zoom in to 2.0x
        const zoomInButton = page.locator('#btn-zoom-in');
        await zoomInButton.click();
        await page.waitForTimeout(500);
        await zoomInButton.click();
        await page.waitForTimeout(500);

        // Get canvas dimensions when zoomed
        const canvas = page.locator('#barcode-scanner-canvas');
        const canvasBox = await canvas.boundingBox();

        console.log('Scanner canvas dimensions at 2.0x zoom:', canvasBox);

        // Canvas display size should match original video size
        const widthDiff = Math.abs(canvasBox.width - videoBox.width);
        const heightDiff = Math.abs(canvasBox.height - videoBox.height);
        const tolerance = videoBox.width * 0.05;

        expect(widthDiff).toBeLessThan(tolerance);
        expect(heightDiff).toBeLessThan(tolerance);
      }
    }
  });
});
