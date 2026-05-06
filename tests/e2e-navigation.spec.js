const { test, expect } = require('@playwright/test');
const { setupApp } = require('./helpers');

test.describe('Screen Navigation', () => {
  test.beforeEach(async ({ page, context }) => {
    await setupApp(page, context);
  });

  test('should show only upload screen on initial load', async ({ page }) => {
    await expect(page.locator('#upload-screen')).toBeVisible();
    await expect(page.locator('#category-screen')).toHaveClass(/hidden/);
    await expect(page.locator('#editor-screen')).toHaveClass(/hidden/);
    await expect(page.locator('#review-screen')).toHaveClass(/hidden/);
    await expect(page.locator('#report-screen')).toHaveClass(/hidden/);
  });

  test('should have all screen elements present in DOM', async ({ page }) => {
    // All screens should be in the DOM, just hidden
    await expect(page.locator('#upload-screen')).toBeAttached();
    await expect(page.locator('#category-screen')).toBeAttached();
    await expect(page.locator('#editor-screen')).toBeAttached();
    await expect(page.locator('#review-screen')).toBeAttached();
    await expect(page.locator('#report-screen')).toBeAttached();
  });

  test('should have navigation buttons present', async ({ page }) => {
    // Check for key navigation buttons in each screen
    await expect(page.locator('#btn-next-category')).toBeAttached(); // Upload to Category
    await expect(page.locator('#btn-back-upload')).toBeAttached(); // Category to Upload
    await expect(page.locator('#btn-start-editing')).toBeAttached(); // Category to Editor
    await expect(page.locator('#btn-back-category')).toBeAttached(); // Editor to Category
    await expect(page.locator('#btn-start-review')).toBeAttached(); // Editor to Review
  });

  test('should have modals present but hidden', async ({ page }) => {
    const modals = [
      '#add-type-modal',
      '#add-shelf-modal',
      '#edit-modal',
      '#barcode-scanner-modal',
      '#confirm-remove-modal',
      '#item-details-modal',
      '#duplicates-modal',
      '#search-modal',
      '#jump-to-item-modal',
      '#editor-speech-modal',
      '#manual-ean-modal',
      '#rescan-modal',
    ];

    for (const modal of modals) {
      await expect(page.locator(modal)).toHaveClass(/hidden/);
    }
  });
});
