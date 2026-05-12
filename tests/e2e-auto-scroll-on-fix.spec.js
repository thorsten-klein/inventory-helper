const { test, expect } = require('@playwright/test');
const { setupEditor } = require('./helpers');

/**
 * Tests for auto-scroll to next item feature after locking/editing items.
 * This feature should be on by default and can be turned off in settings.
 */

test.describe('Editor Screen - Auto-scroll on Fix', () => {
  test.beforeEach(async ({ page, context }) => {
    await setupEditor(page, context);
  });

  test('auto-scroll should be enabled by default', async ({ page }) => {
    // Open settings modal
    const btnSettings = page.locator('#btn-editor-settings');
    await btnSettings.click();

    // Wait for modal to be visible
    const modal = page.locator('#editor-settings-modal');
    await expect(modal).not.toHaveClass(/hidden/);

    // Check that auto-scroll checkbox is checked by default
    const autoScrollCheckbox = page.locator('#speech-auto-scroll');
    await expect(autoScrollCheckbox).toBeChecked();

    // Close modal
    const btnCancel = page.locator('#btn-cancel-settings');
    await btnCancel.click();
  });

  test('should scroll to next item after locking an item (auto-scroll ON)', async ({ page }) => {
    // Wait for items to load
    await page.waitForSelector('.item-card', { timeout: 10000 });

    const itemCards = page.locator('.item-card:not(.removed)');
    const count = await itemCards.count();
    expect(count).toBeGreaterThanOrEqual(3);

    // Select first item
    const firstCard = itemCards.first();
    await firstCard.click();

    // Wait for selection
    await page.waitForTimeout(300);

    // Get the position of the first card on screen
    const firstCardBox = await firstCard.boundingBox();
    if (!firstCardBox) throw new Error('Could not get first card bounding box');
    const firstCardTop = firstCardBox.y;

    // Get EAN of first and second items
    const firstEan = await firstCard.locator('.item-ean').textContent();
    const secondEan = await itemCards.nth(1).locator('.item-ean').textContent();

    // Lock the first item by swiping right (increased swipe distance)
    await page.evaluate(() => {
      const firstCard = document.querySelector('.item-card:not(.removed)');
      const startX = 100;
      const startY = 200;

      // Touch start
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

      // Swipe right (increased distance to ensure detection)
      const touchMove = new Touch({
        identifier: 1,
        target: firstCard,
        clientX: startX + 200, // Increased swipe distance
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

      // Touch end
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
    await page.waitForTimeout(500);

    // Verify that the second item is now selected
    const selectedCard = page.locator('.item-card.selected');
    const selectedEan = await selectedCard.locator('.item-ean').textContent();
    expect(selectedEan).toBe(secondEan);

    // Verify that the selected item (second item) is positioned similarly to where the first item was
    const selectedCardBox = await selectedCard.boundingBox();
    if (!selectedCardBox) throw new Error('Could not get selected card bounding box');
    const selectedCardTop = selectedCardBox.y;

    // Allow some tolerance for scroll positioning (increased to 150 for margin of error)
    expect(Math.abs(selectedCardTop - firstCardTop)).toBeLessThan(150);
  });

  test('should scroll to next item after editing an item (auto-scroll ON)', async ({ page }) => {
    // Wait for items to load
    await page.waitForSelector('.item-card', { timeout: 10000 });

    const itemCards = page.locator('.item-card:not(.removed)');
    const count = await itemCards.count();
    expect(count).toBeGreaterThanOrEqual(3);

    // Select first item
    const firstCard = itemCards.first();
    await firstCard.click();

    // Wait for selection
    await page.waitForTimeout(300);

    // Get EAN of second item
    const secondEan = await itemCards.nth(1).locator('.item-ean').textContent();

    // Open edit modal by clicking the edit button instead of double-clicking
    const btnEdit = page.locator('#btn-edit-item');
    await btnEdit.click();

    // Wait for edit modal
    const editModal = page.locator('#edit-modal');
    await expect(editModal).not.toHaveClass(/hidden/);

    // Click save without making changes
    const btnSave = page.locator('#btn-save-edit');
    await btnSave.click();

    // Wait for auto-scroll animation
    await page.waitForTimeout(500);

    // Verify that the second item is now selected
    const selectedCard = page.locator('.item-card.selected');
    const selectedEan = await selectedCard.locator('.item-ean').textContent();
    expect(selectedEan).toBe(secondEan);
  });

  test('should NOT auto-scroll when feature is disabled', async ({ page }) => {
    // Open settings modal and disable auto-scroll
    const btnSettings = page.locator('#btn-editor-settings');
    await btnSettings.click();

    const modal = page.locator('#editor-settings-modal');
    await expect(modal).not.toHaveClass(/hidden/);

    // Disable auto-scroll using evaluate to directly set the checkbox
    await page.evaluate(() => {
      const checkbox = document.getElementById('speech-auto-scroll');
      if (checkbox) {
        checkbox.checked = false;
      }
    });

    // Save settings
    const btnSave = page.locator('#btn-save-settings');
    await btnSave.click();

    // Wait for items to load
    await page.waitForSelector('.item-card', { timeout: 10000 });

    const itemCards = page.locator('.item-card:not(.removed)');

    // Select first item
    const firstCard = itemCards.first();
    await firstCard.click();

    await page.waitForTimeout(300);

    // Get EAN of first item
    const firstEan = await firstCard.locator('.item-ean').textContent();

    // Lock the first item by swiping right
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
        clientX: startX + 150,
        clientY: startY,
        screenX: startX + 150,
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
        clientX: startX + 150,
        clientY: startY,
        screenX: startX + 150,
        screenY: startY,
      });

      firstCard.dispatchEvent(new TouchEvent('touchend', {
        touches: [],
        changedTouches: [touchEnd],
        bubbles: true,
        cancelable: true,
      }));
    });

    // Wait a bit
    await page.waitForTimeout(500);

    // Verify that the first item is STILL selected (no auto-scroll happened)
    const selectedCard = page.locator('.item-card.selected');
    const selectedEan = await selectedCard.locator('.item-ean').textContent();
    expect(selectedEan).toBe(firstEan);

    // Verify item is locked (check appState directly)
    const isLocked = await page.evaluate(() => {
      const selectedItem = appState.items[appState.selectedItemIndex];
      return selectedItem ? selectedItem.locked : false;
    });
    expect(isLocked).toBe(true);
  });

  test('should not auto-scroll when unlocking an item', async ({ page }) => {
    // Wait for items to load
    await page.waitForSelector('.item-card', { timeout: 10000 });

    const itemCards = page.locator('.item-card:not(.removed)');

    // Select first item and lock it
    const firstCard = itemCards.first();
    await firstCard.click();
    await page.waitForTimeout(300);

    const firstEan = await firstCard.locator('.item-ean').textContent();

    // Lock the item (first swipe)
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
        clientX: startX + 150,
        clientY: startY,
        screenX: startX + 150,
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
        clientX: startX + 150,
        clientY: startY,
        screenX: startX + 150,
        screenY: startY,
      });

      firstCard.dispatchEvent(new TouchEvent('touchend', {
        touches: [],
        changedTouches: [touchEnd],
        bubbles: true,
        cancelable: true,
      }));
    });

    await page.waitForTimeout(500);

    // Now the second item should be selected (due to auto-scroll after lock)
    // Re-select the first (now locked) item
    const lockedCard = page.locator('.item-card.locked').first();
    await lockedCard.click();
    await page.waitForTimeout(300);

    // Unlock it (swipe right again)
    await page.evaluate(() => {
      const lockedCard = document.querySelector('.item-card.locked');
      const startX = 100;
      const startY = 200;

      const touchStart = new Touch({
        identifier: 1,
        target: lockedCard,
        clientX: startX,
        clientY: startY,
        screenX: startX,
        screenY: startY,
      });

      lockedCard.dispatchEvent(new TouchEvent('touchstart', {
        touches: [touchStart],
        changedTouches: [touchStart],
        bubbles: true,
        cancelable: true,
      }));

      const touchMove = new Touch({
        identifier: 1,
        target: lockedCard,
        clientX: startX + 150,
        clientY: startY,
        screenX: startX + 150,
        screenY: startY,
      });

      lockedCard.dispatchEvent(new TouchEvent('touchmove', {
        touches: [touchMove],
        changedTouches: [touchMove],
        bubbles: true,
        cancelable: true,
      }));

      const touchEnd = new Touch({
        identifier: 1,
        target: lockedCard,
        clientX: startX + 150,
        clientY: startY,
        screenX: startX + 150,
        screenY: startY,
      });

      lockedCard.dispatchEvent(new TouchEvent('touchend', {
        touches: [],
        changedTouches: [touchEnd],
        bubbles: true,
        cancelable: true,
      }));
    });

    await page.waitForTimeout(500);

    // Verify first item is still selected (no auto-scroll on unlock)
    const selectedCard = page.locator('.item-card.selected');
    const selectedEan = await selectedCard.locator('.item-ean').textContent();
    expect(selectedEan).toBe(firstEan);

    // Verify item is no longer locked
    const hasLockedClass = await selectedCard.evaluate(el => el.classList.contains('locked'));
    expect(hasLockedClass).toBe(false);
  });
});
