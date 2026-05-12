const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

test.describe('Review Screen Swipe Bug', () => {
  const exampleFilePath = path.join(__dirname, '..', 'example', 'example.xlsx');

  test.beforeEach(async ({ page, context }) => {
    await context.clearCookies();
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => localStorage.clear());

    // Verify example file exists
    expect(fs.existsSync(exampleFilePath)).toBeTruthy();

    // Wait for XLSX library to load
    await page.waitForFunction(() => typeof XLSX !== 'undefined', { timeout: 10000 });

    // Upload file
    const fileInput = page.locator('#file-input');
    await fileInput.setInputFiles(exampleFilePath);

    // Navigate to category screen
    await page.click('#btn-next-category');

    // Select first real category (skip placeholders)
    const categoryOptions = await page.locator('#category-select option').all();
    for (const option of categoryOptions) {
      const value = await option.getAttribute('value');
      const text = await option.textContent();
      // Skip placeholder options
      if (value && value !== '' && !text.includes('--')) {
        await page.selectOption('#category-select', value);

        // Click Start Editing
        await page.click('#btn-start-editing');
        break;
      }
    }

    // Wait for editor screen
    await page.waitForSelector('#editor-screen:not(.hidden)', { timeout: 5000 });

    // Navigate to review screen
    await page.click('#btn-start-review');
    await page.waitForSelector('#review-screen:not(.hidden)', { timeout: 5000 });
  });

  test('swipe left should go to next item', async ({ page }) => {
    // Get current item index
    const progressText = await page.locator('#review-progress-text').textContent();
    const currentIndex = parseInt(progressText.match(/\d+/)[0]);

    // Get container for swiping
    const container = page.locator('.review-container');
    const box = await container.boundingBox();
    if (!box) throw new Error('Could not get review container bounding box');

    // Perform swipe left (start right, end left)
    await page.mouse.move(box.x + box.width - 50, box.y + box.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(50);
    await page.mouse.move(box.x + 50, box.y + box.height / 2, { steps: 10 });
    await page.waitForTimeout(50);
    await page.mouse.up();

    // Wait for update
    await page.waitForTimeout(200);

    // Verify we moved to next item
    const newProgressText = await page.locator('#review-progress-text').textContent();
    const newIndex = parseInt(newProgressText.match(/\d+/)[0]);
    expect(newIndex).toBe(currentIndex + 1);
  });

  test('swipe right should go to previous item', async ({ page }) => {
    // First go to second item
    await page.click('#btn-review-next');
    await page.waitForTimeout(100);

    // Get current item index
    const progressText = await page.locator('#review-progress-text').textContent();
    const currentIndex = parseInt(progressText.match(/\d+/)[0]);

    // Get container for swiping
    const container = page.locator('.review-container');
    const box = await container.boundingBox();
    if (!box) throw new Error('Could not get review container bounding box');

    // Perform swipe right (start left, end right)
    await page.mouse.move(box.x + 50, box.y + box.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(50);
    await page.mouse.move(box.x + box.width - 50, box.y + box.height / 2, { steps: 10 });
    await page.waitForTimeout(50);
    await page.mouse.up();

    // Wait for update
    await page.waitForTimeout(200);

    // Verify we moved to previous item
    const newProgressText = await page.locator('#review-progress-text').textContent();
    const newIndex = parseInt(newProgressText.match(/\d+/)[0]);
    expect(newIndex).toBe(currentIndex - 1);
  });

  test('swipe up should increase stock count', async ({ page }) => {
    // Get current stock count
    const initialStock = parseInt(await page.locator('#review-stock').textContent());

    // Get container for swiping
    const container = page.locator('.review-container');
    const box = await container.boundingBox();
    if (!box) throw new Error('Could not get review container bounding box');

    // Perform swipe up (start bottom, end top)
    await page.mouse.move(box.x + box.width / 2, box.y + box.height - 50);
    await page.mouse.down();
    await page.waitForTimeout(50);
    await page.mouse.move(box.x + box.width / 2, box.y + 50, { steps: 10 });
    await page.waitForTimeout(50);
    await page.mouse.up();

    // Wait for update
    await page.waitForTimeout(200);

    // Verify stock count increased
    const newStock = parseInt(await page.locator('#review-stock').textContent());
    expect(newStock).toBe(initialStock + 1);
  });

  test('swipe down should decrease stock count', async ({ page }) => {
    // First increase stock to ensure we can decrease
    await page.click('#btn-stock-plus');
    await page.click('#btn-stock-plus');
    await page.waitForTimeout(100);

    // Get current stock count
    const initialStock = parseInt(await page.locator('#review-stock').textContent());

    // Get container for swiping
    const container = page.locator('.review-container');
    const box = await container.boundingBox();
    if (!box) throw new Error('Could not get review container bounding box');

    // Perform swipe down (start top, end bottom)
    await page.mouse.move(box.x + box.width / 2, box.y + 50);
    await page.mouse.down();
    await page.waitForTimeout(50);
    await page.mouse.move(box.x + box.width / 2, box.y + box.height - 50, { steps: 10 });
    await page.waitForTimeout(50);
    await page.mouse.up();

    // Wait for update
    await page.waitForTimeout(200);

    // Verify stock count decreased
    const newStock = parseInt(await page.locator('#review-stock').textContent());
    expect(newStock).toBe(initialStock - 1);
  });

  test('swipe should prioritize horizontal over vertical when both happen', async ({ page }) => {
    // Get current item index
    const progressText = await page.locator('#review-progress-text').textContent();
    const currentIndex = parseInt(progressText.match(/\d+/)[0]);

    // Get current item to check if next item exists
    const totalItems = await page.locator('#review-progress-text').textContent().then(t => parseInt(t.match(/of (\d+)/)[1]));
    if (currentIndex >= totalItems) {
      return;
    }

    // Set stock for current item to 5 to have room to test
    await page.click('#btn-stock-plus');
    await page.click('#btn-stock-plus');
    await page.waitForTimeout(100);

    // Get current stock count
    const initialStock = parseInt(await page.locator('#review-stock').textContent());

    // Get review screen for swiping - use the upper portion away from buttons
    const reviewScreen = page.locator('#review-screen');
    const screenBox = await reviewScreen.boundingBox();
    if (!screenBox) throw new Error('Could not get review screen bounding box');

    // Perform diagonal swipe in the upper quarter of the screen (away from buttons)
    // Horizontal movement needs to be at least 2x vertical for horizontal swipe detection
    // Using very small vertical movement to ensure horizontal wins
    const verticalDist = 5;
    const swipeY = screenBox.y + 100; // Upper portion of screen

    await page.mouse.move(screenBox.x + screenBox.width - 100, swipeY);
    await page.mouse.down();
    await page.mouse.move(screenBox.x + 100, swipeY - verticalDist, { steps: 10 });
    await page.mouse.up();

    // Wait for update
    await page.waitForTimeout(100);

    // Verify we moved to next item (horizontal took priority)
    const newProgressText = await page.locator('#review-progress-text').textContent();
    const newIndex = parseInt(newProgressText.match(/\d+/)[0]);
    expect(newIndex).toBe(currentIndex + 1);

    // Get the new item's stock
    const newStock = parseInt(await page.locator('#review-stock').textContent());

    // The new item should NOT have had its stock changed by vertical swipe
    // We can't assume it has the same stock as previous item, so instead check
    // that the previous item still has its stock when we go back
    await page.click('#btn-review-prev');
    await page.waitForTimeout(100);
    const stockAfterReturn = parseInt(await page.locator('#review-stock').textContent());
    expect(stockAfterReturn).toBe(initialStock);
  });

  test('swipe should work anywhere on the screen, not just on review-container', async ({ page }) => {
    // Get current item index
    const progressText = await page.locator('#review-progress-text').textContent();
    const currentIndex = parseInt(progressText.match(/\d+/)[0]);

    // Get the entire review screen (not just the container)
    const reviewScreen = page.locator('#review-screen');
    const screenBox = await reviewScreen.boundingBox();
    if (!screenBox) throw new Error('Could not get review screen bounding box');

    // Swipe in the top area of the screen (outside review-container content)
    // This should still work for navigation
    await page.mouse.move(screenBox.x + screenBox.width - 50, screenBox.y + 50);
    await page.mouse.down();
    await page.mouse.move(screenBox.x + 50, screenBox.y + 50, { steps: 10 });
    await page.mouse.up();

    // Wait for update
    await page.waitForTimeout(100);

    // Verify we moved to next item
    const newProgressText = await page.locator('#review-progress-text').textContent();
    const newIndex = parseInt(newProgressText.match(/\d+/)[0]);
    expect(newIndex).toBe(currentIndex + 1);
  });

  test('vertical swipe should work anywhere on the screen', async ({ page }) => {
    // Get current stock count
    const initialStock = parseInt(await page.locator('#review-stock').textContent());

    // Get the entire review screen
    const reviewScreen = page.locator('#review-screen');
    const screenBox = await reviewScreen.boundingBox();
    if (!screenBox) throw new Error('Could not get review screen bounding box');

    // Swipe up in the left side of the screen (outside centered content)
    await page.mouse.move(screenBox.x + 100, screenBox.y + screenBox.height - 150);
    await page.mouse.down();
    await page.mouse.move(screenBox.x + 100, screenBox.y + 100, { steps: 10 });
    await page.mouse.up();

    // Wait for update
    await page.waitForTimeout(100);

    // Verify stock count increased
    const newStock = parseInt(await page.locator('#review-stock').textContent());
    expect(newStock).toBe(initialStock + 1);
  });
});
