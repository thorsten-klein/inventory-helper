const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

test.describe('Mouse Drag - Event Debug', () => {
  const exampleFilePath = path.join(__dirname, '..', 'example', 'example.xlsx');

  test.beforeEach(async ({ page, context }) => {
    await context.clearCookies();
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => localStorage.clear());
    await page.waitForTimeout(500);

    if (!fs.existsSync(exampleFilePath)) {
      test.skip();
      return;
    }

    const fileInput = page.locator('#file-input');
    await fileInput.setInputFiles(exampleFilePath);
    await page.waitForTimeout(2000);

    await page.click('#btn-next-category');
    await page.waitForTimeout(500);

    const categoryOptions = await page.locator('#category-select option').all();
    let selectedCategory = null;
    for (const option of categoryOptions) {
      const value = await option.getAttribute('value');
      const text = await option.textContent();
      if (value && !value.startsWith('--') && !text.startsWith('--')) {
        selectedCategory = value;
        break;
      }
    }

    if (selectedCategory) {
      await page.selectOption('#category-select', selectedCategory);
      await page.waitForTimeout(300);
      await page.click('#btn-start-editing');
      await page.waitForTimeout(1000);
      await page.waitForSelector('#editor-screen:not(.hidden)', { timeout: 5000 });
      await page.waitForSelector('.item-card', { timeout: 5000 });
    }
  });

  test('Check what events fire when dragging', async ({ page }) => {
    await page.waitForSelector('.item-card', { timeout: 10000 });

    // Set up event logging
    await page.evaluate(() => {
      window.dragEventLog = [];
      const card1 = document.querySelector('.item-card');
      const card2 = document.querySelectorAll('.item-card')[1];
      const handle = card1.querySelector('.drag-handle');

      const events = ['mousedown', 'mouseup', 'dragstart', 'drag', 'dragend', 'dragover', 'drop', 'dragleave'];

      events.forEach(eventName => {
        card1.addEventListener(eventName, (e) => {
          window.dragEventLog.push({
            event: `${eventName}(card1)`,
            target: e.target.className,
            draggable: card1.draggable,
            timestamp: Date.now()
          });
          console.log(`[CARD1] ${eventName} - draggable: ${card1.draggable}`);
        }, true);

        card2.addEventListener(eventName, (e) => {
          window.dragEventLog.push({
            event: `${eventName}(card2)`,
            target: e.target.className,
            draggable: card2.draggable,
            timestamp: Date.now()
          });
          console.log(`[CARD2] ${eventName} - draggable: ${card2.draggable}`);
        }, true);

        handle.addEventListener(eventName, (e) => {
          window.dragEventLog.push({
            event: `${eventName}(handle)`,
            target: e.target.className,
            draggable: card1.draggable,
            timestamp: Date.now()
          });
          console.log(`[HANDLE] ${eventName} - draggable: ${card1.draggable}`);
        }, true);
      });
    });

    const firstCard = page.locator('.item-card').first();
    const dragHandle = firstCard.locator('.drag-handle');
    const secondCard = page.locator('.item-card').nth(1);

    const handleBox = await dragHandle.boundingBox();
    const secondCardBox = await secondCard.boundingBox();

    const startX = handleBox.x + handleBox.width / 2;
    const startY = handleBox.y + handleBox.height / 2;
    const endX = secondCardBox.x + secondCardBox.width / 2;
    const endY = secondCardBox.y + secondCardBox.height / 2;

    console.log('Starting drag...');
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.waitForTimeout(100);
    await page.mouse.move(endX, endY, { steps: 10 });
    await page.waitForTimeout(100);
    await page.mouse.up();
    await page.waitForTimeout(500);

    // Get the event log
    const eventLog = await page.evaluate(() => window.dragEventLog);
    console.log('Event log:');
    eventLog.forEach(e => {
      console.log(`  ${e.event} - draggable: ${e.draggable}`);
    });

    // Check if dragstart fired
    const dragStartFired = eventLog.some(e => e.event === 'dragstart');
    console.log('Dragstart fired:', dragStartFired);

    expect(dragStartFired).toBe(true);
  });
});
