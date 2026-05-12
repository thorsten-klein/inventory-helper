const { test, expect } = require('@playwright/test');
const { setupEditor } = require('./helpers');

/**
 * Tests for mobile scrolling functionality on the reorder screen.
 * Verifies that scrolling works by checking that preventDefault is NOT called
 * on touchstart events (which would block scrolling).
 */

// Use mobile device configuration at the top level
test.use({
  viewport: { width: 390, height: 844 }, // iPhone 13 size
  isMobile: true,
  hasTouch: true,
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15.E148 Safari/604.1',
});

test.describe('Editor Screen - Mobile Scrolling Fix', () => {
  test.beforeEach(async ({ page, context }) => {
    await setupEditor(page, context);
  });

  test('should NOT call preventDefault on touchstart when touching card content', async ({ page }) => {
    // Wait for items to load
    await page.waitForSelector('.item-card', { timeout: 10000 });

    // Check that preventDefault is NOT called on touchstart for card content
    const preventDefaultCalled = await page.evaluate(() => {
      const firstCard = document.querySelector('.item-card:not(.removed)');
      const cardContent = firstCard.querySelector('.item-ean');

      if (!cardContent) throw new Error('Card content not found');

      let preventedDefault = false;

      // Create a touchstart event on card content
      const touchStart = new Touch({
        identifier: 1,
        target: cardContent,
        clientX: 100,
        clientY: 100,
        screenX: 100,
        screenY: 100,
      });

      const touchStartEvent = new TouchEvent('touchstart', {
        touches: [touchStart],
        changedTouches: [touchStart],
        bubbles: true,
        cancelable: true,
      });

      // Intercept preventDefault to track if it was called
      const originalPreventDefault = touchStartEvent.preventDefault.bind(touchStartEvent);
      touchStartEvent.preventDefault = function() {
        preventedDefault = true;
        originalPreventDefault();
      };

      firstCard.dispatchEvent(touchStartEvent);

      return preventedDefault;
    });

    // FIX: preventDefault should NOT be called on touchstart (allows scrolling)
    expect(preventDefaultCalled).toBe(false);
  });

  test('should call preventDefault on touchmove ONLY when dragging from drag handle', async ({ page }) => {
    // Wait for items to load
    await page.waitForSelector('.item-card', { timeout: 10000 });

    const firstCard = page.locator('.item-card:not(.removed)').first();
    const dragHandle = firstCard.locator('.drag-handle');

    const handleBox = await dragHandle.boundingBox();
    if (!handleBox) throw new Error('Could not get drag handle bounding box');

    const startX = handleBox.x + handleBox.width / 2;
    const startY = handleBox.y + handleBox.height / 2;

    // Test 1: Start on drag handle and move - should preventDefault
    const preventDefaultOnDragHandle = await page.evaluate((coords) => {
      const dragHandle = document.querySelector('.drag-handle');
      const card = dragHandle.closest('.item-card');

      // Start touch on drag handle
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

      // Now test touchmove
      let preventedDefault = false;

      const touchMove = new Touch({
        identifier: 1,
        target: dragHandle,
        clientX: coords.startX,
        clientY: coords.startY + 100,
        screenX: coords.startX,
        screenY: coords.startY + 100,
      });

      const touchMoveEvent = new TouchEvent('touchmove', {
        touches: [touchMove],
        changedTouches: [touchMove],
        bubbles: true,
        cancelable: true,
      });

      const originalPreventDefault = touchMoveEvent.preventDefault.bind(touchMoveEvent);
      touchMoveEvent.preventDefault = function() {
        preventedDefault = true;
        originalPreventDefault();
      };

      card.dispatchEvent(touchMoveEvent);

      return preventedDefault;
    }, { startX, startY });

    // When dragging from drag handle, preventDefault SHOULD be called on touchmove
    expect(preventDefaultOnDragHandle).toBe(true);
  });

  test('should NOT call preventDefault on touchmove when NOT dragging', async ({ page }) => {
    // Wait for items to load
    await page.waitForSelector('.item-card', { timeout: 10000 });

    const firstCard = page.locator('.item-card:not(.removed)').first();
    const cardBox = await firstCard.boundingBox();
    if (!cardBox) throw new Error('Could not get card bounding box');

    const startX = cardBox.x + cardBox.width / 2;
    const startY = cardBox.y + cardBox.height / 2;

    // Test: Start on card content (not drag handle) and move - should NOT preventDefault
    const preventDefaultOnCardContent = await page.evaluate((coords) => {
      const firstCard = document.querySelector('.item-card:not(.removed)');
      const cardContent = firstCard.querySelector('.item-ean');

      // Start touch on card content (NOT drag handle)
      const touchStart = new Touch({
        identifier: 1,
        target: cardContent,
        clientX: coords.startX,
        clientY: coords.startY,
        screenX: coords.startX,
        screenY: coords.startY,
      });

      firstCard.dispatchEvent(new TouchEvent('touchstart', {
        touches: [touchStart],
        changedTouches: [touchStart],
        bubbles: true,
        cancelable: true,
      }));

      // Now test touchmove - vertical movement (scrolling)
      let preventedDefault = false;

      const touchMove = new Touch({
        identifier: 1,
        target: cardContent,
        clientX: coords.startX,
        clientY: coords.startY + 100, // Vertical movement (scrolling)
        screenX: coords.startX,
        screenY: coords.startY + 100,
      });

      const touchMoveEvent = new TouchEvent('touchmove', {
        touches: [touchMove],
        changedTouches: [touchMove],
        bubbles: true,
        cancelable: true,
      });

      const originalPreventDefault = touchMoveEvent.preventDefault.bind(touchMoveEvent);
      touchMoveEvent.preventDefault = function() {
        preventedDefault = true;
        originalPreventDefault();
      };

      firstCard.dispatchEvent(touchMoveEvent);

      return preventedDefault;
    }, { startX, startY });

    // When NOT dragging, preventDefault should NOT be called (allows scrolling)
    expect(preventDefaultOnCardContent).toBe(false);
  });

  test('should allow swipe gestures when not on drag handle', async ({ page }) => {
    // Wait for items to load
    await page.waitForSelector('.item-card', { timeout: 10000 });

    const firstCard = page.locator('.item-card:not(.removed)').first();
    const cardBox = await firstCard.boundingBox();
    if (!cardBox) throw new Error('Could not get card bounding box');

    const startX = cardBox.x + cardBox.width / 2;
    const startY = cardBox.y + cardBox.height / 2;

    // Simulate horizontal swipe
    await page.evaluate((coords) => {
      const firstCard = document.querySelector('.item-card:not(.removed)');
      const cardContent = firstCard.querySelector('.item-ean');

      const touchStart = new Touch({
        identifier: 1,
        target: cardContent,
        clientX: coords.startX,
        clientY: coords.startY,
        screenX: coords.startX,
        screenY: coords.startY,
      });

      firstCard.dispatchEvent(new TouchEvent('touchstart', {
        touches: [touchStart],
        changedTouches: [touchStart],
        bubbles: true,
        cancelable: true,
      }));

      // Horizontal swipe right
      const touchMove = new Touch({
        identifier: 1,
        target: cardContent,
        clientX: coords.startX + 100, // Horizontal movement
        clientY: coords.startY,
        screenX: coords.startX + 100,
        screenY: coords.startY,
      });

      firstCard.dispatchEvent(new TouchEvent('touchmove', {
        touches: [touchMove],
        changedTouches: [touchMove],
        bubbles: true,
        cancelable: true,
      }));
    }, { startX, startY });

    await page.waitForTimeout(100);

    // Card should show swipe feedback
    const hasSwipeClass = await firstCard.evaluate(el =>
      el.classList.contains('swiping-right') || el.classList.contains('swiping-left')
    );

    expect(hasSwipeClass).toBe(true);
  });
});
