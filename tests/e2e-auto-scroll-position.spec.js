const { test, expect } = require('@playwright/test');
const { setupEditor } = require('./helpers');

/**
 * Tests that verify the next item appears at the EXACT same position on screen
 * after fixing (locking/editing) an item.
 */

test.describe('Editor Screen - Auto-scroll Position Accuracy', () => {
  test.beforeEach(async ({ page, context }) => {
    await setupEditor(page, context);

    // Make sure auto-scroll is enabled
    await page.evaluate(() => {
      if (window.appState && window.appState.editorSettings) {
        window.appState.editorSettings.autoScrollOnFix = true;
      }
    });
  });

  test('REPRODUCER: next item should appear at exact same Y position after locking', async ({ page }) => {
    // Wait for items to load
    await page.waitForSelector('.item-card', { timeout: 10000 });

    const itemCards = page.locator('.item-card:not(.removed)');
    const count = await itemCards.count();
    expect(count).toBeGreaterThanOrEqual(3);

    // Select first item
    const firstCard = itemCards.first();
    await firstCard.click();
    await page.waitForTimeout(300);

    // Get the Y position of the first card BEFORE locking
    const firstCardBox = await firstCard.boundingBox();
    if (!firstCardBox) throw new Error('Could not get first card bounding box');
    const firstCardY = firstCardBox.y;

    console.log('First card Y position before lock:', firstCardY);

    // Lock the item by swiping right
    await page.evaluate(() => {
      const firstCard = document.querySelector('.item-card:not(.removed)');
      const startX = 100;
      const startY = 200;

      const touchStart = new Touch({
        identifier: 1,
        target: firstCard,
        clientX: startX,
        clientY: startY,
        screenX: startX,
        screenY: startY,
      });

      firstCard.dispatchEvent(new TouchEvent('touchstart', {
        touches: [touchStart],
        changedTouches: [touchStart],
        bubbles: true,
        cancelable: true,
      }));

      const touchMove = new Touch({
        identifier: 1,
        target: firstCard,
        clientX: startX + 200,
        clientY: startY,
        screenX: startX + 200,
        screenY: startY,
      });

      firstCard.dispatchEvent(new TouchEvent('touchmove', {
        touches: [touchMove],
        changedTouches: [touchMove],
        bubbles: true,
        cancelable: true,
      }));

      const touchEnd = new Touch({
        identifier: 1,
        target: firstCard,
        clientX: startX + 200,
        clientY: startY,
        screenX: startX + 200,
        screenY: startY,
      });

      firstCard.dispatchEvent(new TouchEvent('touchend', {
        touches: [],
        changedTouches: [touchEnd],
        bubbles: true,
        cancelable: true,
      }));
    });

    // Wait for auto-scroll animation
    await page.waitForTimeout(600);

    // Get the Y position of the NOW SELECTED card (which should be the second item)
    const selectedCard = page.locator('.item-card.selected');
    const selectedCardBox = await selectedCard.boundingBox();
    if (!selectedCardBox) throw new Error('Could not get selected card bounding box');
    const selectedCardY = selectedCardBox.y;

    console.log('Selected card Y position after lock:', selectedCardY);
    console.log('Difference:', Math.abs(selectedCardY - firstCardY));

    // The selected card should be at approximately the same Y position as the first card was
    // Allow 5px tolerance for rounding/rendering differences
    expect(Math.abs(selectedCardY - firstCardY)).toBeLessThan(5);
  });

  test('REPRODUCER: next item should appear at exact same Y position after editing', async ({ page }) => {
    // Wait for items to load
    await page.waitForSelector('.item-card', { timeout: 10000 });

    const itemCards = page.locator('.item-card:not(.removed)');
    const count = await itemCards.count();
    expect(count).toBeGreaterThanOrEqual(3);

    // Select first item
    const firstCard = itemCards.first();
    await firstCard.click();
    await page.waitForTimeout(300);

    // Get the Y position of the first card BEFORE editing
    const firstCardBox = await firstCard.boundingBox();
    if (!firstCardBox) throw new Error('Could not get first card bounding box');
    const firstCardY = firstCardBox.y;

    console.log('First card Y position before edit:', firstCardY);

    // Open edit modal
    const btnEdit = page.locator('#btn-edit-item');
    await btnEdit.click();

    // Wait for modal
    const editModal = page.locator('#edit-modal');
    await expect(editModal).not.toHaveClass(/hidden/);

    // Save without changes
    const btnSave = page.locator('#btn-save-edit');
    await btnSave.click();

    // Wait for auto-scroll animation
    await page.waitForTimeout(600);

    // Get the Y position of the NOW SELECTED card (which should be the second item)
    const selectedCard = page.locator('.item-card.selected');
    const selectedCardBox = await selectedCard.boundingBox();
    if (!selectedCardBox) throw new Error('Could not get selected card bounding box');
    const selectedCardY = selectedCardBox.y;

    console.log('Selected card Y position after edit:', selectedCardY);
    console.log('Difference:', Math.abs(selectedCardY - firstCardY));

    // The selected card should be at approximately the same Y position as the first card was
    // Allow 5px tolerance for rounding/rendering differences
    expect(Math.abs(selectedCardY - firstCardY)).toBeLessThan(5);
  });

  test('should maintain position even when scrolled down in the list', async ({ page }) => {
    // Wait for items to load
    await page.waitForSelector('.item-card', { timeout: 10000 });

    // Scroll down to make sure we're not at the top
    await page.evaluate(() => {
      const itemsList = document.getElementById('items-list');
      if (itemsList) {
        itemsList.scrollTop = 300;
      } else {
        window.scrollTo(0, 300);
      }
    });

    await page.waitForTimeout(300);

    const itemCards = page.locator('.item-card:not(.removed)');

    // Select the 3rd item (so we're not at the top)
    const thirdCard = itemCards.nth(2);
    await thirdCard.click();
    await page.waitForTimeout(300);

    // Get the Y position of the third card BEFORE locking
    const thirdCardBox = await thirdCard.boundingBox();
    if (!thirdCardBox) throw new Error('Could not get third card bounding box');
    const thirdCardY = thirdCardBox.y;

    console.log('Third card Y position before lock:', thirdCardY);

    // Lock the item
    await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.item-card:not(.removed)'));
      const thirdCard = cards[2];
      const startX = 100;
      const startY = 200;

      const touchStart = new Touch({
        identifier: 1,
        target: thirdCard,
        clientX: startX,
        clientY: startY,
        screenX: startX,
        screenY: startY,
      });

      thirdCard.dispatchEvent(new TouchEvent('touchstart', {
        touches: [touchStart],
        changedTouches: [touchStart],
        bubbles: true,
        cancelable: true,
      }));

      const touchMove = new Touch({
        identifier: 1,
        target: thirdCard,
        clientX: startX + 200,
        clientY: startY,
        screenX: startX + 200,
        screenY: startY,
      });

      thirdCard.dispatchEvent(new TouchEvent('touchmove', {
        touches: [touchMove],
        changedTouches: [touchMove],
        bubbles: true,
        cancelable: true,
      }));

      const touchEnd = new Touch({
        identifier: 1,
        target: thirdCard,
        clientX: startX + 200,
        clientY: startY,
        screenX: startX + 200,
        screenY: startY,
      });

      thirdCard.dispatchEvent(new TouchEvent('touchend', {
        touches: [],
        changedTouches: [touchEnd],
        bubbles: true,
        cancelable: true,
      }));
    });

    // Wait for auto-scroll animation
    await page.waitForTimeout(600);

    // Get the Y position of the NOW SELECTED card
    const selectedCard = page.locator('.item-card.selected');
    const selectedCardBox = await selectedCard.boundingBox();
    if (!selectedCardBox) throw new Error('Could not get selected card bounding box');
    const selectedCardY = selectedCardBox.y;

    console.log('Selected card Y position after lock:', selectedCardY);
    console.log('Difference:', Math.abs(selectedCardY - thirdCardY));

    // The selected card should be at approximately the same Y position
    expect(Math.abs(selectedCardY - thirdCardY)).toBeLessThan(5);
  });
});
