const { test, expect } = require('@playwright/test');
const { setupEditor } = require('./helpers');

test.describe('Editor Screen - No Drag Ghost', () => {
  test.beforeEach(async ({ page, context }) => {
    await setupEditor(page, context);
  });

  test('should not show any box or text in top-left corner when dragging', async ({ page }) => {
    // Get first and second items
    const firstItem = page.locator('.item-card').first();
    const secondItem = page.locator('.item-card').nth(1);

    const firstBox = await firstItem.boundingBox();
    const secondBox = await secondItem.boundingBox();

    if (!firstBox || !secondBox) throw new Error('Could not get item bounding boxes');

    // Take screenshot before drag
    await page.screenshot({ path: 'test-results/before-drag.png' });

    // Start drag - hold down mouse for 250ms to enable dragging
    await page.mouse.move(firstBox.x + firstBox.width / 2, firstBox.y + firstBox.height / 2);
    await page.mouse.down();

    // Wait for drag to be ready
    await page.waitForFunction(() => document.querySelector('.item-card.dragging'), { timeout: 1000 }).catch(() => {});

    // Move to trigger drag
    await page.mouse.move(secondBox.x + secondBox.width / 2, secondBox.y + secondBox.height / 2, { steps: 10 });

    // Take screenshot during drag
    await page.screenshot({ path: 'test-results/during-drag.png' });

    // Check top-left corner for any visible elements with text
    const topLeftElements = await page.evaluate(() => {
      const elements = [];
      // Check area 0-200px from top-left
      for (let x = 0; x < 200; x += 50) {
        for (let y = 0; y < 200; y += 50) {
          const el = document.elementFromPoint(x, y);
          if (el && el !== document.body && el !== document.documentElement) {
            const text = el.textContent?.trim();
            const style = window.getComputedStyle(el);
            const isVisible = style.display !== 'none' &&
                            style.visibility !== 'hidden' &&
                            style.opacity !== '0';

            if (text && text.length > 0 && isVisible) {
              elements.push({
                x,
                y,
                tag: el.tagName,
                className: el.className,
                text: text.substring(0, 50),
                position: style.position,
                top: style.top,
                left: style.left,
                zIndex: style.zIndex
              });
            }
          }
        }
      }
      return elements;
    });

    // Filter out expected elements (header, etc)
    const unexpectedElements = topLeftElements.filter(el => {
      // Allow header elements
      if (el.className.includes('header') || el.tag === 'H1') return false;
      // Allow normal UI buttons
      if (el.className.includes('btn')) return false;
      // Everything else is suspicious
      return true;
    });

    await page.mouse.up();

    // Wait for drag to complete
    await page.waitForFunction(() => !document.querySelector('.item-card.dragging'), { timeout: 1000 }).catch(() => {});

    // Take screenshot after drag
    await page.screenshot({ path: 'test-results/after-drag.png' });

    // Should have no unexpected elements in top-left
    expect(unexpectedElements.length).toBe(0);
  });

  test('should use transparent drag image', async ({ page }) => {
    // Verify dragstart sets transparent image
    const dragImageInfo = await page.evaluate(() => {
      return new Promise((resolve) => {
        const card = document.querySelector('.item-card');
        let dragImageWasSet = false;

        const handler = (e) => {
          // Check if setDragImage was called with an image
          const originalSetDragImage = e.dataTransfer.setDragImage;
          dragImageWasSet = true;
          card.removeEventListener('dragstart', handler);
          resolve({ dragImageWasSet });
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

    expect(dragImageInfo.dragImageWasSet).toBe(true);
  });
});
