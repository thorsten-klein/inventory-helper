const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

test.describe('Rescan Modal Zoom Controls', () => {
  const exampleFilePath = path.join(__dirname, '..', 'example', 'example.xlsx');

  test.beforeEach(async ({ page, context }) => {
    // Clear localStorage before each test
    await context.clearCookies();
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.evaluate(() => localStorage.clear());
    await page.waitForTimeout(1000);
  });

  test('should display zoom controls in rescan modal', async ({ page, context }) => {
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

        // Click full rescan button
        await page.click('#btn-full-rescan');
        await page.waitForTimeout(500);

        // Fill in shelf to enable camera
        await page.fill('#rescan-shelf', 'TestShelf');
        await page.waitForTimeout(1000); // Wait for camera to start

        // Check if zoom controls exist
        const zoomControls = page.locator('.rescan-zoom-controls');
        await expect(zoomControls).toBeVisible();

        // Check for zoom out button
        const zoomOutButton = page.locator('#btn-rescan-zoom-out');
        await expect(zoomOutButton).toBeVisible();

        // Check for zoom level display
        const zoomLevelDisplay = page.locator('#rescan-zoom-level-display');
        await expect(zoomLevelDisplay).toBeVisible();
        await expect(zoomLevelDisplay).toHaveText('1.0x');

        // Check for zoom in button
        const zoomInButton = page.locator('#btn-rescan-zoom-in');
        await expect(zoomInButton).toBeVisible();
      }
    }
  });

  test('should increase zoom level when clicking zoom in button', async ({ page, context }) => {
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

        // Click full rescan button
        await page.click('#btn-full-rescan');
        await page.waitForTimeout(500);

        // Fill in shelf
        await page.fill('#rescan-shelf', 'TestShelf');
        await page.waitForTimeout(1000);

        // Get initial zoom level
        const zoomLevelDisplay = page.locator('#rescan-zoom-level-display');
        await expect(zoomLevelDisplay).toHaveText('1.0x');

        // Click zoom in button once
        const zoomInButton = page.locator('#btn-rescan-zoom-in');
        await zoomInButton.click();
        await page.waitForTimeout(500);

        // Verify zoom increased
        const zoomText = await zoomLevelDisplay.textContent();
        expect(zoomText).toBe('1.5x');

        // Click zoom in button again
        await zoomInButton.click();
        await page.waitForTimeout(500);

        // Verify zoom increased again
        const zoomText2 = await zoomLevelDisplay.textContent();
        expect(zoomText2).toBe('2.0x');
      }
    }
  });

  test('should decrease zoom level when clicking zoom out button', async ({ page, context }) => {
    // Grant camera permissions
    await context.grantPermissions(['camera']);

    // Skip if example file doesn't exist
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
        await page.waitForTimeout(1000);

        // First zoom in twice
        const zoomInButton = page.locator('#btn-rescan-zoom-in');
        await zoomInButton.click();
        await page.waitForTimeout(300);
        await zoomInButton.click();
        await page.waitForTimeout(300);

        const zoomLevelDisplay = page.locator('#rescan-zoom-level-display');
        await expect(zoomLevelDisplay).toHaveText('2.0x');

        // Then zoom out
        const zoomOutButton = page.locator('#btn-rescan-zoom-out');
        await zoomOutButton.click();
        await page.waitForTimeout(300);

        // Zoom should have decreased to 1.5x
        await expect(zoomLevelDisplay).toHaveText('1.5x');
      }
    }
  });

  test('should disable zoom out button at minimum zoom', async ({ page, context }) => {
    // Grant camera permissions
    await context.grantPermissions(['camera']);

    // Skip if example file doesn't exist
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
        await page.waitForTimeout(1000);

        // Zoom out button should be disabled at 1.0x
        const zoomOutButton = page.locator('#btn-rescan-zoom-out');
        await expect(zoomOutButton).toBeDisabled();
      }
    }
  });
});
