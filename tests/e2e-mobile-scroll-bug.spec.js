const { test, expect } = require('@playwright/test');
const { setupEditor } = require('./helpers');

/**
 * Test for mobile scroll bug on the reorder screen.
 * Reproduces bug where scrolling selects the item where the scroll stops.
 *
 * Bug: When scrolling the list, the item where touchend occurs gets selected.
 * Expected: Scrolling should not select items - only taps should select.
 * Actual: Item is selected when user scrolls and releases touch.
 */

// Use mobile device configuration
test.use({
  viewport: { width: 390, height: 844 }, // iPhone 13 size
  isMobile: true,
  hasTouch: true,
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
});

test.describe('Editor Screen - Mobile Scroll Bug', () => {
  test.beforeEach(async ({ page, context }) => {
    await setupEditor(page, context);
  });

  test('should not select item when scrolling vertically', async ({ page }) => {
    // Wait for items to load
    await page.waitForSelector('.item-card', { timeout: 10000 });

    const itemCards = page.locator('.item-card:not(.removed)');
    const count = await itemCards.count();
    expect(count).toBeGreaterThanOrEqual(3);

    // Get the first item
    const firstCard = itemCards.first();

    // Verify no items are selected initially
    const initialSelection = await page.locator('.item-card.selected').count();
    expect(initialSelection).toBe(0);

    // Get item position
    const cardBox = await firstCard.boundingBox();
    if (!cardBox) {
      throw new Error('Could not get card bounding box');
    }

    // Simulate vertical scroll gesture (start on item, scroll down)
    const startX = cardBox.x + cardBox.width / 2;
    const startY = cardBox.y + cardBox.height / 2;
    const endX = startX; // No horizontal movement
    const endY = startY + 150; // Scroll down 150px

    await page.evaluate((coords) => {
      const itemCards = document.querySelectorAll('.item-card:not(.removed)');
      const card = itemCards[0];

      // Start touch on first item
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

      // Simulate scroll movement
      setTimeout(() => {
        const touchMove = new Touch({
          identifier: 1,
          target: card,
          clientX: coords.endX,
          clientY: coords.endY,
          screenX: coords.endX,
          screenY: coords.endY,
        });

        card.dispatchEvent(new TouchEvent('touchmove', {
          touches: [touchMove],
          changedTouches: [touchMove],
          bubbles: true,
          cancelable: true,
        }));

        // End touch after scroll
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
        }, 50);
      }, 50);
    }, { startX, startY, endX, endY });

    // Wait for any events to process
    await page.waitForTimeout(300);

    // Verify that no item was selected (scroll should not select)
    const selectedCount = await page.locator('.item-card.selected').count();
    expect(selectedCount).toBe(0);
  });

  test('should not select item when scrolling upward', async ({ page }) => {
    // Wait for items to load
    await page.waitForSelector('.item-card', { timeout: 10000 });

    const itemCards = page.locator('.item-card:not(.removed)');
    const count = await itemCards.count();
    expect(count).toBeGreaterThanOrEqual(3);

    // Get the third item (to scroll up from)
    const thirdCard = itemCards.nth(2);

    // Verify no items are selected initially
    const initialSelection = await page.locator('.item-card.selected').count();
    expect(initialSelection).toBe(0);

    const cardBox = await thirdCard.boundingBox();
    if (!cardBox) {
      throw new Error('Could not get card bounding box');
    }

    // Simulate upward scroll gesture
    const startX = cardBox.x + cardBox.width / 2;
    const startY = cardBox.y + cardBox.height / 2;
    const endX = startX;
    const endY = startY - 150; // Scroll up 150px

    await page.evaluate((coords) => {
      const itemCards = document.querySelectorAll('.item-card:not(.removed)');
      const card = itemCards[2];

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
        const touchMove = new Touch({
          identifier: 1,
          target: card,
          clientX: coords.endX,
          clientY: coords.endY,
          screenX: coords.endX,
          screenY: coords.endY,
        });

        card.dispatchEvent(new TouchEvent('touchmove', {
          touches: [touchMove],
          changedTouches: [touchMove],
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
        }, 50);
      }, 50);
    }, { startX, startY, endX, endY });

    await page.waitForTimeout(300);

    // Verify no item was selected
    const selectedCount = await page.locator('.item-card.selected').count();
    expect(selectedCount).toBe(0);
  });

  test('should select item when tapping (no scroll)', async ({ page }) => {
    // Wait for items to load
    await page.waitForSelector('.item-card', { timeout: 10000 });

    const firstCard = page.locator('.item-card:not(.removed)').first();

    // Verify no items selected initially
    const initialSelection = await page.locator('.item-card.selected').count();
    expect(initialSelection).toBe(0);

    const cardBox = await firstCard.boundingBox();
    if (!cardBox) {
      throw new Error('Could not get card bounding box');
    }

    // Simulate tap (minimal movement)
    const tapX = cardBox.x + cardBox.width / 2;
    const tapY = cardBox.y + cardBox.height / 2;

    await page.evaluate((coords) => {
      const card = document.querySelector('.item-card:not(.removed)');

      const touchStart = new Touch({
        identifier: 1,
        target: card,
        clientX: coords.tapX,
        clientY: coords.tapY,
        screenX: coords.tapX,
        screenY: coords.tapY,
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
          clientX: coords.tapX,
          clientY: coords.tapY,
          screenX: coords.tapX,
          screenY: coords.tapY,
        });

        card.dispatchEvent(new TouchEvent('touchend', {
          touches: [],
          changedTouches: [touchEnd],
          bubbles: true,
          cancelable: true,
        }));

        setTimeout(() => {
          card.click();
        }, 10);
      }, 50);
    }, { tapX, tapY });

    await page.waitForTimeout(300);

    // Verify item WAS selected (tap should select)
    const isSelected = await firstCard.evaluate(el => el.classList.contains('selected'));
    expect(isSelected).toBe(true);
  });

  test('should differentiate between scroll and diagonal swipe', async ({ page }) => {
    // Wait for items to load
    await page.waitForSelector('.item-card', { timeout: 10000 });

    const firstCard = page.locator('.item-card:not(.removed)').first();

    const cardBox = await firstCard.boundingBox();
    if (!cardBox) {
      throw new Error('Could not get card bounding box');
    }

    // Check initial locked state
    const initiallyLocked = await firstCard.evaluate(el => el.classList.contains('locked'));

    // Simulate diagonal scroll (mostly vertical, some horizontal)
    // This should be treated as scroll, not swipe
    const startX = cardBox.x + cardBox.width / 2;
    const startY = cardBox.y + cardBox.height / 2;
    const endX = startX + 30; // Small horizontal component
    const endY = startY + 120; // Large vertical component (scroll)

    await page.evaluate((coords) => {
      const card = document.querySelector('.item-card:not(.removed)');

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
        const touchMove = new Touch({
          identifier: 1,
          target: card,
          clientX: coords.endX,
          clientY: coords.endY,
          screenX: coords.endX,
          screenY: coords.endY,
        });

        card.dispatchEvent(new TouchEvent('touchmove', {
          touches: [touchMove],
          changedTouches: [touchMove],
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
        }, 50);
      }, 50);
    }, { startX, startY, endX, endY });

    await page.waitForTimeout(300);

    // Should NOT select (vertical movement means scroll)
    const isSelected = await firstCard.evaluate(el => el.classList.contains('selected'));
    expect(isSelected).toBe(false);

    // Should NOT lock/unlock (not a horizontal swipe)
    const nowLocked = await firstCard.evaluate(el => el.classList.contains('locked'));
    expect(nowLocked).toBe(initiallyLocked);
  });

  test('should handle fast scroll flick without selecting', async ({ page }) => {
    // Wait for items to load
    await page.waitForSelector('.item-card', { timeout: 10000 });

    const secondCard = page.locator('.item-card:not(.removed)').nth(1);

    const cardBox = await secondCard.boundingBox();
    if (!cardBox) {
      throw new Error('Could not get card bounding box');
    }

    // Simulate fast scroll flick (large vertical movement)
    const startX = cardBox.x + cardBox.width / 2;
    const startY = cardBox.y + cardBox.height / 2;
    const endX = startX + 10; // Minimal horizontal
    const endY = startY + 250; // Large vertical movement

    await page.evaluate((coords) => {
      const itemCards = document.querySelectorAll('.item-card:not(.removed)');
      const card = itemCards[1];

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
        const touchMove = new Touch({
          identifier: 1,
          target: card,
          clientX: coords.endX,
          clientY: coords.endY,
          screenX: coords.endX,
          screenY: coords.endY,
        });

        card.dispatchEvent(new TouchEvent('touchmove', {
          touches: [touchMove],
          changedTouches: [touchMove],
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
        }, 30); // Quick gesture
      }, 20);
    }, { startX, startY, endX, endY });

    await page.waitForTimeout(300);

    // Should NOT select
    const selectedCount = await page.locator('.item-card.selected').count();
    expect(selectedCount).toBe(0);
  });
});
