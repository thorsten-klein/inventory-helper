const { test, expect } = require('@playwright/test');
const { setupEditor } = require('./helpers');

/**
 * Tests for the "Add Item" insertion position on the editor (reorder) screen.
 *
 * Expected behaviour: when an item is selected and the user adds a new item,
 * the new item is inserted BEFORE (above) the currently selected item, taking
 * its position and pushing the selected item one slot down.
 */
test.describe('Editor – Add Item insertion position', () => {
  test.beforeEach(async ({ page, context }) => {
    await setupEditor(page, context);
  });

  /**
   * Helper: open the add-item modal pre-filled from the selected item, fill in
   * a unique EAN, keep everything else (shelf / row / position) as defaulted,
   * and save.
   */
  async function addItemAtSelection(page, ean) {
    await page.click('#btn-add-item');
    await page.waitForSelector('#add-type-modal', { state: 'visible', timeout: 5000 });
    await page.click('#btn-add-item-type');
    await page.waitForSelector('#edit-modal', { state: 'visible', timeout: 5000 });

    // Fill in a valid EAN – keep position / shelf / row at the defaults
    await page.fill('#edit-ean', ean);
    await page.click('#btn-save-edit');
    await page.waitForSelector('#edit-modal', { state: 'hidden', timeout: 5000 });
  }

  test('new item is inserted BEFORE the selected item', async ({ page }) => {
    await page.waitForSelector('.item-card:not(.removed)', { timeout: 10000 });

    // Collect visible, non-removed item cards
    const activeCards = page.locator('.item-card:not(.removed)');
    const count = await activeCards.count();

    // Need at least two items so we can select a middle one
    expect(count).toBeGreaterThanOrEqual(2);

    // Select the second item (index 1) – gives us an item to land before/after
    const secondCard = activeCards.nth(1);
    await secondCard.click();
    await expect(secondCard).toHaveClass(/selected/);

    // Record the EAN of the currently-selected item so we can locate it after
    const selectedEan = await secondCard.evaluate(
      el => el.querySelector('.item-ean')?.textContent ?? ''
    );

    // Add a new item – the modal defaults to the selected item's shelf/row/position
    const newEan = '0000000000001';
    await addItemAtSelection(page, newEan);

    // --- Assertions ---
    // 1. The new item must exist in the DOM
    const newCard = page.locator('.item-card:not(.removed)').filter({ hasText: newEan });
    await expect(newCard).toBeVisible();

    // 2. The new item must appear BEFORE the old selected item in DOM order
    const allActive = page.locator('.item-card:not(.removed)');
    const newIndex = await allActive.evaluateAll(
      (cards, ean) => cards.findIndex(c => c.textContent.includes(ean)),
      newEan
    );
    const oldIndex = await allActive.evaluateAll(
      (cards, ean) => cards.findIndex(c => c.textContent.includes(ean)),
      selectedEan
    );

    expect(newIndex).toBeGreaterThanOrEqual(0);
    expect(oldIndex).toBeGreaterThanOrEqual(0);
    expect(newIndex).toBeLessThan(oldIndex);
  });

  test('new item gets the selected item\'s original position', async ({ page }) => {
    await page.waitForSelector('.item-card:not(.removed)', { timeout: 10000 });

    const activeCards = page.locator('.item-card:not(.removed)');
    expect(await activeCards.count()).toBeGreaterThanOrEqual(2);

    // Select the second item and record its position field value
    const secondCard = activeCards.nth(1);
    await secondCard.click();
    await expect(secondCard).toHaveClass(/selected/);

    const selectedPosText = await secondCard.evaluate(el => {
      const spans = el.querySelectorAll('.item-location span');
      for (const span of spans) {
        if (span.textContent.startsWith('Pos:') || span.innerHTML.includes('pos')) {
          return span.textContent;
        }
      }
      return el.textContent;
    });

    // Grab the actual position number from appState before adding
    const selectedItemPos = await page.evaluate(() => {
      const idx = appState.selectedItemIndex;
      return appState.items[idx]?.position ?? null;
    });
    expect(selectedItemPos).not.toBeNull();

    // Add the new item
    const newEan = '0000000000002';
    await addItemAtSelection(page, newEan);

    // The new item should have ended up at selectedItemPos
    const newItemPos = await page.evaluate(ean => {
      const item = appState.items.find(i => i.ean === ean);
      return item?.position ?? null;
    }, newEan);

    expect(newItemPos).toBe(selectedItemPos);
  });

  test('selected item is pushed one position down after add', async ({ page }) => {
    await page.waitForSelector('.item-card:not(.removed)', { timeout: 10000 });

    const activeCards = page.locator('.item-card:not(.removed)');
    expect(await activeCards.count()).toBeGreaterThanOrEqual(2);

    const secondCard = activeCards.nth(1);
    await secondCard.click();
    await expect(secondCard).toHaveClass(/selected/);

    // Record the selected item's id and original position
    const { selectedId, originalPos } = await page.evaluate(() => {
      const idx = appState.selectedItemIndex;
      const item = appState.items[idx];
      return { selectedId: item.id, originalPos: item.position };
    });

    const newEan = '0000000000003';
    await addItemAtSelection(page, newEan);

    // After inserting, the originally selected item should have position = originalPos + 1
    const newPosOfSelected = await page.evaluate(id => {
      const item = appState.items.find(i => i.id === id);
      return item?.position ?? null;
    }, selectedId);

    expect(newPosOfSelected).toBe(originalPos + 1);
  });

  test('without selection, new item is added (count increases)', async ({ page }) => {
    await page.waitForSelector('.item-card:not(.removed)', { timeout: 10000 });

    // Make sure nothing is selected
    await page.evaluate(() => { appState.selectedItemIndex = null; });

    const countBefore = await page.locator('.item-card:not(.removed)').count();

    await page.click('#btn-add-item');
    await page.waitForSelector('#add-type-modal', { state: 'visible', timeout: 5000 });
    await page.click('#btn-add-item-type');
    await page.waitForSelector('#edit-modal', { state: 'visible', timeout: 5000 });

    await page.fill('#edit-ean', '0000000000099');
    await page.click('#btn-save-edit');
    await page.waitForSelector('#edit-modal', { state: 'hidden', timeout: 5000 });

    const countAfter = await page.locator('.item-card:not(.removed)').count();
    expect(countAfter).toBe(countBefore + 1);

    // New item must exist somewhere in the list
    const newCard = page.locator('.item-card:not(.removed)').filter({ hasText: '0000000000099' });
    await expect(newCard).toBeVisible();
  });
});
