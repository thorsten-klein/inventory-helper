const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

test.describe('Editor Screen - Drag Handle Functionality', () => {
  const exampleFilePath = path.join(__dirname, '..', 'example', 'example.xlsx');

  test.beforeEach(async ({ page, context }) => {
    await context.clearCookies();
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => localStorage.clear());
    await page.waitForTimeout(500);

    // Verify example file exists
    expect(fs.existsSync(exampleFilePath)).toBeTruthy();

    // Wait for XLSX library to load
    await page.waitForFunction(() => typeof XLSX !== 'undefined', { timeout: 10000 });

    // Upload file
    const fileInput = page.locator('#file-input');
    await fileInput.setInputFiles(exampleFilePath);
    await page.waitForTimeout(2000);

    // Navigate to category screen
    await page.click('#btn-next-category');
    await page.waitForTimeout(500);

    // Select first real category (skip placeholders)
    const categoryOptions = await page.locator('#category-select option').all();
    for (const option of categoryOptions) {
      const value = await option.getAttribute('value');
      const text = await option.textContent();
      // Skip placeholder options
      if (value && value !== '' && !text.includes('--')) {
        await page.selectOption('#category-select', value);
        await page.waitForTimeout(300);

        // Click Start Editing
        await page.click('#btn-start-editing');
        await page.waitForTimeout(1000);

        // Wait for editor screen to be visible
        await page.waitForSelector('#editor-screen:not(.hidden)', { timeout: 5000 });
        await page.waitForSelector('.item-card', { timeout: 5000 });
        break;
      }
    }
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
    await page.waitForTimeout(500);

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
    await page.waitForTimeout(500);
    await page.click('#btn-confirm-remove');
    await page.waitForTimeout(500);

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

    // Get drag handle of first item
    const dragHandle = firstCard.locator('.drag-handle');
    const handleBox = await dragHandle.boundingBox();
    const secondCardBox = await secondCard.boundingBox();

    if (!handleBox || !secondCardBox) {
      throw new Error('Could not get bounding boxes');
    }

    // Drag from handle to second card (should trigger immediate drag)
    await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(50); // Short delay, much less than long-press timer
    await page.mouse.move(secondCardBox.x + secondCardBox.width / 2, secondCardBox.y + secondCardBox.height / 2, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(500);

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

    await page.waitForTimeout(500);

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
    await page.waitForTimeout(500);

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
    await page.waitForTimeout(500);

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
    await page.waitForTimeout(500);

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
    await page.waitForTimeout(500);

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
    await page.waitForTimeout(500);

    // Confirmation modal should appear
    const confirmModal = page.locator('#confirm-remove-modal');
    await expect(confirmModal).toBeVisible();

    // Click confirm
    await page.click('#btn-confirm-remove');
    await page.waitForTimeout(500);

    // Item should be removed
    const removedCard = page.locator('.item-card.removed').first();
    await expect(removedCard).toBeVisible();
  });
});
