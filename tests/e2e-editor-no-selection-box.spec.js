const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

test.describe('Editor Screen - No Selection Box', () => {
  const exampleFilePath = path.join(__dirname, '..', 'example', 'example.xlsx');

  test('should not create text selection box when holding mouse down', async ({ page }) => {
    expect(fs.existsSync(exampleFilePath)).toBeTruthy();

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

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

        await page.waitForSelector('#editor-screen:not(.hidden)');
        await page.waitForSelector('.item-card', { timeout: 5000 });

        const firstItem = page.locator('.item-card').first();
        const box = await firstItem.boundingBox();
        if (!box) throw new Error('Could not get item bounding box');

        // Hold mouse down for 300ms (enough to trigger drag mode)
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        await page.waitForTimeout(300);

        // Check if any text selection exists
        const selectionInfo = await page.evaluate(() => {
          const selection = window.getSelection();
          return {
            rangeCount: selection.rangeCount,
            text: selection.toString(),
            anchorNode: selection.anchorNode ? selection.anchorNode.nodeName : null,
            isCollapsed: selection.isCollapsed
          };
        });

        // Should have no text selection
        expect(selectionInfo.rangeCount).toBe(0);
        expect(selectionInfo.text).toBe('');
        expect(selectionInfo.isCollapsed).toBe(true);

        await page.mouse.up();
      }
    }
  });

  test('should not show any selection highlight in top-left corner', async ({ page }) => {
    expect(fs.existsSync(exampleFilePath)).toBeTruthy();

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

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

        await page.waitForSelector('#editor-screen:not(.hidden)');
        await page.waitForSelector('.item-card', { timeout: 5000 });

        const firstItem = page.locator('.item-card').first();
        const box = await firstItem.boundingBox();
        if (!box) throw new Error('Could not get item bounding box');

        // Click and hold
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        await page.waitForTimeout(300);

        // Take screenshot
        await page.screenshot({ path: 'test-results/no-selection-box.png' });

        // Check for selection highlight elements (::selection pseudo-element or selection divs)
        const hasSelectionHighlight = await page.evaluate(() => {
          const selection = window.getSelection();
          if (selection.rangeCount === 0) return false;

          // Check if any ranges have content
          for (let i = 0; i < selection.rangeCount; i++) {
            const range = selection.getRangeAt(i);
            if (!range.collapsed) {
              return true; // Non-collapsed range means visible selection
            }
          }
          return false;
        });

        expect(hasSelectionHighlight).toBe(false);

        await page.mouse.up();
      }
    }
  });

  test('should clear selection on dragstart', async ({ page }) => {
    expect(fs.existsSync(exampleFilePath)).toBeTruthy();

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

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

        await page.waitForSelector('#editor-screen:not(.hidden)');
        await page.waitForSelector('.item-card', { timeout: 5000 });

        // Verify dragstart clears selection
        const clearsSelection = await page.evaluate(() => {
          return new Promise((resolve) => {
            const card = document.querySelector('.item-card');

            const handler = (e) => {
              card.removeEventListener('dragstart', handler);

              // Check selection after dragstart
              const selection = window.getSelection();
              resolve({
                rangeCount: selection.rangeCount,
                text: selection.toString()
              });
            };

            card.addEventListener('dragstart', handler);

            // Simulate dragstart
            const event = new DragEvent('dragstart', {
              bubbles: true,
              cancelable: true,
              dataTransfer: new DataTransfer()
            });
            card.dispatchEvent(event);
          });
        });

        expect(clearsSelection.rangeCount).toBe(0);
        expect(clearsSelection.text).toBe('');
      }
    }
  });
});
