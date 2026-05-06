const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

test.describe('Mouse Drag Debug', () => {
  const exampleFilePath = path.join(__dirname, '..', 'example', 'example.xlsx');

  test('Debug mouse drag on drag handle', async ({ page }) => {
    // Verify example file exists
    expect(fs.existsSync(exampleFilePath)).toBeTruthy();

    // Listen for errors
    const errors = [];
    page.on('pageerror', error => {
      errors.push(error.message);
    });
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Navigate to app
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // Upload file
    const fileInput = page.locator('#file-input');
    await fileInput.setInputFiles(exampleFilePath);
    await page.waitForTimeout(2000);

    // Navigate to category screen
    await page.click('#btn-next-category');
    await page.waitForTimeout(500);

    // Select first real category (skip the placeholder options)
    const categoryOptions = await page.locator('#category-select option').all();
    for (const option of categoryOptions) {
      const value = await option.getAttribute('value');
      const text = await option.textContent();
      // Skip placeholder options
      if (value && value !== '' && !text.includes('--')) {
        await page.selectOption('#category-select', value);
        await page.waitForTimeout(300);
        break;
      }
    }

    // Check if Start Editing button is enabled
    const btnStartEditing = page.locator('#btn-start-editing');
    const isDisabled = await btnStartEditing.isDisabled();

    // Click Start Editing
    await btnStartEditing.click();
    await page.waitForTimeout(1000);

    // Check which screen is visible
    const editorScreenVisible = await page.locator('#editor-screen:not(.hidden)').isVisible();

    // Wait for items to load
    try {
      await page.waitForSelector('.item-card:not(.removed)', { timeout: 10000 });
    } catch (e) {
      throw e;
    }

    const itemCards = page.locator('.item-card:not(.removed)');
    const count = await itemCards.count();

    expect(count).toBeGreaterThanOrEqual(2);

    // Get first two items
    const firstCard = itemCards.first();
    const secondCard = itemCards.nth(1);

    // Get original EAN values
    const firstEan = await firstCard.locator('.item-ean').textContent();
    const secondEan = await secondCard.locator('.item-ean').textContent();

    // Get drag handle
    const dragHandle = firstCard.locator('.drag-handle');
    const handleBox = await dragHandle.boundingBox();
    const firstCardBox = await firstCard.boundingBox();
    const secondCardBox = await secondCard.boundingBox();

    // Check initial draggable state
    const initialDraggable = await page.evaluate(() => {
      const card = document.querySelector('.item-card:not(.removed)');
      return card.draggable;
    });

    // Listen for drag events
    await page.evaluate(() => {
      window.dragEvents = [];
      const card = document.querySelector('.item-card:not(.removed)');

      ['mousedown', 'dragstart', 'drag', 'dragend', 'touchstart', 'touchmove', 'touchend'].forEach(eventName => {
        card.addEventListener(eventName, (e) => {
          window.dragEvents.push({
            type: eventName,
            timestamp: Date.now(),
            draggable: card.draggable,
            isTouchInteraction: e.type.startsWith('touch')
          });
        });
      });
    });

    // Perform mouse drag
    const startX = handleBox.x + handleBox.width / 2;
    const startY = handleBox.y + handleBox.height / 2;
    const endX = secondCardBox.x + secondCardBox.width / 2;
    const endY = secondCardBox.y + secondCardBox.height / 2 + 10;

    await page.mouse.move(startX, startY);
    await page.mouse.down();

    // Check draggable state after mousedown
    const draggableAfterMousedown = await page.evaluate(() => {
      const card = document.querySelector('.item-card:not(.removed)');
      return card.draggable;
    });

    await page.waitForTimeout(100);
    await page.mouse.move(endX, endY, { steps: 10 });
    await page.waitForTimeout(100);
    await page.mouse.up();
    await page.waitForTimeout(500);

    // Get events that fired
    const events = await page.evaluate(() => window.dragEvents);

    // Check final state
    const newFirstEan = await page.locator('.item-card:not(.removed)').first().locator('.item-ean').textContent();
    const newSecondEan = await page.locator('.item-card:not(.removed)').nth(1).locator('.item-ean').textContent();

    // Check if drag worked
    const dragWorked = (newFirstEan === secondEan && newSecondEan === firstEan);

    // This test should pass if mouse drag works
    expect(dragWorked).toBe(true);
  });
});
