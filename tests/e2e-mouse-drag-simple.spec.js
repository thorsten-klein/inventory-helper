const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

test.describe('Mouse Drag - Simple Test', () => {
  const exampleFilePath = path.join(__dirname, '..', 'example', 'example.xlsx');

  test.beforeEach(async ({ page, context }) => {
    await context.clearCookies();
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => localStorage.clear());
    await page.waitForTimeout(500);

    // Verify example file exists
    expect(fs.existsSync(exampleFilePath)).toBeTruthy();

    // Upload file
    const fileInput = page.locator('#file-input');
    await fileInput.setInputFiles(exampleFilePath);
    await page.waitForTimeout(2000);

    // Navigate to category screen
    await page.click('#btn-next-category');
    await page.waitForTimeout(500);

    // Select first real category (not placeholder)
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

  test('REPRODUCE BUG: Mouse drag should reorder items', async ({ page }) => {
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

    // Get drag handle of first item
    const dragHandle = firstCard.locator('.drag-handle');
    const handleBox = await dragHandle.boundingBox();
    const secondCardBox = await secondCard.boundingBox();

    if (!handleBox || !secondCardBox) {
      throw new Error('Could not get bounding boxes');
    }

    // Perform mouse drag from handle to second card
    const startX = handleBox.x + handleBox.width / 2;
    const startY = handleBox.y + handleBox.height / 2;
    const endX = secondCardBox.x + secondCardBox.width / 2;
    const endY = secondCardBox.y + secondCardBox.height / 2;

    // Move to handle, press mouse, drag, release
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.waitForTimeout(50);
    await page.mouse.move(endX, endY, { steps: 10 });
    await page.mouse.up();

    // Wait for drop and re-render to complete
    await page.waitForTimeout(1000);

    // Re-query items after potential DOM update
    await page.waitForSelector('.item-card:not(.removed)', { timeout: 2000 });

    // Check if items were reordered
    const newFirstEan = await page.locator('.item-card:not(.removed)').first().locator('.item-ean').textContent();
    const newSecondEan = await page.locator('.item-card:not(.removed)').nth(1).locator('.item-ean').textContent();

    // This should pass if mouse drag works correctly
    expect(newFirstEan).toBe(secondEan);
    expect(newSecondEan).toBe(firstEan);
  });
});
