const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

test.describe('Swipe on Article/EAN Text Bug', () => {
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

  test('BUG: swipe right starting on article number should lock the item', async ({ page }) => {
    // Get first item card
    const firstCard = page.locator('.item-card').first();

    // Get initial locked state
    const initialLocked = await firstCard.evaluate(card => card.classList.contains('locked'));

    // Get the article number element
    const articleElement = firstCard.locator('.item-article strong').first();
    const articleBox = await articleElement.boundingBox();

    if (!articleBox) {
      throw new Error('Could not get article element bounding box');
    }

    // Get the card box to ensure we stay within it
    const cardBox = await firstCard.boundingBox();
    if (!cardBox) {
      throw new Error('Could not get card bounding box');
    }

    // Perform swipe right: start on article number text, end within same card
    const startX = articleBox.x + articleBox.width / 2;
    const startY = articleBox.y + articleBox.height / 2;
    const endX = cardBox.x + cardBox.width - 50; // End near the right edge of the card
    const endY = startY; // Keep same Y coordinate

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(endX, endY, { steps: 10 });
    await page.mouse.up();

    // Wait for any state changes to complete
    await page.waitForTimeout(200);

    // Get final locked state
    const finalLocked = await firstCard.evaluate(card => card.classList.contains('locked'));

    // EXPECTED BEHAVIOR: Item should toggle locked state
    expect(finalLocked).toBe(!initialLocked);
  });

  test('BUG: swipe right starting on EAN should lock the item', async ({ page }) => {
    // Get first item card
    const firstCard = page.locator('.item-card').first();

    // Get initial locked state
    const initialLocked = await firstCard.evaluate(card => card.classList.contains('locked'));

    // Get the EAN element
    const eanElement = firstCard.locator('.item-ean').first();
    const eanBox = await eanElement.boundingBox();

    if (!eanBox) {
      throw new Error('Could not get EAN element bounding box');
    }

    // Get the card box to ensure we stay within it
    const cardBox = await firstCard.boundingBox();
    if (!cardBox) {
      throw new Error('Could not get card bounding box');
    }

    // Perform swipe right: start on EAN text, end within same card
    const startX = eanBox.x + eanBox.width / 2;
    const startY = eanBox.y + eanBox.height / 2;
    const endX = cardBox.x + cardBox.width - 50; // End near the right edge of the card
    const endY = startY; // Keep same Y coordinate

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(endX, endY, { steps: 10 });
    await page.mouse.up();

    // Wait for any state changes to complete
    await page.waitForTimeout(200);

    // Get final locked state
    const finalLocked = await firstCard.evaluate(card => card.classList.contains('locked'));

    // EXPECTED BEHAVIOR: Item should toggle locked state
    expect(finalLocked).toBe(!initialLocked);
  });

  test('CONTROL: swipe right starting on location area should lock the item', async ({ page }) => {
    // Get first item card
    const firstCard = page.locator('.item-card').first();

    // Get initial locked state
    const initialLocked = await firstCard.evaluate(card => card.classList.contains('locked'));

    // Get the location element (right side of card)
    const locationElement = firstCard.locator('.item-location').first();
    const locationBox = await locationElement.boundingBox();

    if (!locationBox) {
      throw new Error('Could not get location element bounding box');
    }

    // Get the card box to ensure we stay within it
    const cardBox = await firstCard.boundingBox();
    if (!cardBox) {
      throw new Error('Could not get card bounding box');
    }

    // Perform swipe right: start on location area, end within same card
    const startX = locationBox.x + 50;
    const startY = locationBox.y + locationBox.height / 2;
    const endX = cardBox.x + cardBox.width - 50; // End near the right edge of the card
    const endY = startY; // Keep same Y coordinate

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(endX, endY, { steps: 10 });
    await page.mouse.up();

    // Wait for any state changes to complete
    await page.waitForTimeout(200);

    // Get final locked state
    const finalLocked = await firstCard.evaluate(card => card.classList.contains('locked'));

    // EXPECTED BEHAVIOR: Item should toggle locked state (this is the control test)
    expect(finalLocked).toBe(!initialLocked);
  });

  test('BUG: touch swipe right starting on article number should lock the item', async ({ page }) => {
    // Get first item card
    const firstCard = page.locator('.item-card').first();

    // Get initial locked state
    const initialLocked = await firstCard.evaluate(card => card.classList.contains('locked'));

    // Get the article number element
    const articleElement = firstCard.locator('.item-article strong').first();
    const articleBox = await articleElement.boundingBox();

    if (!articleBox) {
      throw new Error('Could not get article element bounding box');
    }

    // Get the card box to ensure we stay within it
    const cardBox = await firstCard.boundingBox();
    if (!cardBox) {
      throw new Error('Could not get card bounding box');
    }

    // Perform touch swipe right: start on article number text, end within same card
    const startX = articleBox.x + articleBox.width / 2;
    const startY = articleBox.y + articleBox.height / 2;
    const endX = cardBox.x + cardBox.width - 50; // End near the right edge of the card
    const endY = startY; // Keep same Y coordinate

    // Simulate a swipe with touch events starting on the article element
    await articleElement.evaluate((articleEl, coords) => {
      const startX = coords.startX;
      const startY = coords.startY;
      const endX = coords.endX;
      const endY = coords.endY;

      // Get the card element (parent)
      const card = articleEl.closest('.item-card');

      // Create and dispatch touchstart on the article element
      const touchStart = new Touch({
        identifier: 0,
        target: articleEl,
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
      // Dispatch on the article element so it bubbles up to card
      articleEl.dispatchEvent(touchStartEvent);

      // Create and dispatch touchmove
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

      // Create and dispatch touchend
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
    }, { startX, startY, endX, endY });

    // Wait for any state changes to complete
    await page.waitForTimeout(200);

    // Get final locked state
    const finalLocked = await firstCard.evaluate(card => card.classList.contains('locked'));

    // EXPECTED BEHAVIOR: Item should toggle locked state
    expect(finalLocked).toBe(!initialLocked);
  });
});
