const { test, expect } = require('@playwright/test');
const { setupEditor, waitForItemsUpdate } = require('./helpers');

test.describe('Editor Screen - Mouse Drag and Drop', () => {
  test.beforeEach(async ({ page, context }) => {
    await setupEditor(page, context);
  });

  test('BUG: Mouse drag from drag handle should reorder items', async ({ page }) => {
    // Wait for items to load
    await page.waitForSelector('.item-card:not(.removed)', { timeout: 10000 });

    const itemCards = page.locator('.item-card:not(.removed)');
    const count = await itemCards.count();
    expect(count).toBeGreaterThanOrEqual(2);

    // Get first two items
    const firstCard = itemCards.first();
    const secondCard = itemCards.nth(1);

    // Get original EAN values
    const firstEan = await firstCard.locator('.item-ean').textContent();
    const secondEan = await secondCard.locator('.item-ean').textContent();

    // Get positions
    const dragHandle = firstCard.locator('.drag-handle');
    const handleBox = await dragHandle.boundingBox();
    const secondCardBox = await secondCard.boundingBox();

    if (!handleBox || !secondCardBox) {
      throw new Error('Could not get bounding boxes');
    }

    // Perform mouse drag from drag handle to second card
    const startX = handleBox.x + handleBox.width / 2;
    const startY = handleBox.y + handleBox.height / 2;
    const endX = secondCardBox.x + secondCardBox.width / 2;
    const endY = secondCardBox.y + secondCardBox.height / 2 + 10; // Drop below midpoint

    // Use Playwright's drag and drop
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.waitForTimeout(100); // Short delay to trigger drag
    await page.mouse.move(endX, endY, { steps: 10 });
    await page.waitForTimeout(100);
    await page.mouse.up();

    // Wait for drag operation to complete
    // Removed 1000ms timeout

    // Check if items were reordered
    const newFirstEan = await page.locator('.item-card:not(.removed)').first().locator('.item-ean').textContent();
    const newSecondEan = await page.locator('.item-card:not(.removed)').nth(1).locator('.item-ean').textContent();

    // Items should have swapped positions
    expect(newFirstEan).toBe(secondEan);
    expect(newSecondEan).toBe(firstEan);
  });

  test('Mouse drag should trigger HTML5 drag events', async ({ page }) => {
    // Wait for items to load
    await page.waitForSelector('.item-card:not(.removed)', { timeout: 10000 });

    const itemCards = page.locator('.item-card:not(.removed)');
    const count = await itemCards.count();
    expect(count).toBeGreaterThanOrEqual(2);

    // Get first item
    const firstCard = itemCards.first();
    const dragHandle = firstCard.locator('.drag-handle');
    const handleBox = await dragHandle.boundingBox();

    if (!handleBox) {
      throw new Error('Could not get bounding box');
    }

    const startX = handleBox.x + handleBox.width / 2;
    const startY = handleBox.y + handleBox.height / 2;

    // Check if dragstart event is fired
    const dragEvents = await page.evaluate((coords) => {
      return new Promise((resolve) => {
        const handle = document.querySelector('.drag-handle');
        const card = handle.closest('.item-card');
        const events = [];

        // Listen for drag events
        card.addEventListener('dragstart', () => {
          events.push('dragstart');
        }, { once: true });

        card.addEventListener('dragend', () => {
          events.push('dragend');
          resolve(events);
        }, { once: true });

        // Simulate mousedown on drag handle
        const mouseDown = new MouseEvent('mousedown', {
          bubbles: true,
          cancelable: true,
          clientX: coords.x,
          clientY: coords.y,
          screenX: coords.x,
          screenY: coords.y,
        });
        handle.dispatchEvent(mouseDown);

        // Wait a bit, then try to trigger drag
        setTimeout(() => {
          if (!card.draggable) {
            resolve(['error: card not draggable']);
            return;
          }

          // Try to dispatch dragstart manually
          const dragStart = new DragEvent('dragstart', {
            bubbles: true,
            cancelable: true,
            dataTransfer: new DataTransfer()
          });
          card.dispatchEvent(dragStart);

          setTimeout(() => {
            const dragEnd = new DragEvent('dragend', {
              bubbles: true,
              cancelable: true
            });
            card.dispatchEvent(dragEnd);
          }, 100);
        }, 100);
      });
    }, { x: startX, y: startY });

    // Should have both dragstart and dragend events
    expect(dragEvents).toContain('dragstart');
  });

  test('Card should have draggable=true after mousedown on drag handle', async ({ page }) => {
    // Wait for items to load
    await page.waitForSelector('.item-card:not(.removed)', { timeout: 10000 });

    const firstCard = page.locator('.item-card:not(.removed)').first();
    const dragHandle = firstCard.locator('.drag-handle');

    // Non-removed, non-locked cards should be draggable for HTML5 drag to work
    const initialDraggable = await firstCard.evaluate(el => el.draggable);
    expect(initialDraggable).toBe(true);

    // Click on drag handle
    await dragHandle.click({ force: true });
    await page.waitForTimeout(100);

    // Card should still be draggable
    const afterClickDraggable = await firstCard.evaluate(el => el.draggable);

    // This should be true for drag to work
    expect(afterClickDraggable).toBe(true);
  });
});
