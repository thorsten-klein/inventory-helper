const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

test.describe('Editor Screen - Mouse Drag and Drop', () => {
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
    const btnNext = page.locator('#btn-next-category');
    if (await btnNext.isVisible()) {
      await btnNext.click();
      await page.waitForTimeout(500);
    }

    // Select first category
    const categorySelect = page.locator('#category-select');
    if (await categorySelect.isVisible()) {
      const categoryOptions = await categorySelect.locator('option').count();
      if (categoryOptions > 0) {
        const firstOptionValue = await categorySelect.locator('option').first().getAttribute('value');
        if (firstOptionValue) {
          await categorySelect.selectOption(firstOptionValue);
          await page.waitForTimeout(300);

          // Click Start Editing
          await page.click('#btn-start-editing');
          await page.waitForTimeout(1000);

          // Wait for editor screen to be visible
          await page.waitForSelector('#editor-screen:not(.hidden)', { timeout: 10000 });
        }
      }
    }
  });

  test('BUG: Mouse drag from drag handle should reorder items', async ({ page }) => {
    // Wait for items to load
    await page.waitForSelector('.item-card:not(.removed)', { timeout: 10000 });

    const itemCards = page.locator('.item-card:not(.removed)');
    const count = await itemCards.count();
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

    console.log('Before drag - First EAN:', firstEan, 'Second EAN:', secondEan);

    // Get positions
    const dragHandle = firstCard.locator('.drag-handle');
    const handleBox = await dragHandle.boundingBox();
    const secondCardBox = await secondCard.boundingBox();

    if (!handleBox || !secondCardBox) {
      throw new Error('Could not get bounding boxes');
    }

    // Perform mouse drag from drag handle to second card
    const startX = handleBox.x + handleBox.width / 2;
    const startY = handleBox.y + handleBox.height / 2;
    const endX = secondCardBox.x + secondCardBox.width / 2;
    const endY = secondCardBox.y + secondCardBox.height / 2 + 10; // Drop below midpoint

    console.log('Mouse drag from', { startX, startY }, 'to', { endX, endY });

    // Use Playwright's drag and drop
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.waitForTimeout(100); // Short delay to trigger drag
    await page.mouse.move(endX, endY, { steps: 10 });
    await page.waitForTimeout(100);
    await page.mouse.up();

    // Wait for drag operation to complete
    await page.waitForTimeout(1000);

    // Check if items were reordered
    const newFirstEan = await page.locator('.item-card:not(.removed)').first().locator('.item-ean').textContent();
    const newSecondEan = await page.locator('.item-card:not(.removed)').nth(1).locator('.item-ean').textContent();

    console.log('After drag - First EAN:', newFirstEan, 'Second EAN:', newSecondEan);

    // Items should have swapped positions
    expect(newFirstEan).toBe(secondEan);
    expect(newSecondEan).toBe(firstEan);
  });

  test('Mouse drag should trigger HTML5 drag events', async ({ page }) => {
    // Wait for items to load
    await page.waitForSelector('.item-card:not(.removed)', { timeout: 10000 });

    const itemCards = page.locator('.item-card:not(.removed)');
    const count = await itemCards.count();
    if (count < 2) {
      test.skip();
      return;
    }

    // Get first item
    const firstCard = itemCards.first();
    const dragHandle = firstCard.locator('.drag-handle');
    const handleBox = await dragHandle.boundingBox();

    if (!handleBox) {
      throw new Error('Could not get bounding box');
    }

    const startX = handleBox.x + handleBox.width / 2;
    const startY = handleBox.y + handleBox.height / 2;

    // Check if dragstart event is fired
    const dragEvents = await page.evaluate((coords) => {
      return new Promise((resolve) => {
        const handle = document.querySelector('.drag-handle');
        const card = handle.closest('.item-card');
        const events = [];

        // Listen for drag events
        card.addEventListener('dragstart', () => {
          events.push('dragstart');
        }, { once: true });

        card.addEventListener('dragend', () => {
          events.push('dragend');
          resolve(events);
        }, { once: true });

        // Simulate mousedown on drag handle
        const mouseDown = new MouseEvent('mousedown', {
          bubbles: true,
          cancelable: true,
          clientX: coords.x,
          clientY: coords.y,
          screenX: coords.x,
          screenY: coords.y,
        });
        handle.dispatchEvent(mouseDown);

        // Wait a bit, then try to trigger drag
        setTimeout(() => {
          // Check if card is draggable
          console.log('Card draggable:', card.draggable);

          if (!card.draggable) {
            resolve(['error: card not draggable']);
            return;
          }

          // Try to dispatch dragstart manually
          const dragStart = new DragEvent('dragstart', {
            bubbles: true,
            cancelable: true,
            dataTransfer: new DataTransfer()
          });
          card.dispatchEvent(dragStart);

          setTimeout(() => {
            const dragEnd = new DragEvent('dragend', {
              bubbles: true,
              cancelable: true
            });
            card.dispatchEvent(dragEnd);
          }, 100);
        }, 100);
      });
    }, { x: startX, y: startY });

    console.log('Drag events:', dragEvents);

    // Should have both dragstart and dragend events
    expect(dragEvents).toContain('dragstart');
  });

  test('Card should have draggable=true after mousedown on drag handle', async ({ page }) => {
    // Wait for items to load
    await page.waitForSelector('.item-card:not(.removed)', { timeout: 10000 });

    const firstCard = page.locator('.item-card:not(.removed)').first();
    const dragHandle = firstCard.locator('.drag-handle');

    // Initially, card should not be draggable
    const initialDraggable = await firstCard.evaluate(el => el.draggable);
    expect(initialDraggable).toBe(false);

    // Click on drag handle
    await dragHandle.click({ force: true });
    await page.waitForTimeout(100);

    // After clicking drag handle, card should be draggable
    const afterClickDraggable = await firstCard.evaluate(el => el.draggable);

    console.log('Initial draggable:', initialDraggable);
    console.log('After click draggable:', afterClickDraggable);

    // This should be true for drag to work
    expect(afterClickDraggable).toBe(true);
  });
});
