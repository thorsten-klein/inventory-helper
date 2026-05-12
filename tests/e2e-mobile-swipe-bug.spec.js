const { test, expect } = require('@playwright/test');
const { setupEditor } = require('./helpers');

/**
 * Test for mobile swipe bug on the reorder screen.
 * Reproduces bug where swiping does not work when the swipe ends outside the item.
 *
 * Bug: Swiping on items in reorder screen does not work when the swipe ends outside the item.
 * Expected: Only the start position should be relevant for the swipe. If the swipe starts
 *           on an item, it should work even if it ends outside the item boundary.
 * Actual: Swipe is ignored if it ends outside the item.
 */

// Use mobile device configuration
test.use({
  viewport: { width: 390, height: 844 }, // iPhone 13 size
  isMobile: true,
  hasTouch: true,
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
});

test.describe('Editor Screen - Mobile Swipe Bug', () => {
  test.beforeEach(async ({ page, context }) => {
    await setupEditor(page, context);
  });

  test('should process swipe right (lock/unlock) even when ending outside item boundary', async ({ page }) => {
    // Wait for items to load
    await page.waitForSelector('.item-card', { timeout: 10000 });

    const itemCards = page.locator('.item-card:not(.removed)');
    const count = await itemCards.count();
    expect(count).toBeGreaterThanOrEqual(1);

    // Get the first non-removed item
    const firstCard = itemCards.first();
    const itemContent = firstCard.locator('.item-left');
    await expect(itemContent).toBeVisible();

    const contentBox = await itemContent.boundingBox();
    if (!contentBox) {
      throw new Error('Could not get item content bounding box');
    }

    // Check initial locked state
    const initiallyLocked = await firstCard.evaluate(el => el.classList.contains('locked'));

    // Start swipe inside the item, end outside to the right
    const startX = contentBox.x + contentBox.width / 2;
    const startY = contentBox.y + contentBox.height / 2;
    const endX = contentBox.x + contentBox.width + 100; // End well outside the item to the right
    const endY = startY;

    // Simulate swipe right that ends outside the item
    await page.evaluate((coords) => {
      const itemContent = document.querySelector('.item-card:not(.removed) .item-left');
      const card = itemContent.closest('.item-card');

      // Start touch inside item
      const touchStart = new Touch({
        identifier: 1,
        target: itemContent,
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

      // End touch outside item (to the right)
      setTimeout(() => {
        const touchEnd = new Touch({
          identifier: 1,
          target: itemContent, // Target stays the same (where touch started)
          clientX: coords.endX,
          clientY: coords.endY,
          screenX: coords.endX,
          screenY: coords.endY,
        });

        card.dispatchEvent(new TouchEvent('touchend', {
          touches: [],
          changedTouches: [touchEnd],
          bubbles: true,
          cancelable: true,
        }));
      }, 100);
    }, { startX, startY, endX, endY });

    // Wait for swipe action to complete
    await page.waitForTimeout(500);

    // Verify locked state was toggled (swipe right = lock/unlock)
    const nowLocked = await firstCard.evaluate(el => el.classList.contains('locked'));
    expect(nowLocked).toBe(!initiallyLocked);
  });

  test('should process swipe left (remove) even when ending outside item boundary', async ({ page }) => {
    // Wait for items to load
    await page.waitForSelector('.item-card', { timeout: 10000 });

    const firstCard = page.locator('.item-card:not(.removed)').first();
    const itemContent = firstCard.locator('.item-left');

    const contentBox = await itemContent.boundingBox();
    if (!contentBox) {
      throw new Error('Could not get item content bounding box');
    }

    // Start swipe inside the item, end outside to the left
    const startX = contentBox.x + contentBox.width / 2;
    const startY = contentBox.y + contentBox.height / 2;
    const endX = contentBox.x - 100; // End well outside the item to the left
    const endY = startY;

    // Simulate swipe left that ends outside the item
    await page.evaluate((coords) => {
      const itemContent = document.querySelector('.item-card:not(.removed) .item-left');
      const card = itemContent.closest('.item-card');

      const touchStart = new Touch({
        identifier: 1,
        target: itemContent,
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

      setTimeout(() => {
        const touchEnd = new Touch({
          identifier: 1,
          target: itemContent,
          clientX: coords.endX,
          clientY: coords.endY,
          screenX: coords.endX,
          screenY: coords.endY,
        });

        card.dispatchEvent(new TouchEvent('touchend', {
          touches: [],
          changedTouches: [touchEnd],
          bubbles: true,
          cancelable: true,
        }));
      }, 100);
    }, { startX, startY, endX, endY });

    // Wait for confirmation modal to appear (swipe left shows confirmation)
    await page.waitForTimeout(500);

    // Verify confirmation modal is shown
    const confirmModal = page.locator('#confirm-remove-modal');
    const modalVisible = await confirmModal.evaluate(el => !el.classList.contains('hidden'));
    expect(modalVisible).toBe(true);

    // Cancel the removal
    await page.click('#btn-cancel-remove');
    await page.waitForTimeout(200);
  });

  test('should handle swipe that starts inside item and ends far outside', async ({ page }) => {
    // Wait for items to load
    await page.waitForSelector('.item-card', { timeout: 10000 });

    const firstCard = page.locator('.item-card:not(.removed)').first();
    const itemContent = firstCard.locator('.item-left');

    const contentBox = await itemContent.boundingBox();
    if (!contentBox) {
      throw new Error('Could not get item content bounding box');
    }

    const initiallyLocked = await firstCard.evaluate(el => el.classList.contains('locked'));

    // Very long swipe - start inside item, end far outside
    const startX = contentBox.x + 20;
    const startY = contentBox.y + contentBox.height / 2;
    const endX = contentBox.x + contentBox.width + 200; // Far outside
    const endY = startY;

    // Simulate very long swipe
    await page.evaluate((coords) => {
      const itemContent = document.querySelector('.item-card:not(.removed) .item-left');
      const card = itemContent.closest('.item-card');

      const touchStart = new Touch({
        identifier: 1,
        target: itemContent,
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

      setTimeout(() => {
        const touchEnd = new Touch({
          identifier: 1,
          target: itemContent,
          clientX: coords.endX,
          clientY: coords.endY,
          screenX: coords.endX,
          screenY: coords.endY,
        });

        card.dispatchEvent(new TouchEvent('touchend', {
          touches: [],
          changedTouches: [touchEnd],
          bubbles: true,
          cancelable: true,
        }));
      }, 100);
    }, { startX, startY, endX, endY });

    await page.waitForTimeout(500);

    // Verify swipe was processed even though it ended far outside
    const nowLocked = await firstCard.evaluate(el => el.classList.contains('locked'));
    expect(nowLocked).toBe(!initiallyLocked);
  });

  test('should handle swipe starting near edge of item and ending outside', async ({ page }) => {
    // Wait for items to load
    await page.waitForSelector('.item-card', { timeout: 10000 });

    const firstCard = page.locator('.item-card:not(.removed)').first();

    const cardBox = await firstCard.boundingBox();
    if (!cardBox) {
      throw new Error('Could not get card bounding box');
    }

    const initiallyLocked = await firstCard.evaluate(el => el.classList.contains('locked'));

    // Start near right edge of item, swipe further right (ending outside)
    const startX = cardBox.x + cardBox.width - 20; // Near right edge
    const startY = cardBox.y + cardBox.height / 2;
    const endX = cardBox.x + cardBox.width + 80; // Outside to the right
    const endY = startY;

    await page.evaluate((coords) => {
      const cards = document.querySelectorAll('.item-card:not(.removed)');
      const card = cards[0];

      const touchStart = new Touch({
        identifier: 1,
        target: card,
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

      setTimeout(() => {
        const touchEnd = new Touch({
          identifier: 1,
          target: card,
          clientX: coords.endX,
          clientY: coords.endY,
          screenX: coords.endX,
          screenY: coords.endY,
        });

        card.dispatchEvent(new TouchEvent('touchend', {
          touches: [],
          changedTouches: [touchEnd],
          bubbles: true,
          cancelable: true,
        }));
      }, 100);
    }, { startX, startY, endX, endY });

    await page.waitForTimeout(500);

    // Verify swipe was processed
    const nowLocked = await firstCard.evaluate(el => el.classList.contains('locked'));
    expect(nowLocked).toBe(!initiallyLocked);
  });

  test('should NOT process swipe if it starts outside the item', async ({ page }) => {
    // Wait for items to load
    await page.waitForSelector('.item-card', { timeout: 10000 });

    const firstCard = page.locator('.item-card:not(.removed)').first();

    const cardBox = await firstCard.boundingBox();
    if (!cardBox) {
      throw new Error('Could not get card bounding box');
    }

    const initiallyLocked = await firstCard.evaluate(el => el.classList.contains('locked'));

    // Start OUTSIDE the item (to the left), end on the item
    const startX = cardBox.x - 50; // Outside to the left
    const startY = cardBox.y + cardBox.height / 2;
    const endX = cardBox.x + cardBox.width / 2; // Inside the item
    const endY = startY;

    await page.evaluate((coords) => {
      // Find element at start position
      const elementAtStart = document.elementFromPoint(coords.startX, coords.startY);
      const card = document.querySelector('.item-card:not(.removed)');

      // Touch starts outside the card
      const touchStart = new Touch({
        identifier: 1,
        target: elementAtStart || document.body,
        clientX: coords.startX,
        clientY: coords.startY,
        screenX: coords.startX,
        screenY: coords.startY,
      });

      // Dispatch on body or element at start position
      (elementAtStart || document.body).dispatchEvent(new TouchEvent('touchstart', {
        touches: [touchStart],
        changedTouches: [touchStart],
        bubbles: true,
        cancelable: true,
      }));

      setTimeout(() => {
        const touchEnd = new Touch({
          identifier: 1,
          target: card,
          clientX: coords.endX,
          clientY: coords.endY,
          screenX: coords.endX,
          screenY: coords.endY,
        });

        card.dispatchEvent(new TouchEvent('touchend', {
          touches: [],
          changedTouches: [touchEnd],
          bubbles: true,
          cancelable: true,
        }));
      }, 100);
    }, { startX, startY, endX, endY });

    await page.waitForTimeout(500);

    // Verify swipe was NOT processed (locked state unchanged)
    const nowLocked = await firstCard.evaluate(el => el.classList.contains('locked'));
    expect(nowLocked).toBe(initiallyLocked);
  });

  test('should handle vertical swipe that ends above/below the item', async ({ page }) => {
    // Wait for items to load
    await page.waitForSelector('.item-card', { timeout: 10000 });

    const firstCard = page.locator('.item-card:not(.removed)').first();
    const itemContent = firstCard.locator('.item-left');

    const contentBox = await itemContent.boundingBox();
    if (!contentBox) {
      throw new Error('Could not get item content bounding box');
    }

    const initiallyLocked = await firstCard.evaluate(el => el.classList.contains('locked'));

    // Diagonal swipe: start inside, end outside and above/below
    // Horizontal component is greater than vertical, so should be treated as horizontal swipe
    const startX = contentBox.x + contentBox.width / 2;
    const startY = contentBox.y + contentBox.height / 2;
    const endX = startX + 100; // Horizontal: right 100px
    const endY = startY - 50;  // Vertical: up 50px (ends outside item vertically)

    await page.evaluate((coords) => {
      const itemContent = document.querySelector('.item-card:not(.removed) .item-left');
      const card = itemContent.closest('.item-card');

      const touchStart = new Touch({
        identifier: 1,
        target: itemContent,
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

      setTimeout(() => {
        const touchEnd = new Touch({
          identifier: 1,
          target: itemContent,
          clientX: coords.endX,
          clientY: coords.endY,
          screenX: coords.endX,
          screenY: coords.endY,
        });

        card.dispatchEvent(new TouchEvent('touchend', {
          touches: [],
          changedTouches: [touchEnd],
          bubbles: true,
          cancelable: true,
        }));
      }, 100);
    }, { startX, startY, endX, endY });

    await page.waitForTimeout(500);

    // Verify horizontal swipe was processed (even though it ended outside vertically)
    const nowLocked = await firstCard.evaluate(el => el.classList.contains('locked'));
    expect(nowLocked).toBe(!initiallyLocked);
  });
});
