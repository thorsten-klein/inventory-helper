const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

test.describe('Editor Screen - Drag Text Bug', () => {
  const exampleFilePath = path.join(__dirname, '..', 'example', 'example.xlsx');

  test('should not show item index as text when dragging item', async ({ page }) => {
    if (!fs.existsSync(exampleFilePath)) {
      test.skip();
      return;
    }

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

        // Hold mouse down for 250ms to trigger drag mode
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        await page.waitForTimeout(250);

        // Check if card is draggable
        const isDraggable = await firstItem.evaluate(el => el.draggable);

        // Check dataTransfer data type during dragstart
        const dataTransferInfo = await page.evaluate(() => {
          return new Promise((resolve) => {
            const card = document.querySelector('.item-card');
            const handler = (e) => {
              const types = Array.from(e.dataTransfer.types);
              const hasTextPlain = types.includes('text/plain');
              let textData = null;
              if (hasTextPlain) {
                // Can't actually read during dragstart, but we know it's set
                textData = 'TEXT_PLAIN_IS_SET';
              }
              card.removeEventListener('dragstart', handler);
              resolve({ types, hasTextPlain, textData });
            };
            card.addEventListener('dragstart', handler);

            // Trigger drag
            const event = new DragEvent('dragstart', {
              bubbles: true,
              cancelable: true,
              dataTransfer: new DataTransfer()
            });
            card.dispatchEvent(event);
          });
        });

        // The fix: text/plain should NOT be used
        // Using text/plain causes browsers to show the text as a drag ghost in top-left corner
        // Instead, we should use a custom MIME type like 'application/x-item-index'
        expect(dataTransferInfo.hasTextPlain).toBe(false);

        // Verify custom MIME type is used instead
        expect(dataTransferInfo.types).toContain('application/x-item-index');

        await page.mouse.up();
      }
    }
  });
});
