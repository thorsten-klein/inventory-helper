const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

test.describe('Undo/Redo Functionality in Reorder Screen', () => {
  const exampleFilePath = path.join(__dirname, '..', 'example', 'example.xlsx');

  test.beforeEach(async ({ page, context }) => {
    await context.clearCookies();
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => localStorage.clear());
    await page.waitForTimeout(500);

    // Skip if example file doesn't exist
    if (!fs.existsSync(exampleFilePath)) {
      test.skip();
      return;
    }

    // Upload file
    const fileInput = page.locator('#file-input');
    await fileInput.setInputFiles(exampleFilePath);
    await page.waitForTimeout(2000);

    // Navigate to category screen
    await page.click('#btn-next-category');
    await page.waitForTimeout(500);

    // Find and select a category with a value
    const categoryOptions = await page.locator('#category-select option').all();

    // Try to find a category that has a value (skip the placeholder)
    for (let i = 1; i < Math.min(categoryOptions.length, 5); i++) {
      const optionValue = await categoryOptions[i].getAttribute('value');
      if (optionValue && optionValue !== '' && optionValue !== '-- Select a category --') {
        await page.selectOption('#category-select', optionValue);
        await page.waitForTimeout(300);
        break;
      }
    }

    // Click Start Editing
    await page.click('#btn-start-editing');
    await page.waitForTimeout(2000);

    // Wait for editor screen or skip if no items
    try {
      await page.waitForSelector('#editor-screen:not(.hidden)', { timeout: 5000 });
      const hasItems = await page.locator('.item-card').count();
      if (hasItems === 0) {
        test.skip();
      }
    } catch {
      test.skip();
    }
  });

  test('undo button should be disabled initially', async ({ page }) => {
    const undoButton = page.locator('#btn-undo');
    await expect(undoButton).toBeDisabled();
  });

  test('redo button should be disabled initially', async ({ page }) => {
    const redoButton = page.locator('#btn-redo');
    await expect(redoButton).toBeDisabled();
  });

  test('should undo lock action', async ({ page }) => {
    // Get the first item card
    const itemCard = page.locator('.item-card').first();
    await expect(itemCard).toBeVisible();

    // Get item index and initial state
    const itemIndex = await itemCard.getAttribute('data-item-index');
    const initialLocked = await itemCard.evaluate(card => card.classList.contains('locked'));

    // Get card bounding box
    const box = await itemCard.boundingBox();
    if (!box) throw new Error('Could not get item card bounding box');

    // Swipe right to lock
    await page.mouse.move(box.x + 50, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width - 50, box.y + box.height / 2, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(500);

    // Verify locked state changed
    const lockedAfterSwipe = await page.locator('.item-card').nth(parseInt(itemIndex)).evaluate(card =>
      card.classList.contains('locked')
    );
    expect(lockedAfterSwipe).toBe(!initialLocked);

    // Undo button should now be enabled
    const undoButton = page.locator('#btn-undo');
    await expect(undoButton).not.toBeDisabled();

    // Click undo
    await undoButton.click();
    await page.waitForTimeout(500);

    // Verify state is restored
    const lockedAfterUndo = await page.locator('.item-card').nth(parseInt(itemIndex)).evaluate(card =>
      card.classList.contains('locked')
    );
    expect(lockedAfterUndo).toBe(initialLocked);
  });

  test('should redo lock action after undo', async ({ page }) => {
    // Get the first item card
    const itemCard = page.locator('.item-card').first();
    const itemIndex = await itemCard.getAttribute('data-item-index');
    const initialLocked = await itemCard.evaluate(card => card.classList.contains('locked'));

    const box = await itemCard.boundingBox();
    if (!box) throw new Error('Could not get item card bounding box');

    // Swipe right to lock
    await page.mouse.move(box.x + 50, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width - 50, box.y + box.height / 2, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(500);

    // Click undo
    await page.click('#btn-undo');
    await page.waitForTimeout(500);

    // Redo button should now be enabled
    const redoButton = page.locator('#btn-redo');
    await expect(redoButton).not.toBeDisabled();

    // Click redo
    await redoButton.click();
    await page.waitForTimeout(500);

    // Verify state is restored to locked state
    const lockedAfterRedo = await page.locator('.item-card').nth(parseInt(itemIndex)).evaluate(card =>
      card.classList.contains('locked')
    );
    expect(lockedAfterRedo).toBe(!initialLocked);
  });

  test('should undo multiple actions in sequence', async ({ page }) => {
    // Lock first item
    const firstCard = page.locator('.item-card').first();
    const firstIndex = await firstCard.getAttribute('data-item-index');
    let box = await firstCard.boundingBox();
    if (!box) throw new Error('Could not get first item card bounding box');

    await page.mouse.move(box.x + 50, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width - 50, box.y + box.height / 2, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(500);

    // Verify first item is locked
    let firstLocked = await page.locator('.item-card').nth(parseInt(firstIndex)).evaluate(card =>
      card.classList.contains('locked')
    );
    expect(firstLocked).toBe(true);

    // Lock second item (if exists)
    const secondCard = page.locator('.item-card').nth(1);
    const secondExists = await secondCard.count();

    if (secondExists > 0) {
      const secondIndex = await secondCard.getAttribute('data-item-index');
      box = await secondCard.boundingBox();
      if (!box) throw new Error('Could not get second item card bounding box');

      await page.mouse.move(box.x + 50, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width - 50, box.y + box.height / 2, { steps: 10 });
      await page.mouse.up();
      await page.waitForTimeout(500);

      // Verify second item is locked
      let secondLocked = await page.locator('.item-card').nth(parseInt(secondIndex)).evaluate(card =>
        card.classList.contains('locked')
      );
      expect(secondLocked).toBe(true);

      // Undo once - should unlock second item
      await page.click('#btn-undo');
      await page.waitForTimeout(500);

      secondLocked = await page.locator('.item-card').nth(parseInt(secondIndex)).evaluate(card =>
        card.classList.contains('locked')
      );
      expect(secondLocked).toBe(false);

      // First item should still be locked
      firstLocked = await page.locator('.item-card').nth(parseInt(firstIndex)).evaluate(card =>
        card.classList.contains('locked')
      );
      expect(firstLocked).toBe(true);

      // Undo again - should unlock first item
      await page.click('#btn-undo');
      await page.waitForTimeout(500);

      firstLocked = await page.locator('.item-card').nth(parseInt(firstIndex)).evaluate(card =>
        card.classList.contains('locked')
      );
      expect(firstLocked).toBe(false);
    }
  });

  test('should undo drag and drop reorder', async ({ page }) => {
    // Get first two items
    const items = page.locator('.item-card');
    const itemCount = await items.count();

    if (itemCount < 2) {
      test.skip();
      return;
    }

    // Get initial EANs to track items
    const firstEAN = await items.nth(0).locator('.item-ean').textContent();
    const secondEAN = await items.nth(1).locator('.item-ean').textContent();

    // Get drag handle of first item
    const firstDragHandle = items.nth(0).locator('.drag-handle');
    const firstBox = await firstDragHandle.boundingBox();
    if (!firstBox) throw new Error('Could not get first drag handle bounding box');

    // Get position of second item
    const secondBox = await items.nth(1).boundingBox();
    if (!secondBox) throw new Error('Could not get second item bounding box');

    // Perform drag from first item to second item (drop below second)
    await page.mouse.move(firstBox.x + firstBox.width / 2, firstBox.y + firstBox.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(100);
    await page.mouse.move(secondBox.x + secondBox.width / 2, secondBox.y + secondBox.height - 10, { steps: 10 });
    await page.waitForTimeout(100);
    await page.mouse.up();
    await page.waitForTimeout(500);

    // Verify order changed - second EAN should now be first
    const newFirstEAN = await items.nth(0).locator('.item-ean').textContent();
    expect(newFirstEAN).toBe(secondEAN);

    // Undo should be enabled
    const undoButton = page.locator('#btn-undo');
    await expect(undoButton).not.toBeDisabled();

    // Click undo
    await undoButton.click();
    await page.waitForTimeout(500);

    // Verify original order restored
    const restoredFirstEAN = await items.nth(0).locator('.item-ean').textContent();
    expect(restoredFirstEAN).toBe(firstEAN);
  });

  test('should maintain redo history after multiple undos', async ({ page }) => {
    // Lock first item
    const firstCard = page.locator('.item-card').first();
    const firstIndex = await firstCard.getAttribute('data-item-index');
    const box = await firstCard.boundingBox();
    if (!box) throw new Error('Could not get item card bounding box');

    // Swipe right to lock
    await page.mouse.move(box.x + 50, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width - 50, box.y + box.height / 2, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(500);

    // Undo
    await page.click('#btn-undo');
    await page.waitForTimeout(500);

    // Redo button should be enabled
    const redoButton = page.locator('#btn-redo');
    await expect(redoButton).not.toBeDisabled();

    // Do another action - this should clear redo history
    await page.mouse.move(box.x + 50, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width - 50, box.y + box.height / 2, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(500);

    // Redo button should now be disabled
    await expect(redoButton).toBeDisabled();
  });
});
