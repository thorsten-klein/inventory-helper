const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

test.describe('Long Press + Swipe Bug', () => {
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
    const hasItems = await page.locator('.item-card').count();
    expect(hasItems).toBeGreaterThan(0);
  });

  test('BUG: long press + swipe right should lock the item (mouse)', async ({ page }) => {
    // Get first item card
    const firstCard = page.locator('.item-card').first();

    // Get initial locked state
    const initialLocked = await firstCard.evaluate(card => card.classList.contains('locked'));

    // Get the card box
    const cardBox = await firstCard.boundingBox();
    if (!cardBox) {
      throw new Error('Could not get card bounding box');
    }

    // Start position (center left of card, not on drag handle)
    const startX = cardBox.x + 100;
    const startY = cardBox.y + cardBox.height / 2;
    // End position (near right edge of card)
    const endX = cardBox.x + cardBox.width - 50;
    const endY = startY;

    // Mouse down
    await page.mouse.move(startX, startY);
    await page.mouse.down();

    // Wait for long press threshold (200ms)
    await page.waitForTimeout(250);

    // Now swipe right while mouse is still down
    await page.mouse.move(endX, endY, { steps: 10 });

    // Mouse up
    await page.mouse.up();

    // Wait for any state changes to complete
    await page.waitForTimeout(200);

    // Get final locked state
    const finalLocked = await firstCard.evaluate(card => card.classList.contains('locked'));

    // EXPECTED BEHAVIOR: Item should toggle locked state
    expect(finalLocked).toBe(!initialLocked);
  });

  test('BUG: long press + swipe left should trigger remove dialog (mouse)', async ({ page }) => {
    // Get first item card
    const firstCard = page.locator('.item-card').first();

    // Get initial removed state
    const initialRemoved = await firstCard.evaluate(card => card.classList.contains('removed'));

    // Get the card box
    const cardBox = await firstCard.boundingBox();
    if (!cardBox) {
      throw new Error('Could not get card bounding box');
    }

    // Start position (center right of card, not on drag handle)
    const startX = cardBox.x + cardBox.width - 100;
    const startY = cardBox.y + cardBox.height / 2;
    // End position (near left edge of card)
    const endX = cardBox.x + 50;
    const endY = startY;

    // Mouse down
    await page.mouse.move(startX, startY);
    await page.mouse.down();

    // Wait for long press threshold (200ms)
    await page.waitForTimeout(250);

    // Now swipe left while mouse is still down
    await page.mouse.move(endX, endY, { steps: 10 });

    // Mouse up
    await page.mouse.up();

    // Wait for modal to appear
    await page.waitForTimeout(300);

    // EXPECTED BEHAVIOR: Swipe left should trigger remove confirmation modal
    const modal = page.locator('#confirm-remove-modal');
    const modalVisible = await modal.evaluate(modal => !modal.classList.contains('hidden'));

    // If item was not already removed, modal should appear for confirmation
    // If item was already removed, swipe left should un-remove it without modal
    if (!initialRemoved) {
      expect(modalVisible).toBe(true);
    } else {
      const finalRemoved = await firstCard.evaluate(card => card.classList.contains('removed'));
      expect(finalRemoved).toBe(false);
    }
  });

  test('BUG: long press + swipe right should lock the item (touch)', async ({ page }) => {
    // Get first item card
    const firstCard = page.locator('.item-card').first();

    // Get initial locked state
    const initialLocked = await firstCard.evaluate(card => card.classList.contains('locked'));

    // Get the card box
    const cardBox = await firstCard.boundingBox();
    if (!cardBox) {
      throw new Error('Could not get card bounding box');
    }

    // Perform long press + swipe with touch events
    const startX = cardBox.x + 100;
    const startY = cardBox.y + cardBox.height / 2;
    const endX = cardBox.x + cardBox.width - 50;
    const endY = startY;

    await firstCard.evaluate((card, coords) => {
      const startX = coords.startX;
      const startY = coords.startY;
      const endX = coords.endX;
      const endY = coords.endY;

      // Touchstart
      const touchStart = new Touch({
        identifier: 0,
        target: card,
        clientX: startX,
        clientY: startY,
        screenX: startX,
        screenY: startY,
        pageX: startX,
        pageY: startY,
      });
      const touchStartEvent = new TouchEvent('touchstart', {
        touches: [touchStart],
        targetTouches: [touchStart],
        changedTouches: [touchStart],
        bubbles: true,
        cancelable: true,
      });
      card.dispatchEvent(touchStartEvent);

      // Wait for long press (simulate with setTimeout)
      setTimeout(() => {
        // Touchmove (swipe right)
        const touchMove = new Touch({
          identifier: 0,
          target: card,
          clientX: endX,
          clientY: endY,
          screenX: endX,
          screenY: endY,
          pageX: endX,
          pageY: endY,
        });
        const touchMoveEvent = new TouchEvent('touchmove', {
          touches: [touchMove],
          targetTouches: [touchMove],
          changedTouches: [touchMove],
          bubbles: true,
          cancelable: true,
        });
        card.dispatchEvent(touchMoveEvent);

        // Touchend
        setTimeout(() => {
          const touchEnd = new Touch({
            identifier: 0,
            target: card,
            clientX: endX,
            clientY: endY,
            screenX: endX,
            screenY: endY,
            pageX: endX,
            pageY: endY,
          });
          const touchEndEvent = new TouchEvent('touchend', {
            touches: [],
            targetTouches: [],
            changedTouches: [touchEnd],
            bubbles: true,
            cancelable: true,
          });
          card.dispatchEvent(touchEndEvent);
        }, 100);
      }, 250);
    }, { startX, startY, endX, endY });

    // Wait for touch events to complete
    await page.waitForTimeout(500);

    // Get final locked state
    const finalLocked = await firstCard.evaluate(card => card.classList.contains('locked'));

    // EXPECTED BEHAVIOR: Item should toggle locked state
    expect(finalLocked).toBe(!initialLocked);
  });
});
