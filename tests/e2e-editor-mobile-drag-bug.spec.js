const { test, expect } = require('@playwright/test');
const { setupEditor } = require('./helpers');

/**
 * Tests for mobile drag functionality on the reorder screen.
 * Verifies that dragging works correctly when touching the drag handle
 * on mobile devices (fixed bug where passive event listeners prevented drag).
 */

// Use mobile device configuration at the top level
test.use({
  viewport: { width: 390, height: 844 }, // iPhone 13 size
  isMobile: true,
  hasTouch: true,
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
});

test.describe('Editor Screen - Mobile Drag Bug', () => {
  test.beforeEach(async ({ page, context }) => {
    await setupEditor(page, context);
  });

  test('should allow drag when touching drag handle on mobile', async ({ page }) => {
    // Wait for items to load
    await page.waitForSelector('.item-card', { timeout: 10000 });

    const itemCards = page.locator('.item-card:not(.removed)');
    const count = await itemCards.count();
    expect(count).toBeGreaterThanOrEqual(2);

    // Get first two non-removed items
    const firstCard = itemCards.first();
    const secondCard = itemCards.nth(1);

    // Get original EAN values to verify reorder
    const firstEan = await firstCard.locator('.item-ean').textContent();
    const secondEan = await secondCard.locator('.item-ean').textContent();

    console.log('First item EAN:', firstEan);
    console.log('Second item EAN:', secondEan);

    // Get drag handle position
    const dragHandle = firstCard.locator('.drag-handle');
    await expect(dragHandle).toBeVisible();

    const handleBox = await dragHandle.boundingBox();
    const secondCardBox = await secondCard.boundingBox();

    if (!handleBox || !secondCardBox) {
      throw new Error('Could not get bounding boxes');
    }

    console.log('Drag handle position:', handleBox);
    console.log('Second card position:', secondCardBox);

    // Simulate a long press on the drag handle followed by drag
    // This mimics what happens on a real phone
    const startX = handleBox.x + handleBox.width / 2;
    const startY = handleBox.y + handleBox.height / 2;
    const endX = secondCardBox.x + secondCardBox.width / 2;
    const endY = secondCardBox.y + secondCardBox.height * 0.7; // Drop in bottom half to swap

    console.log('Starting drag from:', startX, startY);
    console.log('Ending drag at:', endX, endY);

    // Dispatch all touch events in one evaluation to ensure proper sequencing
    await page.evaluate((coords) => {
      const dragHandle = document.querySelector('.drag-handle');
      if (!dragHandle) throw new Error('Drag handle not found');

      const card = dragHandle.closest('.item-card');
      if (!card) throw new Error('Item card not found');

      console.log('Creating and dispatching touch events for drag operation');

      // Create touchstart event on drag handle
      const touchStart = new Touch({
        identifier: 1,
        target: dragHandle,
        clientX: coords.startX,
        clientY: coords.startY,
        screenX: coords.startX,
        screenY: coords.startY,
      });

      const touchStartEvent = new TouchEvent('touchstart', {
        touches: [touchStart],
        changedTouches: [touchStart],
        bubbles: true,
        cancelable: true,
      });

      card.dispatchEvent(touchStartEvent);
      console.log('touchstart dispatched');

      // Create touchmove event (moving to target position)
      const touchMove = new Touch({
        identifier: 1,
        target: dragHandle, // Touch target remains where it started
        clientX: coords.endX,
        clientY: coords.endY,
        screenX: coords.endX,
        screenY: coords.endY,
      });

      const touchMoveEvent = new TouchEvent('touchmove', {
        touches: [touchMove],
        changedTouches: [touchMove],
        bubbles: true,
        cancelable: true,
      });

      card.dispatchEvent(touchMoveEvent);
      console.log('touchmove dispatched to:', coords.endX, coords.endY);

      // Create touchend event
      const touchEnd = new Touch({
        identifier: 1,
        target: dragHandle, // Touch target remains where it started
        clientX: coords.endX,
        clientY: coords.endY,
        screenX: coords.endX,
        screenY: coords.endY,
      });

      const touchEndEvent = new TouchEvent('touchend', {
        touches: [],
        changedTouches: [touchEnd],
        bubbles: true,
        cancelable: true,
      });

      card.dispatchEvent(touchEndEvent);
      console.log('touchend dispatched');
    }, { startX, startY, endX, endY });

    // Wait for any animations/state updates
    await page.waitForTimeout(300);

    // Take screenshot for debugging
    await page.screenshot({ path: 'test-results/mobile-drag-after.png' });

    // Verify items were reordered
    const newFirstEan = await page.locator('.item-card:not(.removed)').first().locator('.item-ean').textContent();
    const newSecondEan = await page.locator('.item-card:not(.removed)').nth(1).locator('.item-ean').textContent();

    console.log('After drag - First item EAN:', newFirstEan);
    console.log('After drag - Second item EAN:', newSecondEan);

    // Verify that the drag worked - first and second should have swapped
    expect(newFirstEan).toBe(secondEan);
    expect(newSecondEan).toBe(firstEan);
  });

  test('should show visual feedback when dragging on mobile', async ({ page }) => {
    // Wait for items to load
    await page.waitForSelector('.item-card', { timeout: 10000 });

    const firstCard = page.locator('.item-card:not(.removed)').first();
    const dragHandle = firstCard.locator('.drag-handle');

    const handleBox = await dragHandle.boundingBox();
    if (!handleBox) throw new Error('Could not get drag handle bounding box');

    const startX = handleBox.x + handleBox.width / 2;
    const startY = handleBox.y + handleBox.height / 2;

    // Start touch on drag handle
    await page.evaluate((coords) => {
      const dragHandle = document.querySelector('.drag-handle');
      const card = dragHandle.closest('.item-card');

      const touch = new Touch({
        identifier: 1,
        target: dragHandle,
        clientX: coords.startX,
        clientY: coords.startY,
        screenX: coords.startX,
        screenY: coords.startY,
      });

      card.dispatchEvent(new TouchEvent('touchstart', {
        touches: [touch],
        changedTouches: [touch],
        bubbles: true,
        cancelable: true,
      }));
    }, { startX, startY });

    await page.waitForTimeout(50);

    // Move touch to trigger drag
    await page.evaluate((coords) => {
      const firstCard = document.querySelector('.item-card:not(.removed)');

      const touch = new Touch({
        identifier: 1,
        target: firstCard,
        clientX: coords.startX,
        clientY: coords.startY + 100, // Move down
        screenX: coords.startX,
        screenY: coords.startY + 100,
      });

      firstCard.dispatchEvent(new TouchEvent('touchmove', {
        touches: [touch],
        changedTouches: [touch],
        bubbles: true,
        cancelable: true,
      }));
    }, { startX, startY });

    await page.waitForTimeout(100);

    // Card should have 'dragging' class
    const hasDraggingClass = await firstCard.evaluate(el => el.classList.contains('dragging'));

    // Card should have dragging class when drag is in progress
    expect(hasDraggingClass).toBe(true);
  });

  test('should prevent page scroll when dragging from drag handle on mobile', async ({ page }) => {
    // Wait for items to load
    await page.waitForSelector('.item-card', { timeout: 10000 });

    const firstCard = page.locator('.item-card:not(.removed)').first();
    const dragHandle = firstCard.locator('.drag-handle');

    const handleBox = await dragHandle.boundingBox();
    if (!handleBox) throw new Error('Could not get drag handle bounding box');

    const startX = handleBox.x + handleBox.width / 2;
    const startY = handleBox.y + handleBox.height / 2;

    // Get initial scroll position
    const initialScrollY = await page.evaluate(() => window.scrollY);

    // Start touch on drag handle and move vertically
    await page.evaluate((coords) => {
      const dragHandle = document.querySelector('.drag-handle');
      const card = dragHandle.closest('.item-card');

      const touchStart = new Touch({
        identifier: 1,
        target: dragHandle,
        clientX: coords.startX,
        clientY: coords.startY,
        screenX: coords.startX,
        screenY: coords.startY,
      });

      card.dispatchEvent(new TouchEvent('touchstart', {
        touches: [touchStart],
        changedTouches: [touchStart],
        bubbles: true,
        cancelable: true,
      }));

      // Immediately move down (should not scroll page)
      const touchMove = new Touch({
        identifier: 1,
        target: card,
        clientX: coords.startX,
        clientY: coords.startY + 200, // Move down significantly
        screenX: coords.startX,
        screenY: coords.startY + 200,
      });

      card.dispatchEvent(new TouchEvent('touchmove', {
        touches: [touchMove],
        changedTouches: [touchMove],
        bubbles: true,
        cancelable: true,
      }));
    }, { startX, startY });

    await page.waitForTimeout(100);

    // End touch
    await page.evaluate(() => {
      const firstCard = document.querySelector('.item-card:not(.removed)');
      firstCard.dispatchEvent(new TouchEvent('touchend', {
        touches: [],
        changedTouches: [],
        bubbles: true,
        cancelable: true,
      }));
    });

    await page.waitForTimeout(100);

    // Page should not have scrolled (or scrolled very little)
    const finalScrollY = await page.evaluate(() => window.scrollY);
    const scrollDiff = Math.abs(finalScrollY - initialScrollY);

    // Allow small scroll differences due to browser quirks, but not the full 200px
    expect(scrollDiff).toBeLessThan(50);
  });
});
