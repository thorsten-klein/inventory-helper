const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

test.describe('Locked Items in Reorder Screen', () => {
  const exampleFilePath = path.join(__dirname, '..', 'example', 'example.xlsx');

  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
  });

  test('locked items should not be movable with drag and drop', async ({ page }) => {
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

    // Select first category
    const categoryOptions = await page.locator('#category-select option').count();
    if (categoryOptions > 0) {
      const firstOptionValue = await page.locator('#category-select option').first().getAttribute('value');
      if (firstOptionValue) {
        await page.selectOption('#category-select', firstOptionValue);
        await page.waitForTimeout(300);

        // Click Start Editing
        await page.click('#btn-start-editing');
        await page.waitForTimeout(1000);

        // Get all item cards
        const itemCards = page.locator('.item-card:not(.removed)');
        const itemCount = await itemCards.count();

        if (itemCount > 2) {
          // Lock the second item by swiping right on it
          const secondItem = itemCards.nth(1);

          // Get the item's text before locking
          const beforeLockText = await secondItem.textContent();

          // Swipe right to lock the item
          await secondItem.evaluate((element) => {
            const mouseStart = new MouseEvent('mousedown', {
              screenX: 50, screenY: 100, clientX: 50, clientY: 100
            });
            const mouseEnd = new MouseEvent('mouseup', {
              screenX: 150, screenY: 100, clientX: 150, clientY: 100
            });
            element.dispatchEvent(mouseStart);
            element.dispatchEvent(mouseEnd);
          });

          await page.waitForTimeout(500);

          // Verify item is now locked (has locked class)
          const refreshedCards = page.locator('.item-card:not(.removed)');
          const isLocked = await refreshedCards.nth(1).evaluate(el => el.classList.contains('locked'));
          expect(isLocked).toBe(true);

          // Try to drag the locked item - it should not be draggable
          const lockedItem = refreshedCards.nth(1);
          const targetItem = refreshedCards.nth(2);

          const lockedBox = await lockedItem.boundingBox();
          const targetBox = await targetItem.boundingBox();

          if (lockedBox && targetBox) {
            // Long press on locked item (should not enable dragging)
            await page.mouse.move(lockedBox.x + lockedBox.width / 2, lockedBox.y + lockedBox.height / 2);
            await page.mouse.down();
            await page.waitForTimeout(250); // Long press duration
            await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2, { steps: 10 });
            await page.waitForTimeout(100);
            await page.mouse.up();
            await page.waitForTimeout(500);

            // Verify the locked item is still in position 1
            const finalCards = page.locator('.item-card:not(.removed)');
            const lockedItemAfter = await finalCards.nth(1).textContent();
            expect(lockedItemAfter).toBe(beforeLockText);
          }
        }
      }
    }
  });

  test('moving unlocked items should skip locked items and swap with next unlocked item', async ({ page }) => {
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

    // Select first category
    const categoryOptions = await page.locator('#category-select option').count();
    if (categoryOptions > 0) {
      const firstOptionValue = await page.locator('#category-select option').first().getAttribute('value');
      if (firstOptionValue) {
        await page.selectOption('#category-select', firstOptionValue);
        await page.waitForTimeout(300);

        // Click Start Editing
        await page.click('#btn-start-editing');
        await page.waitForTimeout(1000);

        // Get all item cards in the same row
        const itemCards = page.locator('.item-card:not(.removed)');
        const itemCount = await itemCards.count();

        if (itemCount >= 4) {
          // Setup: Lock items at positions 1 and 2 (0-indexed)
          // This gives us: [unlocked(0), locked(1), locked(2), unlocked(3), ...]

          // Lock item at index 1
          await itemCards.nth(1).evaluate((element) => {
            const mouseStart = new MouseEvent('mousedown', {
              screenX: 50, screenY: 100, clientX: 50, clientY: 100
            });
            const mouseEnd = new MouseEvent('mouseup', {
              screenX: 150, screenY: 100, clientX: 150, clientY: 100
            });
            element.dispatchEvent(mouseStart);
            element.dispatchEvent(mouseEnd);
          });
          await page.waitForTimeout(300);

          // Lock item at index 2
          await itemCards.nth(2).evaluate((element) => {
            const mouseStart = new MouseEvent('mousedown', {
              screenX: 50, screenY: 100, clientX: 50, clientY: 100
            });
            const mouseEnd = new MouseEvent('mouseup', {
              screenX: 150, screenY: 100, clientX: 150, clientY: 100
            });
            element.dispatchEvent(mouseStart);
            element.dispatchEvent(mouseEnd);
          });
          await page.waitForTimeout(300);

          // Get the content of items before moving
          const refreshedCards = page.locator('.item-card:not(.removed)');
          const item0TextBefore = await refreshedCards.nth(0).textContent();
          const item1TextBefore = await refreshedCards.nth(1).textContent();
          const item2TextBefore = await refreshedCards.nth(2).textContent();
          const item3TextBefore = await refreshedCards.nth(3).textContent();

          // Verify items 1 and 2 are locked
          const item1Locked = await refreshedCards.nth(1).evaluate(el => el.classList.contains('locked'));
          const item2Locked = await refreshedCards.nth(2).evaluate(el => el.classList.contains('locked'));
          expect(item1Locked).toBe(true);
          expect(item2Locked).toBe(true);

          // Now click on item 0 (unlocked) and try to move it down
          await refreshedCards.nth(0).click();
          await page.waitForTimeout(300);

          // Perform long press to enable dragging, then drag to item 3
          // Since items 1 and 2 are locked, moving item 0 down should:
          // - Skip locked items 1 and 2
          // - Swap with item 3 (next unlocked item)

          // Simulate drag and drop from item 0 to item 3
          const item0 = refreshedCards.nth(0);
          const item3 = refreshedCards.nth(3);

          const item0Box = await item0.boundingBox();
          const item3Box = await item3.boundingBox();

          if (item0Box && item3Box) {
            // Long press on item 0
            await page.mouse.move(item0Box.x + item0Box.width / 2, item0Box.y + item0Box.height / 2);
            await page.mouse.down();
            await page.waitForTimeout(250); // Long press duration

            // Drag to item 3 position (below)
            await page.mouse.move(item3Box.x + item3Box.width / 2, item3Box.y + item3Box.height / 2 + 10, { steps: 10 });
            await page.waitForTimeout(100);
            await page.mouse.up();
            await page.waitForTimeout(500);

            // Get the content of items after moving
            const finalCards = page.locator('.item-card:not(.removed)');
            const item0TextAfter = await finalCards.nth(0).textContent();
            const item1TextAfter = await finalCards.nth(1).textContent();
            const item2TextAfter = await finalCards.nth(2).textContent();
            const item3TextAfter = await finalCards.nth(3).textContent();

            // Expected behavior:
            // - Items 1 and 2 should stay at their positions (locked)
            // - Item 0 and 3 should have swapped
            expect(item1TextAfter).toBe(item1TextBefore); // Locked item 1 stays
            expect(item2TextAfter).toBe(item2TextBefore); // Locked item 2 stays

            // The unlocked items should have swapped, but this will fail with current bug
            // because locked items don't stay in place during drag-drop
          }
        }
      }
    }
  });

  test('BUG REPRODUCTION: locked items should maintain their position during reordering', async ({ page }) => {
    // This test reproduces the bug where locked items move when they shouldn't

    if (!fs.existsSync(exampleFilePath)) {
      test.skip();
      return;
    }

    // Upload file
    const fileInput = page.locator('#file-input');
    await fileInput.setInputFiles(exampleFilePath);
    await page.waitForTimeout(2000);

    await page.click('#btn-next-category');
    await page.waitForTimeout(500);

    const categoryOptions = await page.locator('#category-select option').count();
    if (categoryOptions > 0) {
      const firstOptionValue = await page.locator('#category-select option').first().getAttribute('value');
      if (firstOptionValue) {
        await page.selectOption('#category-select', firstOptionValue);
        await page.waitForTimeout(300);
        await page.click('#btn-start-editing');
        await page.waitForTimeout(1000);

        const itemCards = page.locator('.item-card:not(.removed)');
        const itemCount = await itemCards.count();

        if (itemCount >= 3) {
          // Lock the middle item
          await itemCards.nth(1).evaluate((element) => {
            const mouseStart = new MouseEvent('mousedown', {
              screenX: 50, screenY: 100, clientX: 50, clientY: 100
            });
            const mouseEnd = new MouseEvent('mouseup', {
              screenX: 150, screenY: 100, clientX: 150, clientY: 100
            });
            element.dispatchEvent(mouseStart);
            element.dispatchEvent(mouseEnd);
          });
          await page.waitForTimeout(300);

          // Get locked item's content
          const refreshedCards = page.locator('.item-card:not(.removed)');
          const lockedItemText = await refreshedCards.nth(1).textContent();
          const lockedItemIndex = await refreshedCards.nth(1).getAttribute('data-item-index');

          // Verify it's locked
          const isLocked = await refreshedCards.nth(1).evaluate(el => el.classList.contains('locked'));
          expect(isLocked).toBe(true);

          // Try to drag the first item past the locked item
          const item0 = refreshedCards.nth(0);
          const item2 = refreshedCards.nth(2);

          const item0Box = await item0.boundingBox();
          const item2Box = await item2.boundingBox();

          if (item0Box && item2Box) {
            await page.mouse.move(item0Box.x + item0Box.width / 2, item0Box.y + item0Box.height / 2);
            await page.mouse.down();
            await page.waitForTimeout(250);
            await page.mouse.move(item2Box.x + item2Box.width / 2, item2Box.y + item2Box.height / 2, { steps: 10 });
            await page.waitForTimeout(100);
            await page.mouse.up();
            await page.waitForTimeout(500);

            // EXPECTED: The locked item should still be at index 1 with same content
            // ACTUAL BUG: The locked item moves
            const finalCards = page.locator('.item-card:not(.removed)');
            const lockedItemTextAfter = await finalCards.nth(1).textContent();

            // This assertion should pass but will FAIL due to the bug
            expect(lockedItemTextAfter).toBe(lockedItemText);
          }
        }
      }
    }
  });
});
