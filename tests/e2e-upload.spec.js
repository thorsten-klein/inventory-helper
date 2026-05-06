const { test, expect } = require('@playwright/test');
const path = require('path');

test.describe('Upload Screen', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display upload screen on initial load', async ({ page }) => {
    await expect(page.locator('#upload-screen')).toBeVisible();
    await expect(page.locator('#upload-title')).toContainText('Stock Inventory Review');
  });

  test('should show language selector with EN and DE options', async ({ page }) => {
    await expect(page.locator('#lang-en')).toBeVisible();
    await expect(page.locator('#lang-de')).toBeVisible();
  });

  test('should toggle language when clicking language buttons', async ({ page }) => {
    // Click German flag
    await page.click('#lang-de');

    // Check if title changed to German
    const titleDE = await page.locator('#upload-title').textContent();
    expect(titleDE).toBeTruthy();

    // Click English flag
    await page.click('#lang-en');

    // Check if title changed to English
    await expect(page.locator('#upload-title')).toContainText('Stock Inventory Review');
  });

  test('should have file input for XLSX files', async ({ page }) => {
    const fileInput = page.locator('#file-input');
    await expect(fileInput).toHaveAttribute('accept', '.xlsx,.xls');
    await expect(fileInput).toHaveAttribute('type', 'file');
  });

  test('should show info box with example file link', async ({ page }) => {
    await expect(page.locator('.info-box')).toBeVisible();
    await expect(page.locator('#info-box-link')).toBeVisible();

    const href = await page.locator('#info-box-link').getAttribute('href');
    expect(href).toContain('example.xlsx');
  });

  test('should hide Next button initially', async ({ page }) => {
    const nextButton = page.locator('#btn-next-category');
    await expect(nextButton).toHaveClass(/hidden/);
  });

  test('should hide config section initially', async ({ page }) => {
    const configSection = page.locator('#config-section');
    await expect(configSection).toHaveClass(/hidden/);
  });

  test('should upload and process XLSX file', async ({ page }) => {
    const exampleFilePath = path.join(__dirname, '..', 'example', 'example.xlsx');

    // Check if example file exists
    const fs = require('fs');
    if (!fs.existsSync(exampleFilePath)) {
      test.skip('Example file not found');
      return;
    }

    // Wait for XLSX library to load
    await page.waitForFunction(() => typeof XLSX !== 'undefined', { timeout: 10000 });
    await page.waitForTimeout(500);

    // Upload file
    const fileInput = page.locator('#file-input');
    await fileInput.setInputFiles(exampleFilePath);

    // Wait for file to be processed (wait for Next button to appear)
    const nextButton = page.locator('#btn-next-category');
    await expect(nextButton).not.toHaveClass(/hidden/, { timeout: 10000 });

    // Check if config section becomes visible
    const configSection = page.locator('#config-section');
    await expect(configSection).not.toHaveClass(/hidden/);
  });

  test('should show column configuration dropdowns', async ({ page }) => {
    await expect(page.locator('#col-category')).toBeAttached();
    await expect(page.locator('#col-ean')).toBeAttached();
    await expect(page.locator('#col-shelf')).toBeAttached();
    await expect(page.locator('#col-row')).toBeAttached();
    await expect(page.locator('#col-position')).toBeAttached();
    await expect(page.locator('#col-article')).toBeAttached();
    await expect(page.locator('#col-stock')).toBeAttached();
    await expect(page.locator('#col-display-item')).toBeAttached();
  });
});
