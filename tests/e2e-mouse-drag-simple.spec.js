const { test, expect } = require('@playwright/test');
const { setupEditor } = require('./helpers');
const path = require('path');
const fs = require('fs');

test.describe('Mouse Drag - Simple Test', () => {
  const exampleFilePath = path.join(__dirname, '..', 'example', 'example.xlsx');

  test.beforeEach(async ({ page, context }) => {
    await setupEditor(page, context);
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

    // Perform drag using programmatic HTML5 drag-and-drop events
    await page.evaluate(() => {
      const cards = document.querySelectorAll('.item-card');
      const firstCard = cards[0];
      const secondCard = cards[1];
      const dragHandle = firstCard.querySelector('.drag-handle');

      // Create and dispatch dragstart
      const dragStartEvent = new DragEvent('dragstart', {
        bubbles: true,
        cancelable: true,
        dataTransfer: new DataTransfer()
      });

      Object.defineProperty(dragStartEvent, 'target', {
        value: dragHandle,
        enumerable: true
      });

      firstCard.dispatchEvent(dragStartEvent);
      dragStartEvent.dataTransfer.setData('application/x-item-index', firstCard.dataset.itemIndex);

      // Dispatch dragover
      const dragOverEvent = new DragEvent('dragover', {
        bubbles: true,
        cancelable: true,
        clientY: secondCard.getBoundingClientRect().top + secondCard.getBoundingClientRect().height * 0.6,
        dataTransfer: dragStartEvent.dataTransfer
      });
      secondCard.dispatchEvent(dragOverEvent);

      // Dispatch drop
      const dropEvent = new DragEvent('drop', {
        bubbles: true,
        cancelable: true,
        clientY: secondCard.getBoundingClientRect().top + secondCard.getBoundingClientRect().height * 0.6,
        dataTransfer: dragStartEvent.dataTransfer
      });
      secondCard.dispatchEvent(dropEvent);

      // Dispatch dragend
      const dragEndEvent = new DragEvent('dragend', {
        bubbles: true,
        cancelable: true
      });
      firstCard.dispatchEvent(dragEndEvent);
    });

    // Wait for reorder to complete (first item EAN should change)
    await page.waitForFunction(
      (expectedFirstEan) => {
        const firstCard = document.querySelector('.item-card:not(.removed)');
        const eanElement = firstCard?.querySelector('.item-ean');
        return eanElement?.textContent === expectedFirstEan;
      },
      secondEan,
      { timeout: 2000 }
    );

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
