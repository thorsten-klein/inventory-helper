const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

test.describe('Stock Synchronization for Duplicate EANs', () => {
  const exampleFilePath = path.join(__dirname, '..', 'example', 'example.xlsx');

  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
  });

  test('BUG REPRODUCTION: duplicate EANs should share the same stock count', async ({ page }) => {
    // This test reproduces the bug where two items with the same EAN
    // don't synchronize their stock counts

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

        await page.waitForTimeout(500);

        // Start review
        await page.click('#btn-start-review');
        await page.waitForTimeout(1000);

        // We should be on review screen
        await expect(page.locator('#review-screen')).not.toHaveClass(/hidden/);

        // Check initial stock for first item
        const firstItemStock = await page.locator('#review-stock').textContent();
        expect(firstItemStock).toBe('2');

        // Increase stock to 5
        await page.click('#btn-stock-plus');
        await page.click('#btn-stock-plus');
        await page.click('#btn-stock-plus');
        await page.waitForTimeout(200);

        // Verify first item now shows 5
        const updatedStock = await page.locator('#review-stock').textContent();
        expect(updatedStock).toBe('5');

        // Navigate to next item (which has the same EAN)
        await page.click('#btn-review-next');
        await page.waitForTimeout(500);

        // EXPECTED: Second item should also show stock of 5 (synced)
        // ACTUAL (before fix): Second item shows stock of 2 (not synced) - BUG!
        const secondItemStock = await page.locator('#review-stock').textContent();

        // This is the assertion that will fail before the fix
        expect(secondItemStock).toBe('5');
      }
    }
  });

  test('changing stock on one duplicate should update all duplicates', async ({ page }) => {
    if (!fs.existsSync(exampleFilePath)) {
      test.skip();
      return;
    }

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

        await page.waitForTimeout(500);

        await page.click('#btn-start-review');
        await page.waitForTimeout(1000);

        // Set stock to 7 on first item
        await page.click('#btn-stock-minus');
        await page.click('#btn-stock-minus');
        await page.click('#btn-stock-minus');
        await page.waitForTimeout(200);

        const firstStock = await page.locator('#review-stock').textContent();
        expect(firstStock).toBe('7');

        // Check second item (same EAN)
        await page.click('#btn-review-next');
        await page.waitForTimeout(300);

        const secondStock = await page.locator('#review-stock').textContent();
        expect(secondStock).toBe('7');

        // Check third item (same EAN)
        await page.click('#btn-review-next');
        await page.waitForTimeout(300);

        const thirdStock = await page.locator('#review-stock').textContent();
        expect(thirdStock).toBe('7');
      }
    }
  });

  test('stock sync should work when navigating backwards', async ({ page }) => {
    if (!fs.existsSync(exampleFilePath)) {
      test.skip();
      return;
    }

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

        await page.waitForTimeout(500);

        await page.click('#btn-start-review');
        await page.waitForTimeout(1000);

        // Go to second item
        await page.click('#btn-review-next');
        await page.waitForTimeout(300);

        // Change stock on second item
        await page.click('#btn-stock-plus');
        await page.click('#btn-stock-plus');
        await page.waitForTimeout(200);

        const secondItemStock = await page.locator('#review-stock').textContent();
        expect(secondItemStock).toBe('5');

        // Navigate back to first item
        await page.click('#btn-review-prev');
        await page.waitForTimeout(300);

        // First item should also show 5
        const firstItemStock = await page.locator('#review-stock').textContent();
        expect(firstItemStock).toBe('5');
      }
    }
  });
});
