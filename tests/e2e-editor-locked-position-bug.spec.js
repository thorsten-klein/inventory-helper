const { test, expect } = require('@playwright/test');
const { setupEditor } = require('./helpers');

/**
 * Test for locked item position bug
 *
 * Bug: When an item is locked at a specific position (e.g., row 1, position 2)
 * and another item from the same shelf/row is dragged above it, the locked item
 * should maintain its position. Instead, positions are shifted incorrectly.
 */

test.describe('Editor Screen - Locked Item Position Bug', () => {
  test.beforeEach(async ({ page, context }) => {
    await setupEditor(page, context);
  });

  test('locked item should keep its position when dragging another item above it', async ({ page }) => {
    // Wait for items to load
    await page.waitForSelector('.item-card', { timeout: 10000 });

    const itemCards = page.locator('.item-card:not(.removed)');
    const count = await itemCards.count();

    // We need at least 3 items
    expect(count).toBeGreaterThanOrEqual(3);

    // Work with first 3 items
    const item1 = itemCards.nth(0);
    const item2 = itemCards.nth(1);
    const item3 = itemCards.nth(2);

    // Get EAN numbers for identification
    const ean1 = await item1.locator('.item-ean').textContent();
    const ean2 = await item2.locator('.item-ean').textContent();
    const ean3 = await item3.locator('.item-ean').textContent();


    // Step 1: Lock item 2 (middle item)
    const lockBox = await item2.boundingBox();
    if (!lockBox) throw new Error('Could not get item 2 bounding box');

    // Swipe right to lock item 2
    await page.mouse.move(lockBox.x + 50, lockBox.y + lockBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(lockBox.x + lockBox.width - 50, lockBox.y + lockBox.height / 2, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(300);

    // Verify item 2 is locked
    const isLocked = await page.evaluate((ean) => {
      const cards = Array.from(document.querySelectorAll('.item-card:not(.removed)'));
      const card = cards.find(c => c.querySelector('.item-ean')?.textContent === ean);
      return card?.classList.contains('locked');
    }, ean2);
    expect(isLocked).toBe(true);

    // Get position of locked item (item 2) before drag
    const { positionBefore, locationBefore } = await page.evaluate((ean) => {
      const cards = Array.from(document.querySelectorAll('.item-card:not(.removed)'));
      const card = cards.find(c => c.querySelector('.item-ean')?.textContent === ean);
      const location = card?.querySelector('.item-location')?.textContent || '';
      const match = location.match(/Pos:\s*(\d+)/);
      return {
        positionBefore: match ? parseInt(match[1]) : null,
        locationBefore: location
      };
    }, ean2);

    // Step 2: Drag item 3 to above item 1 (this should move around the locked item)
    // Find the drag handle for item 3
    const item3Card = page.locator('.item-card:not(.removed)').filter({ has: page.locator(`.item-ean:text("${ean3}")`) });
    const dragHandle = item3Card.locator('.drag-handle');
    await expect(dragHandle).toBeVisible();

    const handleBox = await dragHandle.boundingBox();
    const item1Box = await item1.boundingBox();

    if (!handleBox || !item1Box) {
      throw new Error('Could not get bounding boxes for drag');
    }

    // Perform drag
    const startX = handleBox.x + handleBox.width / 2;
    const startY = handleBox.y + handleBox.height / 2;
    const endX = item1Box.x + item1Box.width / 2;
    const endY = item1Box.y + 10; // Above item 1

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.waitForTimeout(100);
    await page.mouse.move(endX, endY, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(300);

    // Step 3: Verify the locked item maintained its position
    const { positionAfter, locationAfter } = await page.evaluate((ean) => {
      const cards = Array.from(document.querySelectorAll('.item-card:not(.removed)'));
      const card = cards.find(c => c.querySelector('.item-ean')?.textContent === ean);
      const location = card?.querySelector('.item-location')?.textContent || '';
      const match = location.match(/Pos:\s*(\d+)/);
      return {
        positionAfter: match ? parseInt(match[1]) : null,
        locationAfter: location
      };
    }, ean2);

    // The locked item should have maintained its original position
    expect(positionAfter).toBe(positionBefore);

    // Verify the item is still locked
    const stillLocked = await page.evaluate((ean) => {
      const cards = Array.from(document.querySelectorAll('.item-card:not(.removed)'));
      const card = cards.find(c => c.querySelector('.item-ean')?.textContent === ean);
      return card?.classList.contains('locked');
    }, ean2);
    expect(stillLocked).toBe(true);
  });
});
