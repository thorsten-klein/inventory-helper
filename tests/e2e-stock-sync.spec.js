const { test, expect } = require('@playwright/test');
const { setupEditor } = require('./helpers');
const path = require('path');
const fs = require('fs');

test.describe('Stock Synchronization for Duplicate EANs', () => {
  const exampleFilePath = path.join(__dirname, '..', 'example', 'example.xlsx');

  test.beforeEach(async ({ page, context }) => {
    await setupEditor(page, context);
  });

  test('BUG REPRODUCTION: duplicate EANs should share the same stock count', async ({ page }) => {
    // This test reproduces the bug where two items with the same EAN
    // don't synchronize their stock counts

    expect(fs.existsSync(exampleFilePath)).toBeTruthy();

    // Upload file and navigate to editor
    const fileInput = page.locator('#file-input');
    await fileInput.setInputFiles(exampleFilePath);
    // Removed 2000ms timeout - handled by helpers

    await page.click('#btn-next-category');
    // Removed 500ms timeout

    const categoryOptions = await page.locator('#category-select option').count();
    if (categoryOptions > 0) {
      const firstOptionValue = await page.locator('#category-select option').first().getAttribute('value');
      if (firstOptionValue) {
        await page.selectOption('#category-select', firstOptionValue);
        // Removed 300ms timeout

        await page.click('#btn-start-editing');
        // Removed 1000ms timeout

        // Add two items with the same EAN in different locations
        const duplicateEAN = '1234567890123';

        await page.evaluate((ean) => {
          // Add first item
          const item1 = {
            id: 'test-item-1',
            category: appState.selectedCategory,
            ean: ean,
            shelf: 'A',
            row: 1,
            position: 1,
            article: 'TEST001',
            stock: 2,
            locked: false,
            removed: false,
            originalShelf: 'A',
            originalRow: 1,
            originalPosition: 1,
            _rawRow: [],
            _rowIndex: -1
          };

          // Add second item with same EAN but different location
          const item2 = {
            id: 'test-item-2',
            category: appState.selectedCategory,
            ean: ean,
            shelf: 'B',
            row: 2,
            position: 1,
            article: 'TEST001',
            stock: 2,
            locked: false,
            removed: false,
            originalShelf: 'B',
            originalRow: 2,
            originalPosition: 1,
            _rawRow: [],
            _rowIndex: -1
          };

          appState.items.push(item1, item2);
          renderEditorScreen();
        }, duplicateEAN);

        // Removed 500ms timeout

        // Start review
        await page.click('#btn-start-review');
        // Removed 1000ms timeout

        // We should be on review screen
        await expect(page.locator('#review-screen')).not.toHaveClass(/hidden/);

        // Check initial stock for first item
        const firstItemStock = await page.locator('#review-stock').textContent();
        expect(firstItemStock).toBe('2');

        // Increase stock to 5
        await page.click('#btn-stock-plus');
        await page.click('#btn-stock-plus');
        await page.click('#btn-stock-plus');

        // Wait for stock to update to 5
        await page.waitForFunction(
          () => document.getElementById('review-stock')?.textContent === '5',
          { timeout: 2000 }
        );

        // Verify first item now shows 5
        const updatedStock = await page.locator('#review-stock').textContent();
        expect(updatedStock).toBe('5');

        // Navigate to next item (which has the same EAN)
        await page.click('#btn-review-next');
        // Removed 500ms timeout

        // EXPECTED: Second item should also show stock of 5 (synced)
        // ACTUAL (before fix): Second item shows stock of 2 (not synced) - BUG!
        const secondItemStock = await page.locator('#review-stock').textContent();

        // This is the assertion that will fail before the fix
        expect(secondItemStock).toBe('5');
      }
    }
  });

  test('changing stock on one duplicate should update all duplicates', async ({ page }) => {
    expect(fs.existsSync(exampleFilePath)).toBeTruthy();

    const fileInput = page.locator('#file-input');
    await fileInput.setInputFiles(exampleFilePath);
    // Removed 2000ms timeout - handled by helpers

    await page.click('#btn-next-category');
    // Removed 500ms timeout

    const categoryOptions = await page.locator('#category-select option').count();
    if (categoryOptions > 0) {
      const firstOptionValue = await page.locator('#category-select option').first().getAttribute('value');
      if (firstOptionValue) {
        await page.selectOption('#category-select', firstOptionValue);
        // Removed 300ms timeout

        await page.click('#btn-start-editing');
        // Removed 1000ms timeout

        // Add three items with the same EAN in different locations
        const sharedEAN = '9999999999999';

        await page.evaluate((ean) => {
          const item1 = {
            id: 'dup-item-1',
            category: appState.selectedCategory,
            ean: ean,
            shelf: 'A',
            row: 1,
            position: 1,
            article: 'SHARED',
            stock: 10,
            locked: false,
            removed: false,
            originalShelf: 'A',
            originalRow: 1,
            originalPosition: 1,
            _rawRow: [],
            _rowIndex: -1
          };

          const item2 = {
            id: 'dup-item-2',
            category: appState.selectedCategory,
            ean: ean,
            shelf: 'A',
            row: 1,
            position: 2,
            article: 'SHARED',
            stock: 10,
            locked: false,
            removed: false,
            originalShelf: 'A',
            originalRow: 1,
            originalPosition: 2,
            _rawRow: [],
            _rowIndex: -1
          };

          const item3 = {
            id: 'dup-item-3',
            category: appState.selectedCategory,
            ean: ean,
            shelf: 'C',
            row: 3,
            position: 1,
            article: 'SHARED',
            stock: 10,
            locked: false,
            removed: false,
            originalShelf: 'C',
            originalRow: 3,
            originalPosition: 1,
            _rawRow: [],
            _rowIndex: -1
          };

          appState.items.push(item1, item2, item3);
          renderEditorScreen();
        }, sharedEAN);

        // Removed 500ms timeout

        await page.click('#btn-start-review');
        // Removed 1000ms timeout

        // Set stock to 7 on first item
        await page.click('#btn-stock-minus');
        await page.click('#btn-stock-minus');
        await page.click('#btn-stock-minus');

        // Wait for stock to update to 7
        await page.waitForFunction(
          () => document.getElementById('review-stock')?.textContent === '7',
          { timeout: 2000 }
        );

        const firstStock = await page.locator('#review-stock').textContent();
        expect(firstStock).toBe('7');

        // Check second item (same EAN)
        await page.click('#btn-review-next');
        // Removed 300ms timeout

        const secondStock = await page.locator('#review-stock').textContent();
        expect(secondStock).toBe('7');

        // Check third item (same EAN)
        await page.click('#btn-review-next');
        // Removed 300ms timeout

        const thirdStock = await page.locator('#review-stock').textContent();
        expect(thirdStock).toBe('7');
      }
    }
  });

  test('stock sync should work when navigating backwards', async ({ page }) => {
    expect(fs.existsSync(exampleFilePath)).toBeTruthy();

    const fileInput = page.locator('#file-input');
    await fileInput.setInputFiles(exampleFilePath);
    // Removed 2000ms timeout - handled by helpers

    await page.click('#btn-next-category');
    // Removed 500ms timeout

    const categoryOptions = await page.locator('#category-select option').count();
    if (categoryOptions > 0) {
      const firstOptionValue = await page.locator('#category-select option').first().getAttribute('value');
      if (firstOptionValue) {
        await page.selectOption('#category-select', firstOptionValue);
        // Removed 300ms timeout

        await page.click('#btn-start-editing');
        // Removed 1000ms timeout

        const duplicateEAN = '5555555555555';

        await page.evaluate((ean) => {
          const item1 = {
            id: 'back-item-1',
            category: appState.selectedCategory,
            ean: ean,
            shelf: 'X',
            row: 1,
            position: 1,
            article: 'BACK001',
            stock: 3,
            locked: false,
            removed: false,
            originalShelf: 'X',
            originalRow: 1,
            originalPosition: 1,
            _rawRow: [],
            _rowIndex: -1
          };

          const item2 = {
            id: 'back-item-2',
            category: appState.selectedCategory,
            ean: ean,
            shelf: 'Y',
            row: 1,
            position: 1,
            article: 'BACK001',
            stock: 3,
            locked: false,
            removed: false,
            originalShelf: 'Y',
            originalRow: 1,
            originalPosition: 1,
            _rawRow: [],
            _rowIndex: -1
          };

          appState.items.push(item1, item2);
          renderEditorScreen();
        }, duplicateEAN);

        // Removed 500ms timeout

        await page.click('#btn-start-review');
        // Removed 1000ms timeout

        // Go to second item
        await page.click('#btn-review-next');
        // Removed 300ms timeout

        // Change stock on second item
        await page.click('#btn-stock-plus');
        await page.click('#btn-stock-plus');

        // Wait for stock to update to 5
        await page.waitForFunction(
          () => document.getElementById('review-stock')?.textContent === '5',
          { timeout: 2000 }
        );

        const secondItemStock = await page.locator('#review-stock').textContent();
        expect(secondItemStock).toBe('5');

        // Navigate back to first item
        await page.click('#btn-review-prev');
        // Removed 300ms timeout

        // First item should also show 5
        const firstItemStock = await page.locator('#review-stock').textContent();
        expect(firstItemStock).toBe('5');
      }
    }
  });
});
