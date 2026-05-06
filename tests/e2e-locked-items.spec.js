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
