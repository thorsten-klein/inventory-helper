const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

test.describe('Mouse Drag Debug', () => {
  const exampleFilePath = path.join(__dirname, '..', 'example', 'example.xlsx');

  test('Debug mouse drag on drag handle', async ({ page }) => {
    // Skip if example file doesn't exist
    if (!fs.existsSync(exampleFilePath)) {
      test.skip();
      return;
    }

    // Listen for errors
    const errors = [];
    page.on('pageerror', error => {
      console.log('JS Error:', error.message);
      errors.push(error.message);
    });
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('Console Error:', msg.text());
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
    const categorySelect = page.locator('#category-select');
    const options = await categorySelect.locator('option').all();
    let selectedValue = null;
    for (let i = 0; i < options.length; i++) {
      const value = await options[i].getAttribute('value');
      // Skip empty values and "-- New category --"
      if (value && value !== '' && value !== '-- New category --') {
        selectedValue = value;
        break;
      }
    }
    if (selectedValue) {
      await categorySelect.selectOption(selectedValue);
      await page.waitForTimeout(300);
    } else {
      test.skip();
      return;
    }

    // Check if Start Editing button is enabled
    const btnStartEditing = page.locator('#btn-start-editing');
    const isDisabled = await btnStartEditing.isDisabled();
    console.log('Start Editing button disabled:', isDisabled);

    // Click Start Editing
    await btnStartEditing.click();
    await page.waitForTimeout(1000);

    // Check which screen is visible
    const editorScreenVisible = await page.locator('#editor-screen:not(.hidden)').isVisible();
    console.log('Editor screen visible:', editorScreenVisible);

    // Wait for items to load
    try {
      await page.waitForSelector('.item-card:not(.removed)', { timeout: 10000 });
    } catch (e) {
      console.log('Failed to find items. JavaScript errors:', errors);
      throw e;
    }

    const itemCards = page.locator('.item-card:not(.removed)');
    const count = await itemCards.count();

    console.log('Number of items:', count);

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

    console.log('Before drag - First EAN:', firstEan);
    console.log('Before drag - Second EAN:', secondEan);

    // Get drag handle
    const dragHandle = firstCard.locator('.drag-handle');
    const handleBox = await dragHandle.boundingBox();
    const firstCardBox = await firstCard.boundingBox();
    const secondCardBox = await secondCard.boundingBox();

    console.log('Handle box:', handleBox);
    console.log('Second card box:', secondCardBox);

    // Check initial draggable state
    const initialDraggable = await page.evaluate(() => {
      const card = document.querySelector('.item-card:not(.removed)');
      return card.draggable;
    });
    console.log('Initial draggable:', initialDraggable);

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
          console.log(`Event: ${eventName}, draggable: ${card.draggable}`);
        });
      });
    });

    // Perform mouse drag
    const startX = handleBox.x + handleBox.width / 2;
    const startY = handleBox.y + handleBox.height / 2;
    const endX = secondCardBox.x + secondCardBox.width / 2;
    const endY = secondCardBox.y + secondCardBox.height / 2 + 10;

    console.log('Starting drag from', startX, startY, 'to', endX, endY);

    await page.mouse.move(startX, startY);
    await page.mouse.down();

    // Check draggable state after mousedown
    const draggableAfterMousedown = await page.evaluate(() => {
      const card = document.querySelector('.item-card:not(.removed)');
      return card.draggable;
    });
    console.log('Draggable after mousedown:', draggableAfterMousedown);

    await page.waitForTimeout(100);
    await page.mouse.move(endX, endY, { steps: 10 });
    await page.waitForTimeout(100);
    await page.mouse.up();
    await page.waitForTimeout(500);

    // Get events that fired
    const events = await page.evaluate(() => window.dragEvents);
    console.log('Events fired:', events);

    // Check final state
    const newFirstEan = await page.locator('.item-card:not(.removed)').first().locator('.item-ean').textContent();
    const newSecondEan = await page.locator('.item-card:not(.removed)').nth(1).locator('.item-ean').textContent();

    console.log('After drag - First EAN:', newFirstEan);
    console.log('After drag - Second EAN:', newSecondEan);

    // Check if drag worked
    const dragWorked = (newFirstEan === secondEan && newSecondEan === firstEan);
    console.log('Drag worked:', dragWorked);

    if (!dragWorked) {
      console.log('FAILED: Items did not swap');
      console.log('Expected first to be:', secondEan, 'but got:', newFirstEan);
      console.log('Expected second to be:', firstEan, 'but got:', newSecondEan);
    }

    // This test should pass if mouse drag works
    expect(dragWorked).toBe(true);
  });
});
