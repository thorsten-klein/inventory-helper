const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

test.describe('Swipe Wrong Item Bug', () => {
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

  test('BUG: swipe from first item to last item should NOT lock last item', async ({ page }) => {
    // Get first and last items
    const items = page.locator('.item-card');
    const itemCount = await items.count();

    // Need at least 2 items
    expect(itemCount).toBeGreaterThanOrEqual(2);

    // Get the first and last item cards
    const firstCard = items.first();
    const lastCard = items.last();

    // Get initial locked states
    const firstInitialLocked = await firstCard.evaluate(card => card.classList.contains('locked'));
    const lastInitialLocked = await lastCard.evaluate(card => card.classList.contains('locked'));

    // Get bounding boxes
    const firstBox = await firstCard.boundingBox();
    const lastBox = await lastCard.boundingBox();

    if (!firstBox || !lastBox) {
      throw new Error('Could not get item bounding boxes');
    }

    // Perform swipe: start on first item, end on last item (swipe right)
    await page.mouse.move(firstBox.x + 50, firstBox.y + firstBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(lastBox.x + lastBox.width - 50, lastBox.y + lastBox.height / 2, { steps: 10 });
    await page.mouse.up();

    // Wait for any state changes to complete
    await page.waitForTimeout(100);

    // Get final locked states
    const firstFinalLocked = await firstCard.evaluate(card => card.classList.contains('locked'));
    const lastFinalLocked = await lastCard.evaluate(card => card.classList.contains('locked'));

    // EXPECTED BEHAVIOR: Neither item should change (swipe should be cancelled)
    // The swipe started on first item but ended on last item, so it should be ignored
    expect(firstFinalLocked).toBe(firstInitialLocked);
    expect(lastFinalLocked).toBe(lastInitialLocked);
  });

  test('BUG: swipe from first item to second item should NOT lock second item', async ({ page }) => {
    // Get first two items
    const items = page.locator('.item-card');
    const itemCount = await items.count();

    // Need at least 2 items
    expect(itemCount).toBeGreaterThanOrEqual(2);

    // Get the first and second item cards
    const firstCard = items.nth(0);
    const secondCard = items.nth(1);

    // Get initial locked states
    const firstInitialLocked = await firstCard.evaluate(card => card.classList.contains('locked'));
    const secondInitialLocked = await secondCard.evaluate(card => card.classList.contains('locked'));

    // Get bounding boxes
    const firstBox = await firstCard.boundingBox();
    const secondBox = await secondCard.boundingBox();

    if (!firstBox || !secondBox) {
      throw new Error('Could not get item bounding boxes');
    }

    // Perform swipe: start on first item, end on second item (swipe right)
    await page.mouse.move(firstBox.x + 50, firstBox.y + firstBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(secondBox.x + secondBox.width - 50, secondBox.y + secondBox.height / 2, { steps: 10 });
    await page.mouse.up();

    // Wait for any state changes to complete
    await page.waitForTimeout(100);

    // Get final locked states
    const firstFinalLocked = await firstCard.evaluate(card => card.classList.contains('locked'));
    const secondFinalLocked = await secondCard.evaluate(card => card.classList.contains('locked'));

    // EXPECTED BEHAVIOR: Neither item should change (swipe should be cancelled)
    expect(firstFinalLocked).toBe(firstInitialLocked);
    expect(secondFinalLocked).toBe(secondInitialLocked);
  });

  test('CORRECT: swipe on same item should lock that item', async ({ page }) => {
    // Get first item
    const firstCard = page.locator('.item-card').first();

    // Get initial locked state
    const initialLocked = await firstCard.evaluate(card => card.classList.contains('locked'));

    // Get bounding box
    const box = await firstCard.boundingBox();

    if (!box) {
      throw new Error('Could not get item bounding box');
    }

    // Perform swipe: start and end on same item (swipe right within the item)
    await page.mouse.move(box.x + 50, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width - 50, box.y + box.height / 2, { steps: 10 });
    await page.mouse.up();

    // Wait for any state changes to complete
    await page.waitForTimeout(100);

    // Get final locked state
    const finalLocked = await firstCard.evaluate(card => card.classList.contains('locked'));

    // EXPECTED BEHAVIOR: Item should toggle locked state
    expect(finalLocked).toBe(!initialLocked);
  });
});
