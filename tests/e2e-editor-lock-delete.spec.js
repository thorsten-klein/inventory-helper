const { test, expect } = require('@playwright/test');
const { setupEditor } = require('./helpers');

test.describe('Editor Screen - Lock and Delete Items', () => {
  test.beforeEach(async ({ page, context }) => {
    await setupEditor(page, context);

    // Disable auto-scroll for these tests to maintain existing behavior
    const disabled = await page.evaluate(() => {
      if (typeof appState !== 'undefined' && appState.editorSettings) {
        appState.editorSettings.autoScrollOnFix = false;
        return true;
      }
      return false;
    });

    if (!disabled) {
      console.log('Warning: Could not disable auto-scroll - appState may not be available yet');
    }
  });

  test('should lock item with mouse swipe right', async ({ page }) => {
    // Get the first non-removed item card
    const itemCard = page.locator('.item-card').first();
    await expect(itemCard).toBeVisible();

    // Get item index
    const itemIndex = await itemCard.getAttribute('data-item-index');

    // Check initial state - should not be locked
    const initialLocked = await itemCard.evaluate(card => card.classList.contains('locked'));
    expect(initialLocked).toBe(false);

    // Get card bounding box
    const box = await itemCard.boundingBox();
    if (!box) throw new Error('Could not get item card bounding box');

    // Simulate swipe right with mouse
    await page.mouse.move(box.x + 50, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width - 50, box.y + box.height / 2, { steps: 10 });
    await page.mouse.up();
    // Removed 500ms timeout

    // Check if item is now locked
    const locked = await page.locator('.item-card').nth(parseInt(itemIndex)).evaluate(card =>
      card.classList.contains('locked')
    );
    expect(locked).toBe(true);

    // Verify the item is selected after swipe
    const selected = await page.locator('.item-card').nth(parseInt(itemIndex)).evaluate(card =>
      card.classList.contains('selected')
    );
    expect(selected).toBe(true);

    // Verify lock badge is visible
    const lockBadge = page.locator('.item-card').nth(parseInt(itemIndex)).locator('.lock-badge');
    await expect(lockBadge).toBeVisible();
  });

  test('should unlock item with mouse swipe right when already locked', async ({ page }) => {
    // Get the first non-removed item card
    const itemCard = page.locator('.item-card').first();
    const itemIndex = await itemCard.getAttribute('data-item-index');
    const box = await itemCard.boundingBox();
    if (!box) throw new Error('Could not get item card bounding box');

    // First swipe right to lock
    await page.mouse.move(box.x + 50, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width - 50, box.y + box.height / 2, { steps: 10 });
    await page.mouse.up();
    // Removed 500ms timeout

    // Verify locked
    let locked = await page.locator('.item-card').nth(parseInt(itemIndex)).evaluate(card =>
      card.classList.contains('locked')
    );
    expect(locked).toBe(true);

    // Get updated box after re-render
    const box2 = await page.locator('.item-card').nth(parseInt(itemIndex)).boundingBox();
    if (!box2) throw new Error('Could not get item card bounding box after lock');

    // Swipe right again to unlock
    await page.mouse.move(box2.x + 50, box2.y + box2.height / 2);
    await page.mouse.down();
    await page.mouse.move(box2.x + box2.width - 50, box2.y + box2.height / 2, { steps: 10 });
    await page.mouse.up();
    // Removed 500ms timeout

    // Verify unlocked
    locked = await page.locator('.item-card').nth(parseInt(itemIndex)).evaluate(card =>
      card.classList.contains('locked')
    );
    expect(locked).toBe(false);
  });

  test('should mark item as removed with mouse swipe left and confirmation', async ({ page }) => {
    // Get the first non-removed item card
    const itemCard = page.locator('.item-card').first();
    const itemIndex = await itemCard.getAttribute('data-item-index');
    const box = await itemCard.boundingBox();
    if (!box) throw new Error('Could not get item card bounding box');

    // Simulate swipe left with mouse
    await page.mouse.move(box.x + box.width - 50, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + 50, box.y + box.height / 2, { steps: 10 });
    await page.mouse.up();
    // Removed 500ms timeout

    // Confirmation modal should appear
    const confirmModal = page.locator('#confirm-remove-modal');
    await expect(confirmModal).toBeVisible();

    // Click confirm
    await page.click('#btn-confirm-remove');
    // Removed 500ms timeout

    // Item should now be in "Deleted Items" section
    const deletedHeader = page.locator('.deleted-header');
    await expect(deletedHeader).toBeVisible();

    // Find the removed item in deleted section
    const removedCard = page.locator('.item-card.removed').first();
    await expect(removedCard).toBeVisible();
  });

  test('should cancel delete when clicking cancel in confirmation modal', async ({ page }) => {
    const itemCard = page.locator('.item-card').first();
    const box = await itemCard.boundingBox();
    if (!box) throw new Error('Could not get item card bounding box');

    // Simulate swipe left with mouse
    await page.mouse.move(box.x + box.width - 50, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + 50, box.y + box.height / 2, { steps: 10 });
    await page.mouse.up();
    // Removed 500ms timeout

    // Confirmation modal should appear
    const confirmModal = page.locator('#confirm-remove-modal');
    await expect(confirmModal).toBeVisible();

    // Click cancel
    await page.click('#btn-cancel-remove');
    // Removed 500ms timeout

    // Modal should be hidden
    await expect(confirmModal).not.toBeVisible();

    // Item should still be in active items (not removed)
    const activeItemsExist = await page.locator('.item-card:not(.removed)').count();
    expect(activeItemsExist).toBeGreaterThan(0);
  });

  test('should lock item with touch swipe right', async ({ page }) => {
    // Get the first non-removed item card
    const itemCard = page.locator('.item-card').first();
    const itemIndex = await itemCard.getAttribute('data-item-index');
    const box = await itemCard.boundingBox();
    if (!box) throw new Error('Could not get item card bounding box');

    // Simulate touch swipe right
    await page.evaluate((coords) => {
      const card = document.elementFromPoint(coords.x, coords.y).closest('.item-card');
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
        cancelable: true
      }));

      // Add touchmove events to simulate swipe
      const steps = 10;
      for (let i = 1; i <= steps; i++) {
        const x = coords.startX + (coords.endX - coords.startX) * (i / steps);
        const touchMove = new Touch({
          identifier: 1,
          target: card,
          clientX: x,
          clientY: coords.startY,
          screenX: x,
          screenY: coords.startY,
        });

        card.dispatchEvent(new TouchEvent('touchmove', {
          touches: [touchMove],
          changedTouches: [touchMove],
          bubbles: true,
          cancelable: true
        }));
      }

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
        cancelable: true
      }));
    }, {
      x: box.x + 50,
      y: box.y + box.height / 2,
      startX: box.x + 50,
      startY: box.y + box.height / 2,
      endX: box.x + box.width - 50,
      endY: box.y + box.height / 2
    });
    // Removed 500ms timeout

    // Check if item is now locked
    const locked = await page.locator('.item-card').nth(parseInt(itemIndex)).evaluate(card =>
      card.classList.contains('locked')
    );
    expect(locked).toBe(true);
  });

  test('should mark item as removed with touch swipe left and confirmation', async ({ page }) => {
    const itemCard = page.locator('.item-card').first();
    const itemIndex = await itemCard.getAttribute('data-item-index');
    const box = await itemCard.boundingBox();
    if (!box) throw new Error('Could not get item card bounding box');

    // Simulate touch swipe left
    await page.evaluate((coords) => {
      const card = document.elementFromPoint(coords.x, coords.y).closest('.item-card');
      const touchStart = new Touch({
        identifier: 1,
        target: card,
        clientX: coords.startX,
        clientY: coords.startY,
        screenX: coords.startX,
        screenY: coords.startY,
      });
      const touchEnd = new Touch({
        identifier: 1,
        target: card,
        clientX: coords.endX,
        clientY: coords.endY,
        screenX: coords.endX,
        screenY: coords.endY,
      });

      card.dispatchEvent(new TouchEvent('touchstart', {
        touches: [touchStart],
        changedTouches: [touchStart],
        bubbles: true
      }));

      card.dispatchEvent(new TouchEvent('touchend', {
        touches: [],
        changedTouches: [touchEnd],
        bubbles: true
      }));
    }, {
      x: box.x + box.width - 50,
      y: box.y + box.height / 2,
      startX: box.x + box.width - 50,
      startY: box.y + box.height / 2,
      endX: box.x + 50,
      endY: box.y + box.height / 2
    });
    // Removed 500ms timeout

    // Confirmation modal should appear
    const confirmModal = page.locator('#confirm-remove-modal');
    await expect(confirmModal).toBeVisible();

    // Click confirm
    await page.click('#btn-confirm-remove');
    // Removed 500ms timeout

    // Item should be removed
    const removedCard = page.locator('.item-card.removed').first();
    await expect(removedCard).toBeVisible();
  });

  test('should restore removed item with swipe left again', async ({ page }) => {
    const itemCard = page.locator('.item-card').first();
    const box = await itemCard.boundingBox();
    if (!box) throw new Error('Could not get item card bounding box');

    // First remove the item
    await page.mouse.move(box.x + box.width - 50, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + 50, box.y + box.height / 2, { steps: 10 });
    await page.mouse.up();
    // Removed 500ms timeout
    await page.click('#btn-confirm-remove');
    // Removed 500ms timeout

    // Find the removed item
    const removedCard = page.locator('.item-card.removed').first();
    await expect(removedCard).toBeVisible();

    const removedBox = await removedCard.boundingBox();
    if (!removedBox) throw new Error('Could not get removed card bounding box');

    // Swipe left on removed item to restore
    await page.mouse.move(removedBox.x + removedBox.width - 50, removedBox.y + removedBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(removedBox.x + 50, removedBox.y + removedBox.height / 2, { steps: 10 });
    await page.mouse.up();
    // Removed 500ms timeout

    // Item should be restored (no longer removed)
    const activeItemsCount = await page.locator('.item-card:not(.removed)').count();
    expect(activeItemsCount).toBeGreaterThan(0);
  });

  test('should not allow locking removed items', async ({ page }) => {
    const itemCard = page.locator('.item-card').first();
    const box = await itemCard.boundingBox();
    if (!box) throw new Error('Could not get item card bounding box');

    // First remove the item
    await page.mouse.move(box.x + box.width - 50, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + 50, box.y + box.height / 2, { steps: 10 });
    await page.mouse.up();
    // Removed 500ms timeout
    await page.click('#btn-confirm-remove');
    // Removed 500ms timeout

    // Find the removed item
    const removedCard = page.locator('.item-card.removed').first();
    await expect(removedCard).toBeVisible();

    const removedBox = await removedCard.boundingBox();
    if (!removedBox) throw new Error('Could not get removed card bounding box');

    // Try to swipe right on removed item (should not lock)
    await page.mouse.move(removedBox.x + 50, removedBox.y + removedBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(removedBox.x + removedBox.width - 50, removedBox.y + removedBox.height / 2, { steps: 10 });
    await page.mouse.up();
    // Removed 500ms timeout

    // Item should still be removed and not locked
    const isLocked = await removedCard.evaluate(card => card.classList.contains('locked'));
    expect(isLocked).toBe(false);
  });
});
