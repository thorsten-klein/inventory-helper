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
    // Removed 500ms timeout

    // Verify example file exists
    expect(fs.existsSync(exampleFilePath)).toBeTruthy();

    // Wait for XLSX library to load
    await page.waitForFunction(() => typeof XLSX !== 'undefined', { timeout: 10000 });

    // Upload file
    const fileInput = page.locator('#file-input');
    await fileInput.setInputFiles(exampleFilePath);
    // Removed 2000ms timeout - handled by helpers

    // Navigate to category screen
    await page.click('#btn-next-category');
    // Removed 500ms timeout

    // Select first real category (skip placeholders)
    const categoryOptions = await page.locator('#category-select option').all();
    for (const option of categoryOptions) {
      const value = await option.getAttribute('value');
      const text = await option.textContent();
      // Skip placeholder options
      if (value && value !== '' && !text.includes('--')) {
        await page.selectOption('#category-select', value);
        // Removed 300ms timeout

        // Click Start Editing
        await page.click('#btn-start-editing');
        // Removed 1000ms timeout
        break;
      }
    }

    // Wait for editor screen
    await page.waitForSelector('#editor-screen:not(.hidden)', { timeout: 5000 });
    const hasItems = await page.locator('.item-card').count();
    expect(hasItems).toBeGreaterThan(0);
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
    // Removed 500ms timeout

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
    // Removed 500ms timeout

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
    // Removed 500ms timeout

    // Click undo
    await page.click('#btn-undo');
    // Removed 500ms timeout

    // Redo button should now be enabled
    const redoButton = page.locator('#btn-redo');
    await expect(redoButton).not.toBeDisabled();

    // Click redo
    await redoButton.click();
    // Removed 500ms timeout

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
    // Removed 500ms timeout

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
      // Removed 500ms timeout

      // Verify second item is locked
      let secondLocked = await page.locator('.item-card').nth(parseInt(secondIndex)).evaluate(card =>
        card.classList.contains('locked')
      );
      expect(secondLocked).toBe(true);

      // Undo once - should unlock second item
      await page.click('#btn-undo');
      // Removed 500ms timeout

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
      // Removed 500ms timeout

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

    expect(itemCount).toBeGreaterThanOrEqual(2);

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

    // Small delay to ensure mousedown is processed
    await page.waitForTimeout(100);

    // Move mouse to trigger drag
    await page.mouse.move(secondBox.x + secondBox.width / 2, secondBox.y + secondBox.height - 10, { steps: 20 });

    // Small delay to ensure drag is processed
    await page.waitForTimeout(100);

    await page.mouse.up();
    // Removed 500ms timeout

    // Verify order changed - second EAN should now be first
    const newFirstEAN = await items.nth(0).locator('.item-ean').textContent();
    expect(newFirstEAN).toBe(secondEAN);

    // Undo should be enabled
    const undoButton = page.locator('#btn-undo');
    await expect(undoButton).not.toBeDisabled();

    // Click undo
    await undoButton.click();
    // Removed 500ms timeout

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
    // Removed 500ms timeout

    // Undo
    await page.click('#btn-undo');
    // Removed 500ms timeout

    // Redo button should be enabled
    const redoButton = page.locator('#btn-redo');
    await expect(redoButton).not.toBeDisabled();

    // Do another action - this should clear redo history
    await page.mouse.move(box.x + 50, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width - 50, box.y + box.height / 2, { steps: 10 });
    await page.mouse.up();
    // Removed 500ms timeout

    // Redo button should now be disabled
    await expect(redoButton).toBeDisabled();
  });
});
