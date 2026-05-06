const { test, expect } = require('@playwright/test');

test.describe('Internationalization (i18n)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    // Give extra time for scripts to initialize
    await page.waitForTimeout(1000);
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
    await page.waitForTimeout(200);

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
    await page.waitForTimeout(100);

    // Get German text
    const deText = await page.locator('#upload-title').textContent();

    // Should be different
    expect(enText).not.toBe(deText);

    // Switch back to English
    await page.click('#lang-en');
    await page.waitForTimeout(100);

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
    await page.waitForTimeout(100);

    // German should now be active
    const deButton = page.locator('#lang-de');
    await expect(deButton).toHaveClass(/active/);

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
    await page.waitForTimeout(200);

    const uploadTitleDe = await page.locator('#upload-title').textContent();
    const fileLabelDe = await page.locator('#file-upload-label').textContent();

    expect(uploadTitleDe).toBeTruthy();
    expect(uploadTitleDe).not.toBe(uploadTitle);
    expect(fileLabelDe).toBeTruthy();
  });
});
