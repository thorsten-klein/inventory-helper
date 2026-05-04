const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

test.describe('Swipe Functionality in Reorder Screen', () => {
  const exampleFilePath = path.join(__dirname, '..', 'example', 'example.xlsx');

  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
  });

  test('should lock item when swiping right', async ({ page }) => {
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

        if (itemCount > 1) {
          // Get the first item
          const firstItem = itemCards.nth(0);
          const itemTextBefore = await firstItem.textContent();

          // Verify item is not locked initially
          const isLockedBefore = await firstItem.evaluate(el => el.classList.contains('locked'));
          expect(isLockedBefore).toBe(false);

          // Swipe right to lock the item using touch events
          await firstItem.evaluate((element) => {
            const touchStart = new TouchEvent('touchstart', {
              touches: [{ screenX: 50, screenY: 100, clientX: 50, clientY: 100 }],
              changedTouches: [{ screenX: 50, screenY: 100, clientX: 50, clientY: 100 }],
              bubbles: true,
              cancelable: true
            });
            const touchEnd = new TouchEvent('touchend', {
              touches: [],
              changedTouches: [{ screenX: 200, screenY: 100, clientX: 200, clientY: 100 }],
              bubbles: true,
              cancelable: true
            });
            element.dispatchEvent(touchStart);
            element.dispatchEvent(touchEnd);
          });

          await page.waitForTimeout(500);

          // Verify item is now locked
          const refreshedCards = page.locator('.item-card:not(.removed)');
          const isLockedAfter = await refreshedCards.nth(0).evaluate(el => el.classList.contains('locked'));
          expect(isLockedAfter).toBe(true);
        }
      }
    }
  });

  test('should remove item when swiping left', async ({ page }) => {
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
        const itemCountBefore = await itemCards.count();

        if (itemCountBefore > 1) {
          // Get the first item
          const firstItem = itemCards.nth(0);

          // Swipe left to remove the item using touch events
          await firstItem.evaluate((element) => {
            const touchStart = new TouchEvent('touchstart', {
              touches: [{ screenX: 200, screenY: 100, clientX: 200, clientY: 100 }],
              changedTouches: [{ screenX: 200, screenY: 100, clientX: 200, clientY: 100 }],
              bubbles: true,
              cancelable: true
            });
            const touchEnd = new TouchEvent('touchend', {
              touches: [],
              changedTouches: [{ screenX: 50, screenY: 100, clientX: 50, clientY: 100 }],
              bubbles: true,
              cancelable: true
            });
            element.dispatchEvent(touchStart);
            element.dispatchEvent(touchEnd);
          });

          await page.waitForTimeout(500);

          // Verify item count decreased (item was removed)
          const itemCardsAfter = page.locator('.item-card:not(.removed)');
          const itemCountAfter = await itemCardsAfter.count();
          expect(itemCountAfter).toBe(itemCountBefore - 1);
        }
      }
    }
  });

  test('should unlock item when swiping left on a locked item', async ({ page }) => {
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

        if (itemCount > 1) {
          // Get the first item and lock it
          const firstItem = itemCards.nth(0);

          // Swipe right to lock the item
          await firstItem.evaluate((element) => {
            const touchStart = new TouchEvent('touchstart', {
              touches: [{ screenX: 50, screenY: 100, clientX: 50, clientY: 100 }],
              changedTouches: [{ screenX: 50, screenY: 100, clientX: 50, clientY: 100 }],
              bubbles: true,
              cancelable: true
            });
            const touchEnd = new TouchEvent('touchend', {
              touches: [],
              changedTouches: [{ screenX: 200, screenY: 100, clientX: 200, clientY: 100 }],
              bubbles: true,
              cancelable: true
            });
            element.dispatchEvent(touchStart);
            element.dispatchEvent(touchEnd);
          });

          await page.waitForTimeout(500);

          // Verify item is locked
          const refreshedCards = page.locator('.item-card:not(.removed)');
          const isLocked = await refreshedCards.nth(0).evaluate(el => el.classList.contains('locked'));
          expect(isLocked).toBe(true);

          // Now swipe left to unlock
          const lockedItem = refreshedCards.nth(0);
          await lockedItem.evaluate((element) => {
            const touchStart = new TouchEvent('touchstart', {
              touches: [{ screenX: 200, screenY: 100, clientX: 200, clientY: 100 }],
              changedTouches: [{ screenX: 200, screenY: 100, clientX: 200, clientY: 100 }],
              bubbles: true,
              cancelable: true
            });
            const touchEnd = new TouchEvent('touchend', {
              touches: [],
              changedTouches: [{ screenX: 50, screenY: 100, clientX: 50, clientY: 100 }],
              bubbles: true,
              cancelable: true
            });
            element.dispatchEvent(touchStart);
            element.dispatchEvent(touchEnd);
          });

          await page.waitForTimeout(500);

          // Verify item is now unlocked
          const finalCards = page.locator('.item-card:not(.removed)');
          const isUnlocked = await finalCards.nth(0).evaluate(el => !el.classList.contains('locked'));
          expect(isUnlocked).toBe(true);
        }
      }
    }
  });
});
