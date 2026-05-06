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

    // Select first real category (not placeholder)
    const categoryOptions = await page.locator('#category-select option').all();
    let selectedCategory = null;
    for (const option of categoryOptions) {
      const value = await option.getAttribute('value');
      const text = await option.textContent();
      // Skip placeholders and empty values
      if (value && !value.startsWith('--') && !text.startsWith('--')) {
        selectedCategory = value;
        break;
      }
    }

    if (selectedCategory) {
      await page.selectOption('#category-select', selectedCategory);
      await page.waitForTimeout(300);

      // Click Start Editing
      await page.click('#btn-start-editing');
      await page.waitForTimeout(1000);

      // Wait for editor screen to be visible
      await page.waitForSelector('#editor-screen:not(.hidden)', { timeout: 5000 });
      await page.waitForSelector('.item-card', { timeout: 5000 });
    }
  });

  test('REPRODUCE BUG: Mouse drag should reorder items', async ({ page }) => {
    // Listen to console for debug messages
    page.on('console', msg => {
      if (msg.type() === 'log') {
        console.log('Browser:', msg.text());
      }
    });

    // Wait for items to load
    await page.waitForSelector('.item-card', { timeout: 10000 });

    const itemCards = page.locator('.item-card');
    const count = await itemCards.count();

    console.log('Total items found:', count);

    if (count < 2) {
      test.skip();
      return;
    }

    // Get first two items
    const firstCard = itemCards.first();
    const secondCard = itemCards.nth(1);

    // Get original EAN values
    const firstEan = await firstCard.locator('.item-ean').textContent();
    const secondEan = await secondCard.locator('.item-ean').textContent();

    console.log('BEFORE DRAG:');
    console.log('  First item EAN:', firstEan);
    console.log('  Second item EAN:', secondEan);

    // Get drag handle of first item
    const dragHandle = firstCard.locator('.drag-handle');
    const handleBox = await dragHandle.boundingBox();
    const secondCardBox = await secondCard.boundingBox();

    if (!handleBox || !secondCardBox) {
      throw new Error('Could not get bounding boxes');
    }

    console.log('Drag handle position:', handleBox);
    console.log('Second card position:', secondCardBox);

    // Perform mouse drag from handle to second card
    const startX = handleBox.x + handleBox.width / 2;
    const startY = handleBox.y + handleBox.height / 2;
    const endX = secondCardBox.x + secondCardBox.width / 2;
    const endY = secondCardBox.y + secondCardBox.height / 2;

    console.log(`Dragging from (${startX}, ${startY}) to (${endX}, ${endY})`);

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

    console.log('AFTER DRAG:');
    console.log('  First item EAN:', newFirstEan);
    console.log('  Second item EAN:', newSecondEan);

    const itemsSwapped = (newFirstEan === secondEan && newSecondEan === firstEan);

    if (itemsSwapped) {
      console.log('✓ SUCCESS: Items were swapped correctly');
    } else {
      console.log('✗ BUG REPRODUCED: Items were NOT swapped');
      console.log('  Expected first to be:', secondEan);
      console.log('  Expected second to be:', firstEan);
    }

    // This should pass if mouse drag works correctly
    expect(newFirstEan).toBe(secondEan);
    expect(newSecondEan).toBe(firstEan);
  });
});
