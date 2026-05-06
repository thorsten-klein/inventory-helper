const { test, expect } = require('@playwright/test');
const { setupApp } = require('./helpers');

test.describe('Application State', () => {
  test.beforeEach(async ({ page, context }) => {
    await setupApp(page, context);
  });

  test('should initialize appState with default values', async ({ page }) => {
    const state = await page.evaluate(() => {
      return {
        uploadedData: appState.uploadedData,
        currentLanguage: appState.currentLanguage,
        selectedCategory: appState.selectedCategory,
        reviewInProgress: appState.reviewInProgress,
      };
    });

    expect(state.uploadedData).toBeNull();
    expect(state.currentLanguage).toBe('en');
    expect(state.selectedCategory).toBeNull();
    expect(state.reviewInProgress).toBe(false);
  });

  test('should have correct default column mapping', async ({ page }) => {
    const columnMapping = await page.evaluate(() => appState.columnMapping);

    expect(columnMapping).toEqual({
      category: 'F',
      ean: 'C',
      shelf: 'G',
      row: 'D',
      position: 'E',
      article: 'I',
      stock: 'S',
      displayItem: 'V',
    });
  });

  test('should initialize empty arrays', async ({ page }) => {
    const arrays = await page.evaluate(() => {
      return {
        categories: appState.categories,
        items: appState.items,
        originalItems: appState.originalItems,
        reviewItems: appState.reviewItems,
        customShelves: appState.customShelves,
      };
    });

    expect(arrays.categories).toEqual([]);
    expect(arrays.items).toEqual([]);
    expect(arrays.originalItems).toEqual([]);
    expect(arrays.reviewItems).toEqual([]);
    expect(arrays.customShelves).toEqual([]);
  });

  test('should change language via UI', async ({ page }) => {
    // Click German flag
    await page.click('#lang-de');

    // Wait for language to change in appState
    await page.waitForFunction(
      () => window.appState.currentLanguage === 'de',
      { timeout: 2000 }
    );

    const language = await page.evaluate(() => appState.currentLanguage);
    expect(language).toBe('de');

    // Change back to English
    await page.click('#lang-en');

    // Wait for language to change back
    await page.waitForFunction(
      () => window.appState.currentLanguage === 'en',
      { timeout: 2000 }
    );

    const languageEn = await page.evaluate(() => appState.currentLanguage);
    expect(languageEn).toBe('en');
  });

  test('should have translations object defined', async ({ page }) => {
    const hasTranslations = await page.evaluate(() => {
      return typeof translations !== 'undefined' &&
             translations.en !== undefined &&
             translations.de !== undefined;
    });

    expect(hasTranslations).toBe(true);
  });

  test('should support language switching', async ({ page }) => {
    // Test that language switching works by checking appState
    const initialLang = await page.evaluate(() => appState.currentLanguage);
    expect(initialLang).toBe('en');

    // Click German button
    await page.click('#lang-de');

    // Wait for language to change in appState
    await page.waitForFunction(
      () => window.appState.currentLanguage === 'de',
      { timeout: 2000 }
    );

    const newLang = await page.evaluate(() => appState.currentLanguage);
    expect(newLang).toBe('de');

    // Verify German button is active
    await expect(page.locator('#lang-de')).toHaveClass(/active/);
  });
});
