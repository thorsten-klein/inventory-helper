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

  test('should have translations object defined', async ({ page }) => {
    const hasTranslations = await page.evaluate(() => {
      return typeof translations !== 'undefined' &&
             translations.en !== undefined &&
             translations.de !== undefined;
    });

    expect(hasTranslations).toBe(true);
  });
});
