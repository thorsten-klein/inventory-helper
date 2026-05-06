const { test, expect } = require('@playwright/test');
const {
  setupApp,
  uploadExampleFile,
  navigateToCategory,
  navigateToEditor,
  navigateToReview,
} = require('./helpers');

test.describe('Integration Tests with Example File', () => {
  test.beforeEach(async ({ page, context }) => {
    await setupApp(page, context);
  });

  test('should load and process example.xlsx file end-to-end', async ({ page }) => {
    // Upload the example file
    await uploadExampleFile(page);

    // Verify config section appears
    await expect(page.locator('#config-section')).not.toHaveClass(/hidden/);

    // Verify Next button appears
    await expect(page.locator('#btn-next-category')).not.toHaveClass(/hidden/);

    // Check that column selects are populated
    const categoryOptions = await page.locator('#col-category option').count();
    expect(categoryOptions).toBeGreaterThan(0);

    // Navigate to category screen
    await navigateToCategory(page);

    // Verify category screen is visible
    await expect(page.locator('#category-screen')).not.toHaveClass(/hidden/);
    await expect(page.locator('#upload-screen')).toHaveClass(/hidden/);

    // Check if category select is populated
    const categorySelect = page.locator('#category-select');
    const categories = await categorySelect.locator('option').count();
    expect(categories).toBeGreaterThan(0);
  });

  test('should navigate through complete workflow', async ({ page }) => {
    // 1. Upload screen - upload file
    await uploadExampleFile(page);

    // 2. Navigate to category screen
    await navigateToCategory(page);

    // Verify category screen is visible
    await expect(page.locator('#category-screen')).not.toHaveClass(/hidden/);

    // Check for additional functionalities buttons
    await expect(page.locator('#btn-show-duplicates')).toBeVisible();
    await expect(page.locator('#btn-search-article')).toBeVisible();

    // 3. Navigate to editor screen
    await navigateToEditor(page, 0);

    // Verify editor screen is visible
    await expect(page.locator('#editor-screen')).toBeVisible();

    // Check for editor controls
    await expect(page.locator('#btn-add-item')).toBeVisible();
    await expect(page.locator('#btn-undo')).toBeVisible();
    await expect(page.locator('#btn-redo')).toBeVisible();

    // Check for items list
    await expect(page.locator('#items-list')).toBeVisible();

    // Go back to category screen
    await page.click('#btn-back-category');

    // Wait for navigation
    await page.waitForSelector('#category-screen:not(.hidden)', { timeout: 5000 });

    await expect(page.locator('#category-screen')).not.toHaveClass(/hidden/);
    await expect(page.locator('#editor-screen')).toHaveClass(/hidden/);

    // Go back to upload screen
    await page.click('#btn-back-upload');

    // Wait for navigation
    await page.waitForSelector('#upload-screen:not(.hidden)', { timeout: 5000 });

    await expect(page.locator('#upload-screen')).not.toHaveClass(/hidden/);
    await expect(page.locator('#category-screen')).toHaveClass(/hidden/);
  });

  test('should show duplicates modal when clicking Show Duplicates', async ({ page }) => {
    // Upload and navigate to category screen
    await uploadExampleFile(page);
    await navigateToCategory(page);

    // Click Show Duplicates button
    await page.click('#btn-show-duplicates');

    // Wait for modal to be visible
    await page.waitForSelector('#duplicates-modal:not(.hidden)', { timeout: 5000 });

    // Modal should be visible
    await expect(page.locator('#duplicates-modal')).not.toHaveClass(/hidden/);

    // Should have title
    await expect(page.locator('#duplicates-modal-title')).toBeVisible();

    // Close modal
    await page.click('#btn-close-duplicates');

    // Wait for modal to close
    await page.waitForFunction(
      () => document.querySelector('#duplicates-modal')?.classList.contains('hidden'),
      { timeout: 5000 }
    );

    await expect(page.locator('#duplicates-modal')).toHaveClass(/hidden/);
  });

  test('should show search modal when clicking Search Article', async ({ page }) => {
    // Upload and navigate to category screen
    await uploadExampleFile(page);
    await navigateToCategory(page);

    // Click Search Article button
    await page.click('#btn-search-article');

    // Wait for modal to be visible
    await page.waitForSelector('#search-modal:not(.hidden)', { timeout: 5000 });

    // Modal should be visible
    await expect(page.locator('#search-modal')).not.toHaveClass(/hidden/);

    // Should have search input
    await expect(page.locator('#search-input')).toBeVisible();

    // Should have search button
    await expect(page.locator('#btn-search-execute')).toBeVisible();

    // Close modal
    await page.click('#btn-close-search');

    // Wait for modal to close
    await page.waitForFunction(
      () => document.querySelector('#search-modal')?.classList.contains('hidden'),
      { timeout: 5000 }
    );

    await expect(page.locator('#search-modal')).toHaveClass(/hidden/);
  });
});
