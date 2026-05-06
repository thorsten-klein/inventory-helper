const { test, expect } = require('@playwright/test');
const { setupApp } = require('./helpers');

test.describe('Internationalization (i18n)', () => {
  test.beforeEach(async ({ page, context }) => {
    await setupApp(page, context);
  });

  test('should default to English language', async ({ page }) => {
    const language = await page.evaluate(() => appState.currentLanguage);
    expect(language).toBe('en');
  });

  test('should have English translations', async ({ page }) => {
    // Check the actual UI text instead of accessing i18n object
    const titleText = await page.locator('#upload-title').textContent();
    expect(titleText).toContain('Stock Inventory Review');
  });

  test('should have German translations', async ({ page }) => {
    // Get initial English text
    const enText = await page.locator('#upload-title').textContent();

    // Click German flag
    await page.click('#lang-de');

    // Wait for text to change
    await page.waitForFunction(
      (originalText) => document.getElementById('upload-title')?.textContent !== originalText,
      enText,
      { timeout: 2000 }
    );

    // Get German text
    const deText = await page.locator('#upload-title').textContent();

    // Should be different from English
    expect(deText).not.toBe(enText);
    expect(deText.length).toBeGreaterThan(0);
  });

  test('should update UI text when language changes', async ({ page }) => {
    // Get initial English text
    const enText = await page.locator('#upload-title').textContent();

    // Switch to German
    await page.click('#lang-de');

    // Wait for text to change to German
    await page.waitForFunction(
      (originalText) => document.getElementById('upload-title')?.textContent !== originalText,
      enText,
      { timeout: 2000 }
    );

    // Get German text
    const deText = await page.locator('#upload-title').textContent();

    // Should be different
    expect(enText).not.toBe(deText);

    // Switch back to English
    await page.click('#lang-en');

    // Wait for text to change back to English
    await page.waitForFunction(
      (germanText) => document.getElementById('upload-title')?.textContent !== germanText,
      deText,
      { timeout: 2000 }
    );

    // Should be back to English
    const enTextAgain = await page.locator('#upload-title').textContent();
    expect(enTextAgain).toBe(enText);
  });

  test('should highlight active language button', async ({ page }) => {
    // English should be active by default
    const enButton = page.locator('#lang-en');
    await expect(enButton).toHaveClass(/active/);

    // Click German
    await page.click('#lang-de');

    // Wait for German button to become active
    const deButton = page.locator('#lang-de');
    await expect(deButton).toHaveClass(/active/, { timeout: 2000 });

    // English should not be active
    await expect(enButton).not.toHaveClass(/active/);
  });

  test('should translate all common UI elements', async ({ page }) => {
    // Just verify that key UI elements have text content
    const uploadTitle = await page.locator('#upload-title').textContent();
    const fileLabel = await page.locator('#file-upload-label').textContent();

    expect(uploadTitle).toBeTruthy();
    expect(uploadTitle.length).toBeGreaterThan(0);
    expect(fileLabel).toBeTruthy();
    expect(fileLabel.length).toBeGreaterThan(0);

    // Switch to German and verify text changes
    await page.click('#lang-de');

    // Wait for text to change
    await page.waitForFunction(
      (originalTitle) => document.getElementById('upload-title')?.textContent !== originalTitle,
      uploadTitle,
      { timeout: 2000 }
    );

    const uploadTitleDe = await page.locator('#upload-title').textContent();
    const fileLabelDe = await page.locator('#file-upload-label').textContent();

    expect(uploadTitleDe).toBeTruthy();
    expect(uploadTitleDe).not.toBe(uploadTitle);
    expect(fileLabelDe).toBeTruthy();
  });
});
