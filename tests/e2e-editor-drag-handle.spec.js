const { test, expect } = require('@playwright/test');
const { setupEditor } = require('./helpers');

test.describe('Editor Screen - Drag Handle Functionality', () => {
  test.beforeEach(async ({ page, context }) => {
    await setupEditor(page, context);
  });

  test('should display drag handle on non-locked, non-removed items', async ({ page }) => {
    // Wait for items to load
    await page.waitForSelector('.item-card', { timeout: 10000 });

    // Get the first item card
    const itemCard = page.locator('.item-card').first();
    await expect(itemCard).toBeVisible();

    // If item is not locked and not removed, drag handle should be visible
    const isLocked = await itemCard.evaluate(el => el.classList.contains('locked'));
    const isRemoved = await itemCard.evaluate(el => el.classList.contains('removed'));

    if (!isLocked && !isRemoved) {
      const dragHandle = itemCard.locator('.drag-handle');
      await expect(dragHandle).toBeVisible();

      // SVG icon should be present
      const handleIcon = dragHandle.locator('svg');
      await expect(handleIcon).toBeVisible();
    }
  });

  test('should display greyed out drag handle on locked items', async ({ page }) => {
    // Wait for items to load
    await page.waitForSelector('.item-card', { timeout: 10000 });

    // Lock the first item
    const itemCard = page.locator('.item-card').first();
    const box = await itemCard.boundingBox();
    if (!box) throw new Error('Could not get item card bounding box');

    // Swipe right to lock
    await page.mouse.move(box.x + 50, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width - 50, box.y + box.height / 2, { steps: 10 });
    await page.mouse.up();
    // Removed 500ms timeout

    // Verify item is locked
    const lockedCard = page.locator('.item-card.locked').first();
    await expect(lockedCard).toBeVisible();

    // Drag handle should be visible on locked item but with disabled class
    const dragHandle = lockedCard.locator('.drag-handle');
    await expect(dragHandle).toBeVisible();
    const hasDisabledClass = await dragHandle.evaluate(el => el.classList.contains('disabled'));
    expect(hasDisabledClass).toBe(true);
  });

  test('should not display drag handle on removed items', async ({ page }) => {
    // Wait for items to load
    await page.waitForSelector('.item-card', { timeout: 10000 });

    // Remove the first item
    const itemCard = page.locator('.item-card').first();
    const box = await itemCard.boundingBox();
    if (!box) throw new Error('Could not get item card bounding box');

    // Swipe left to remove
    await page.mouse.move(box.x + box.width - 50, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + 50, box.y + box.height / 2, { steps: 10 });
    await page.mouse.up();
    // Removed 500ms timeout
    await page.click('#btn-confirm-remove');
    // Removed 500ms timeout

    // Verify item is removed
    const removedCard = page.locator('.item-card.removed').first();
    await expect(removedCard).toBeVisible();

    // Drag handle should NOT be visible on removed item
    const dragHandle = removedCard.locator('.drag-handle');
    await expect(dragHandle).not.toBeVisible();
  });

  test('should enable immediate drag when clicking on drag handle (mouse)', async ({ page }) => {
    // Wait for items to load
    await page.waitForSelector('.item-card', { timeout: 10000 });

    const itemCards = page.locator('.item-card');
    const count = await itemCards.count();
    expect(count).toBeGreaterThanOrEqual(2);

    // Get first two items
    const firstCard = itemCards.first();
    const secondCard = itemCards.nth(1);

    // Get original EAN values to verify reorder
    const firstEan = await firstCard.locator('.item-ean').textContent();
    const secondEan = await secondCard.locator('.item-ean').textContent();

    // Perform drag using programmatic HTML5 drag-and-drop events
    // This simulates dragging from the drag handle
    await page.evaluate(() => {
      const cards = document.querySelectorAll('.item-card');
      const firstCard = cards[0];
      const secondCard = cards[1];
      const dragHandle = firstCard.querySelector('.drag-handle');

      // Create and dispatch dragstart on the card (with drag handle as target)
      const dragStartEvent = new DragEvent('dragstart', {
        bubbles: true,
        cancelable: true,
        dataTransfer: new DataTransfer()
      });

      // Manually set the event target to simulate starting from drag handle
      Object.defineProperty(dragStartEvent, 'target', {
        value: dragHandle,
        enumerable: true
      });

      firstCard.dispatchEvent(dragStartEvent);

      // Set the data that would normally be set in dragstart handler
      dragStartEvent.dataTransfer.setData('application/x-item-index', firstCard.dataset.itemIndex);

      // Create and dispatch dragover on second card
      const dragOverEvent = new DragEvent('dragover', {
        bubbles: true,
        cancelable: true,
        clientY: secondCard.getBoundingClientRect().top + secondCard.getBoundingClientRect().height * 0.6,
        dataTransfer: dragStartEvent.dataTransfer
      });
      secondCard.dispatchEvent(dragOverEvent);

      // Create and dispatch drop on second card
      const dropEvent = new DragEvent('drop', {
        bubbles: true,
        cancelable: true,
        clientY: secondCard.getBoundingClientRect().top + secondCard.getBoundingClientRect().height * 0.6,
        dataTransfer: dragStartEvent.dataTransfer
      });
      secondCard.dispatchEvent(dropEvent);

      // Create and dispatch dragend on first card
      const dragEndEvent = new DragEvent('dragend', {
        bubbles: true,
        cancelable: true
      });
      firstCard.dispatchEvent(dragEndEvent);
    });

    // Removed 500ms timeout

    // Verify items were reordered
    const newFirstEan = await page.locator('.item-card:not(.removed)').first().locator('.item-ean').textContent();
    const newSecondEan = await page.locator('.item-card:not(.removed)').nth(1).locator('.item-ean').textContent();

    // First and second should have swapped
    expect(newFirstEan).toBe(secondEan);
    expect(newSecondEan).toBe(firstEan);
  });

  test('should enable immediate drag when touching drag handle (touch)', async ({ page }) => {
    // Wait for items to load
    await page.waitForSelector('.item-card', { timeout: 10000 });

    const itemCards = page.locator('.item-card');
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

    // Simulate touch drag from handle
    await page.evaluate((coords) => {
      const handle = document.querySelector('.drag-handle');
      const card = handle.closest('.item-card');

      const touchStart = new Touch({
        identifier: 1,
        target: handle,
        clientX: coords.startX,
        clientY: coords.startY,
        screenX: coords.startX,
        screenY: coords.startY,
      });

      const touchMove = new Touch({
        identifier: 1,
        target: card,
        clientX: coords.midX,
        clientY: coords.midY,
        screenX: coords.midX,
        screenY: coords.midY,
      });

      const touchEnd = new Touch({
        identifier: 1,
        target: card,
        clientX: coords.endX,
        clientY: coords.endY,
        screenX: coords.endX,
        screenY: coords.endY,
      });

      handle.dispatchEvent(new TouchEvent('touchstart', {
        touches: [touchStart],
        changedTouches: [touchStart],
        bubbles: true
      }));

      setTimeout(() => {
        card.dispatchEvent(new TouchEvent('touchmove', {
          touches: [touchMove],
          changedTouches: [touchMove],
          bubbles: true
        }));
      }, 50);

      setTimeout(() => {
        card.dispatchEvent(new TouchEvent('touchend', {
          touches: [],
          changedTouches: [touchEnd],
          bubbles: true
        }));
      }, 100);
    }, {
      startX: handleBox.x + handleBox.width / 2,
      startY: handleBox.y + handleBox.height / 2,
      midX: (handleBox.x + secondCardBox.x) / 2,
      midY: (handleBox.y + secondCardBox.y) / 2,
      endX: secondCardBox.x + secondCardBox.width / 2,
      endY: secondCardBox.y + secondCardBox.height / 2
    });

    // Removed 500ms timeout

    // Verify items were reordered
    const newFirstEan = await page.locator('.item-card:not(.removed)').first().locator('.item-ean').textContent();
    const newSecondEan = await page.locator('.item-card:not(.removed)').nth(1).locator('.item-ean').textContent();

    // First and second should have swapped
    expect(newFirstEan).toBe(secondEan);
    expect(newSecondEan).toBe(firstEan);
  });

  test('should not trigger swipe when dragging from enabled drag handle', async ({ page }) => {
    // Wait for items to load
    await page.waitForSelector('.item-card', { timeout: 10000 });

    // Get the first item
    const itemCard = page.locator('.item-card').first();
    await expect(itemCard).toBeVisible();

    // Get drag handle
    const dragHandle = itemCard.locator('.drag-handle');
    const handleBox = await dragHandle.boundingBox();
    const cardBox = await itemCard.boundingBox();

    if (!handleBox || !cardBox) {
      throw new Error('Could not get bounding boxes');
    }

    // Check initial state - should not be locked
    const initialLocked = await itemCard.evaluate(card => card.classList.contains('locked'));
    expect(initialLocked).toBe(false);

    // Swipe right from drag handle (should NOT lock)
    await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(cardBox.x + cardBox.width - 50, cardBox.y + cardBox.height / 2, { steps: 10 });
    await page.mouse.up();
    // Removed 500ms timeout

    // Item should still NOT be locked (swipe should be ignored when starting from drag handle)
    const stillNotLocked = await itemCard.evaluate(card => card.classList.contains('locked'));
    expect(stillNotLocked).toBe(false);
  });

  test('should not allow drag when clicking disabled drag handle on locked item', async ({ page }) => {
    // Wait for items to load
    await page.waitForSelector('.item-card', { timeout: 10000 });

    // Lock the first item
    const itemCard = page.locator('.item-card').first();
    let box = await itemCard.boundingBox();
    if (!box) throw new Error('Could not get item card bounding box');

    // Swipe right to lock
    await page.mouse.move(box.x + 50, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width - 50, box.y + box.height / 2, { steps: 10 });
    await page.mouse.up();
    // Removed 500ms timeout

    // Verify item is locked
    const lockedCard = page.locator('.item-card.locked').first();
    await expect(lockedCard).toBeVisible();

    // Get the disabled drag handle
    const dragHandle = lockedCard.locator('.drag-handle.disabled');
    await expect(dragHandle).toBeVisible();

    // Try to drag from the disabled handle - should not work
    const handleBox = await dragHandle.boundingBox();
    if (!handleBox) throw new Error('Could not get drag handle bounding box');

    // Attempt drag
    await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(100);
    await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + 100, { steps: 10 });
    await page.mouse.up();
    // Removed 500ms timeout

    // Item should still be locked (position should not have changed)
    const stillLocked = await lockedCard.evaluate(card => card.classList.contains('locked'));
    expect(stillLocked).toBe(true);
  });

  test('should still allow swipe to lock when not starting from drag handle', async ({ page }) => {
    // Wait for items to load
    await page.waitForSelector('.item-card', { timeout: 10000 });

    // Get the first item
    const itemCard = page.locator('.item-card').first();
    await expect(itemCard).toBeVisible();

    const box = await itemCard.boundingBox();
    if (!box) throw new Error('Could not get item card bounding box');

    // Check initial state - should not be locked
    const initialLocked = await itemCard.evaluate(card => card.classList.contains('locked'));
    expect(initialLocked).toBe(false);

    // Swipe right from middle of card (NOT from drag handle) - should lock
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width - 50, box.y + box.height / 2, { steps: 10 });
    await page.mouse.up();
    // Removed 500ms timeout

    // Item should now be locked
    const locked = await itemCard.evaluate(card => card.classList.contains('locked'));
    expect(locked).toBe(true);
  });

  test('should still allow swipe to delete when not starting from drag handle', async ({ page }) => {
    // Wait for items to load
    await page.waitForSelector('.item-card', { timeout: 10000 });

    // Get the first item
    const itemCard = page.locator('.item-card').first();
    const box = await itemCard.boundingBox();
    if (!box) throw new Error('Could not get item card bounding box');

    // Swipe left from middle of card (NOT from drag handle) - should trigger delete
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
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

    // Item should be removed
    const removedCard = page.locator('.item-card.removed').first();
    await expect(removedCard).toBeVisible();
  });
});
