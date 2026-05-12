const { test, expect } = require('@playwright/test');
const { setupEditor } = require('./helpers');

/**
 * Test for mobile selection bug on the reorder screen.
 * Reproduces bug where tapping an item on mobile does not select it.
 *
 * Bug: On phone, selecting an item in reorder screen does not work.
 * Expected: Tapping an item should select it (add 'selected' class).
 * Actual: Item does not get selected when tapped on mobile.
 */

// Use mobile device configuration
test.use({
  viewport: { width: 390, height: 844 }, // iPhone 13 size
  isMobile: true,
  hasTouch: true,
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
});

test.describe('Editor Screen - Mobile Selection Bug', () => {
  test.beforeEach(async ({ page, context }) => {
    await setupEditor(page, context);
  });

  test('should select item when tapped on mobile', async ({ page }) => {
    // Wait for items to load
    await page.waitForSelector('.item-card', { timeout: 10000 });

    const itemCards = page.locator('.item-card:not(.removed)');
    const count = await itemCards.count();
    expect(count).toBeGreaterThanOrEqual(1);

    // Get the first non-removed item
    const firstCard = itemCards.first();

    // Verify item is not selected initially
    const initiallySelected = await firstCard.evaluate(el => el.classList.contains('selected'));
    expect(initiallySelected).toBe(false);

    // Get the item content area (not drag handle)
    const itemContent = firstCard.locator('.item-left');
    await expect(itemContent).toBeVisible();

    const contentBox = await itemContent.boundingBox();
    if (!contentBox) {
      throw new Error('Could not get item content bounding box');
    }

    // Simulate a tap on the item content (not drag handle)
    const tapX = contentBox.x + contentBox.width / 2;
    const tapY = contentBox.y + contentBox.height / 2;

    // Dispatch touch events to simulate a tap
    await page.evaluate((coords) => {
      const itemContent = document.querySelector('.item-card:not(.removed) .item-left');
      const card = itemContent.closest('.item-card');

      // Create touch object
      const touch = new Touch({
        identifier: 1,
        target: itemContent,
        clientX: coords.tapX,
        clientY: coords.tapY,
        screenX: coords.tapX,
        screenY: coords.tapY,
      });

      // Dispatch touchstart
      card.dispatchEvent(new TouchEvent('touchstart', {
        touches: [touch],
        changedTouches: [touch],
        bubbles: true,
        cancelable: true,
      }));

      // Wait a tiny bit (simulate real tap, not a swipe)
      // Then dispatch touchend at the same position
      setTimeout(() => {
        const touchEnd = new Touch({
          identifier: 1,
          target: itemContent,
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

        // The click event should be triggered after touchend
        // Simulate it if the browser doesn't do it automatically
        setTimeout(() => {
          card.click();
        }, 10);
      }, 50);
    }, { tapX, tapY });

    // Wait for selection to occur
    await page.waitForTimeout(300);

    // Verify item is now selected
    const isSelected = await firstCard.evaluate(el => el.classList.contains('selected'));
    expect(isSelected).toBe(true);
  });

  test('should keep selection when tapping same item twice on mobile', async ({ page }) => {
    // Wait for items to load
    await page.waitForSelector('.item-card', { timeout: 10000 });

    const firstCard = page.locator('.item-card:not(.removed)').first();
    const itemContent = firstCard.locator('.item-left');

    const contentBox = await itemContent.boundingBox();
    if (!contentBox) {
      throw new Error('Could not get item content bounding box');
    }

    const tapX = contentBox.x + contentBox.width / 2;
    const tapY = contentBox.y + contentBox.height / 2;

    // Helper function to tap the item
    const tapItem = async () => {
      await page.evaluate((coords) => {
        const itemContent = document.querySelector('.item-card:not(.removed) .item-left');
        const card = itemContent.closest('.item-card');

        const touch = new Touch({
          identifier: 1,
          target: itemContent,
          clientX: coords.tapX,
          clientY: coords.tapY,
          screenX: coords.tapX,
          screenY: coords.tapY,
        });

        card.dispatchEvent(new TouchEvent('touchstart', {
          touches: [touch],
          changedTouches: [touch],
          bubbles: true,
          cancelable: true,
        }));

        setTimeout(() => {
          const touchEnd = new Touch({
            identifier: 1,
            target: itemContent,
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

      await page.waitForTimeout(200);
    };

    // First tap - should select
    await tapItem();
    await page.waitForTimeout(50); // Extra wait for render
    let isSelected = await page.locator('.item-card:not(.removed)').first().evaluate(el => el.classList.contains('selected'));
    expect(isSelected).toBe(true);

    // Second tap - should stay selected (not toggle)
    await page.waitForTimeout(500); // Wait longer than double-tap window (400ms)
    await tapItem();
    await page.waitForTimeout(50); // Extra wait for render
    isSelected = await page.locator('.item-card:not(.removed)').first().evaluate(el => el.classList.contains('selected'));
    expect(isSelected).toBe(true); // Should STILL be selected
  });

  test('should switch selection when tapping different items on mobile', async ({ page }) => {
    // Wait for items to load
    await page.waitForSelector('.item-card', { timeout: 10000 });

    const itemCards = page.locator('.item-card:not(.removed)');
    const count = await itemCards.count();
    expect(count).toBeGreaterThanOrEqual(2);

    const firstCard = itemCards.first();
    const secondCard = itemCards.nth(1);

    // Helper to tap an item by its content area
    const tapItemCard = async (card) => {
      const itemContent = card.locator('.item-left');
      const contentBox = await itemContent.boundingBox();
      if (!contentBox) {
        throw new Error('Could not get item content bounding box');
      }

      const tapX = contentBox.x + contentBox.width / 2;
      const tapY = contentBox.y + contentBox.height / 2;

      await page.evaluate((coords) => {
        const elements = document.elementsFromPoint(coords.tapX, coords.tapY);
        const card = elements.find(el => el.classList.contains('item-card'));

        if (!card) {
          throw new Error('Card not found at tap coordinates');
        }

        const touch = new Touch({
          identifier: 1,
          target: card,
          clientX: coords.tapX,
          clientY: coords.tapY,
          screenX: coords.tapX,
          screenY: coords.tapY,
        });

        card.dispatchEvent(new TouchEvent('touchstart', {
          touches: [touch],
          changedTouches: [touch],
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

      await page.waitForTimeout(200);
    };

    // Tap first item
    await tapItemCard(firstCard);

    // Verify first item is selected
    let firstSelected = await firstCard.evaluate(el => el.classList.contains('selected'));
    let secondSelected = await secondCard.evaluate(el => el.classList.contains('selected'));
    expect(firstSelected).toBe(true);
    expect(secondSelected).toBe(false);

    // Tap second item
    await tapItemCard(secondCard);

    // Verify selection moved to second item
    firstSelected = await firstCard.evaluate(el => el.classList.contains('selected'));
    secondSelected = await secondCard.evaluate(el => el.classList.contains('selected'));
    expect(firstSelected).toBe(false);
    expect(secondSelected).toBe(true);
  });

  test('should not select item when swiping on mobile', async ({ page }) => {
    // Wait for items to load
    await page.waitForSelector('.item-card', { timeout: 10000 });

    const firstCard = page.locator('.item-card:not(.removed)').first();
    const itemContent = firstCard.locator('.item-left');

    const contentBox = await itemContent.boundingBox();
    if (!contentBox) {
      throw new Error('Could not get item content bounding box');
    }

    const startX = contentBox.x + contentBox.width / 2;
    const startY = contentBox.y + contentBox.height / 2;
    const endX = startX + 100; // Swipe right
    const endY = startY;

    // Simulate a swipe (not a tap)
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

      // Move to end position (swipe gesture)
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
      }, 50);
    }, { startX, startY, endX, endY });

    // Wait for any actions to complete
    await page.waitForTimeout(500);

    // Verify item is NOT selected (swipe should not select)
    // Swipe right = lock/unlock, not select
    const isSelected = await firstCard.evaluate(el => el.classList.contains('selected'));
    expect(isSelected).toBe(false);
  });

  test('should enable edit button when item is selected on mobile', async ({ page }) => {
    // Wait for items to load
    await page.waitForSelector('.item-card', { timeout: 10000 });

    const firstCard = page.locator('.item-card:not(.removed)').first();
    const editButton = page.locator('#btn-edit-item');

    // Edit button should be disabled initially
    const initiallyDisabled = await editButton.isDisabled();
    expect(initiallyDisabled).toBe(true);

    // Tap item to select
    const itemContent = firstCard.locator('.item-left');
    const contentBox = await itemContent.boundingBox();
    if (!contentBox) {
      throw new Error('Could not get item content bounding box');
    }

    const tapX = contentBox.x + contentBox.width / 2;
    const tapY = contentBox.y + contentBox.height / 2;

    await page.evaluate((coords) => {
      const itemContent = document.querySelector('.item-card:not(.removed) .item-left');
      const card = itemContent.closest('.item-card');

      const touch = new Touch({
        identifier: 1,
        target: itemContent,
        clientX: coords.tapX,
        clientY: coords.tapY,
        screenX: coords.tapX,
        screenY: coords.tapY,
      });

      card.dispatchEvent(new TouchEvent('touchstart', {
        touches: [touch],
        changedTouches: [touch],
        bubbles: true,
        cancelable: true,
      }));

      setTimeout(() => {
        const touchEnd = new Touch({
          identifier: 1,
          target: itemContent,
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

    // Edit button should now be enabled
    const nowDisabled = await editButton.isDisabled();
    expect(nowDisabled).toBe(false);
  });
});
