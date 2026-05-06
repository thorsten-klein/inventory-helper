const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

test.describe('Editor Screen - Touch Drag and Drop', () => {
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

  test('Touch drag on drag handle should reorder items', async ({ page }) => {
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

    // Get positions
    const dragHandle = firstCard.locator('.drag-handle');
    const handleBox = await dragHandle.boundingBox();
    const secondCardBox = await secondCard.boundingBox();

    if (!handleBox || !secondCardBox) {
      throw new Error('Could not get bounding boxes');
    }

    // Calculate touch coordinates
    const startX = handleBox.x + handleBox.width / 2;
    const startY = handleBox.y + handleBox.height / 2;
    const endX = secondCardBox.x + secondCardBox.width / 2;
    const endY = secondCardBox.y + secondCardBox.height / 2 + 10; // Drop below midpoint

    // Simulate touch drag from handle to second card
    await page.evaluate((coords) => {
      const handle = document.querySelector('.drag-handle');
      const firstCard = handle.closest('.item-card');

      // Create touch start event on drag handle (should enable immediate drag)
      const touchStart = new Touch({
        identifier: 1,
        target: handle,
        clientX: coords.startX,
        clientY: coords.startY,
        screenX: coords.startX,
        screenY: coords.startY,
      });

      firstCard.dispatchEvent(new TouchEvent('touchstart', {
        touches: [touchStart],
        changedTouches: [touchStart],
        bubbles: true,
        cancelable: true
      }));

      // Wait for drag to be enabled, then simulate movement
      setTimeout(() => {
        // Simulate multiple touchmove events to create realistic drag
        const steps = 5;
        for (let i = 1; i <= steps; i++) {
          const x = coords.startX + (coords.endX - coords.startX) * (i / steps);
          const y = coords.startY + (coords.endY - coords.startY) * (i / steps);

          const touchMove = new Touch({
            identifier: 1,
            target: document.elementFromPoint(x, y) || firstCard,
            clientX: x,
            clientY: y,
            screenX: x,
            screenY: y,
          });

          firstCard.dispatchEvent(new TouchEvent('touchmove', {
            touches: [touchMove],
            changedTouches: [touchMove],
            bubbles: true,
            cancelable: true
          }));
        }

        // Trigger touchend at final position
        setTimeout(() => {
          const touchEnd = new Touch({
            identifier: 1,
            target: document.elementFromPoint(coords.endX, coords.endY) || firstCard,
            clientX: coords.endX,
            clientY: coords.endY,
            screenX: coords.endX,
            screenY: coords.endY,
          });

          firstCard.dispatchEvent(new TouchEvent('touchend', {
            touches: [],
            changedTouches: [touchEnd],
            bubbles: true,
            cancelable: true
          }));
        }, 50);
      }, 50);
    }, {
      startX,
      startY,
      endX,
      endY
    });

    // Wait for drag operation to complete and items to re-render
    await page.waitForTimeout(1000);

    // Check if items were reordered
    const newFirstEan = await page.locator('.item-card:not(.removed)').first().locator('.item-ean').textContent();
    const newSecondEan = await page.locator('.item-card:not(.removed)').nth(1).locator('.item-ean').textContent();

    // Items should have swapped positions
    expect(newFirstEan).toBe(secondEan);
    expect(newSecondEan).toBe(firstEan);
  });

  test('Touch drag should show visual feedback during drag', async ({ page }) => {
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
    const endX = startX;
    const endY = startY + 100;

    // Check if dragging class is applied during touch drag
    const dragFeedback = await page.evaluate((coords) => {
      return new Promise((resolve) => {
        const handle = document.querySelector('.drag-handle');
        const card = handle.closest('.item-card');
        let hasDraggingClass = false;

        const touchStart = new Touch({
          identifier: 1,
          target: handle,
          clientX: coords.startX,
          clientY: coords.startY,
          screenX: coords.startX,
          screenY: coords.startY,
        });

        card.dispatchEvent(new TouchEvent('touchstart', {
          touches: [touchStart],
          changedTouches: [touchStart],
          bubbles: true,
          cancelable: true
        }));

        // Wait for drag enable, then move
        setTimeout(() => {
          const touchMove = new Touch({
            identifier: 1,
            target: card,
            clientX: coords.endX,
            clientY: coords.endY,
            screenX: coords.endX,
            screenY: coords.endY,
          });

          card.dispatchEvent(new TouchEvent('touchmove', {
            touches: [touchMove],
            changedTouches: [touchMove],
            bubbles: true,
            cancelable: true
          }));

          // Check if card has dragging class after move
          setTimeout(() => {
            hasDraggingClass = card.classList.contains('dragging');

            const touchEnd = new Touch({
              identifier: 1,
              target: card,
              clientX: coords.endX,
              clientY: coords.endY,
              screenX: coords.endX,
              screenY: coords.endY,
            });

            card.dispatchEvent(new TouchEvent('touchend', {
              touches: [],
              changedTouches: [touchEnd],
              bubbles: true,
              cancelable: true
            }));

            resolve(hasDraggingClass);
          }, 50);
        }, 50);
      });
    }, { startX, startY, endX, endY });

    // Should have dragging class during drag
    expect(dragFeedback).toBe(true);
  });

  test('Touch drag should show drop indicators on target cards', async ({ page }) => {
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
    const dragHandle = firstCard.locator('.drag-handle');
    const handleBox = await dragHandle.boundingBox();
    const secondCardBox = await secondCard.boundingBox();

    if (!handleBox || !secondCardBox) {
      throw new Error('Could not get bounding boxes');
    }

    const startX = handleBox.x + handleBox.width / 2;
    const startY = handleBox.y + handleBox.height / 2;
    const endX = secondCardBox.x + secondCardBox.width / 2;
    const endY = secondCardBox.y + secondCardBox.height / 2 + 10; // Below middle

    // Check if drop indicator appears during drag
    const hasDropIndicator = await page.evaluate((coords) => {
      return new Promise((resolve) => {
        const handle = document.querySelector('.drag-handle');
        const firstCard = handle.closest('.item-card');
        let foundIndicator = false;

        const touchStart = new Touch({
          identifier: 1,
          target: handle,
          clientX: coords.startX,
          clientY: coords.startY,
          screenX: coords.startX,
          screenY: coords.startY,
        });

        firstCard.dispatchEvent(new TouchEvent('touchstart', {
          touches: [touchStart],
          changedTouches: [touchStart],
          bubbles: true,
          cancelable: true
        }));

        setTimeout(() => {
          const touchMove = new Touch({
            identifier: 1,
            target: document.elementFromPoint(coords.endX, coords.endY) || firstCard,
            clientX: coords.endX,
            clientY: coords.endY,
            screenX: coords.endX,
            screenY: coords.endY,
          });

          firstCard.dispatchEvent(new TouchEvent('touchmove', {
            touches: [touchMove],
            changedTouches: [touchMove],
            bubbles: true,
            cancelable: true
          }));

          // Check for drop indicators
          setTimeout(() => {
            const cardsWithIndicators = document.querySelectorAll('.item-card.drag-over-top, .item-card.drag-over-bottom');
            foundIndicator = cardsWithIndicators.length > 0;

            const touchEnd = new Touch({
              identifier: 1,
              target: document.elementFromPoint(coords.endX, coords.endY) || firstCard,
              clientX: coords.endX,
              clientY: coords.endY,
              screenX: coords.endX,
              screenY: coords.endY,
            });

            firstCard.dispatchEvent(new TouchEvent('touchend', {
              touches: [],
              changedTouches: [touchEnd],
              bubbles: true,
              cancelable: true
            }));

            resolve(foundIndicator);
          }, 50);
        }, 50);
      });
    }, { startX, startY, endX, endY });

    // Should show drop indicator during drag
    expect(hasDropIndicator).toBe(true);
  });
});
