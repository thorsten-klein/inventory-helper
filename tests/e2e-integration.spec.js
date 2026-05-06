const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

test.describe('Integration Tests with Example File', () => {
  const exampleFilePath = path.join(__dirname, '..', 'example', 'example.xlsx');

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for XLSX library to load
    await page.waitForFunction(() => typeof XLSX !== 'undefined', { timeout: 10000 });
    await page.waitForTimeout(500);
  });

  test('should load and process example.xlsx file end-to-end', async ({ page }) => {
    // Verify example file exists
    expect(fs.existsSync(exampleFilePath)).toBeTruthy();

    // Upload the example file
    const fileInput = page.locator('#file-input');
    await fileInput.setInputFiles(exampleFilePath);

    // Wait for processing
    await page.waitForTimeout(2000);

    // Verify config section appears
    await expect(page.locator('#config-section')).not.toHaveClass(/hidden/);

    // Verify Next button appears
    await expect(page.locator('#btn-next-category')).not.toHaveClass(/hidden/);

    // Check that column selects are populated
    const categoryOptions = await page.locator('#col-category option').count();
    expect(categoryOptions).toBeGreaterThan(0);

    // Click Next to go to category screen
    await page.click('#btn-next-category');

    // Wait for category screen to appear
    await expect(page.locator('#category-screen')).not.toHaveClass(/hidden/);
    await expect(page.locator('#upload-screen')).toHaveClass(/hidden/);

    // Check if category select is populated
    const categorySelect = page.locator('#category-select');
    const categories = await categorySelect.locator('option').count();
    expect(categories).toBeGreaterThan(0);
  });

  test('should navigate through complete workflow', async ({ page }) => {
    // Verify example file exists
    expect(fs.existsSync(exampleFilePath)).toBeTruthy();

    // 1. Upload screen - upload file
    const fileInput = page.locator('#file-input');
    await fileInput.setInputFiles(exampleFilePath);
    await page.waitForTimeout(2000);

    await page.click('#btn-next-category');
    await page.waitForTimeout(500);

    // 2. Category screen - should be visible
    await expect(page.locator('#category-screen')).not.toHaveClass(/hidden/);

    // Check for additional functionalities buttons
    await expect(page.locator('#btn-show-duplicates')).toBeVisible();
    await expect(page.locator('#btn-search-article')).toBeVisible();

    // Select first category if available
    const categoryOptions = await page.locator('#category-select option').count();
    if (categoryOptions > 0) {
      // Select the first category
      const firstOptionValue = await page.locator('#category-select option').first().getAttribute('value');
      if (firstOptionValue) {
        await page.selectOption('#category-select', firstOptionValue);
        await page.waitForTimeout(300);

        // Click Start Editing
        await page.click('#btn-start-editing');

        // Wait for editor screen with longer timeout
        await page.waitForTimeout(2000);

        // 3. Editor screen - should be visible
        await expect(page.locator('#editor-screen')).toBeVisible();

        // Check for editor controls
        await expect(page.locator('#btn-add-item')).toBeVisible();
        await expect(page.locator('#btn-undo')).toBeVisible();
        await expect(page.locator('#btn-redo')).toBeVisible();

        // Check for items list
        await expect(page.locator('#items-list')).toBeVisible();

        // Go back to category screen
        await page.click('#btn-back-category');
        await page.waitForTimeout(500);

        await expect(page.locator('#category-screen')).not.toHaveClass(/hidden/);
        await expect(page.locator('#editor-screen')).toHaveClass(/hidden/);
      }
    }

    // Go back to upload screen
    await page.click('#btn-back-upload');
    await page.waitForTimeout(500);

    await expect(page.locator('#upload-screen')).not.toHaveClass(/hidden/);
    await expect(page.locator('#category-screen')).toHaveClass(/hidden/);
  });

  test('should show duplicates modal when clicking Show Duplicates', async ({ page }) => {
    // Verify example file exists
    expect(fs.existsSync(exampleFilePath)).toBeTruthy();

    // Upload and navigate to category screen
    const fileInput = page.locator('#file-input');
    await fileInput.setInputFiles(exampleFilePath);
    await page.waitForTimeout(2000);

    await page.click('#btn-next-category');
    await page.waitForTimeout(500);

    // Click Show Duplicates button
    await page.click('#btn-show-duplicates');
    await page.waitForTimeout(500);

    // Modal should be visible
    await expect(page.locator('#duplicates-modal')).not.toHaveClass(/hidden/);

    // Should have title
    await expect(page.locator('#duplicates-modal-title')).toBeVisible();

    // Close modal
    await page.click('#btn-close-duplicates');
    await page.waitForTimeout(300);

    await expect(page.locator('#duplicates-modal')).toHaveClass(/hidden/);
  });

  test('should show search modal when clicking Search Article', async ({ page }) => {
    // Verify example file exists
    expect(fs.existsSync(exampleFilePath)).toBeTruthy();

    // Upload and navigate to category screen
    const fileInput = page.locator('#file-input');
    await fileInput.setInputFiles(exampleFilePath);
    await page.waitForTimeout(2000);

    await page.click('#btn-next-category');
    await page.waitForTimeout(500);

    // Click Search Article button
    await page.click('#btn-search-article');
    await page.waitForTimeout(500);

    // Modal should be visible
    await expect(page.locator('#search-modal')).not.toHaveClass(/hidden/);

    // Should have search input
    await expect(page.locator('#search-input')).toBeVisible();

    // Should have search button
    await expect(page.locator('#btn-search-execute')).toBeVisible();

    // Close modal
    await page.click('#btn-close-search');
    await page.waitForTimeout(300);

    await expect(page.locator('#search-modal')).toHaveClass(/hidden/);
  });
});
