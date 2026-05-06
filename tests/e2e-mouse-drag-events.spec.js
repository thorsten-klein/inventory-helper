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
    // Removed 500ms timeout

    expect(fs.existsSync(exampleFilePath)).toBeTruthy();

    const fileInput = page.locator('#file-input');
    await fileInput.setInputFiles(exampleFilePath);
    // Removed 2000ms timeout - handled by helpers

    await page.click('#btn-next-category');
    // Removed 500ms timeout

    const categoryOptions = await page.locator('#category-select option').all();
    for (const option of categoryOptions) {
      const value = await option.getAttribute('value');
      const text = await option.textContent();
      // Skip placeholder options
      if (value && value !== '' && !text.includes('--')) {
        await page.selectOption('#category-select', value);
        // Removed 300ms timeout
        await page.click('#btn-start-editing');
        // Removed 1000ms timeout
        await page.waitForSelector('#editor-screen:not(.hidden)', { timeout: 5000 });
        await page.waitForSelector('.item-card', { timeout: 5000 });
        break;
      }
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
        }, true);

        card2.addEventListener(eventName, (e) => {
          window.dragEventLog.push({
            event: `${eventName}(card2)`,
            target: e.target.className,
            draggable: card2.draggable,
            timestamp: Date.now()
          });
        }, true);

        handle.addEventListener(eventName, (e) => {
          window.dragEventLog.push({
            event: `${eventName}(handle)`,
            target: e.target.className,
            draggable: card1.draggable,
            timestamp: Date.now()
          });
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

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.waitForTimeout(100);
    await page.mouse.move(endX, endY, { steps: 10 });
    await page.waitForTimeout(100);
    await page.mouse.up();
    // Removed 500ms timeout

    // Get the event log
    const eventLog = await page.evaluate(() => window.dragEventLog);

    // Check if dragstart fired
    const dragStartFired = eventLog.some(e => e.event === 'dragstart');

    expect(dragStartFired).toBe(true);
  });
});
