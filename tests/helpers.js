const { expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

/**
 * Test Helper Functions
 *
 * These helpers eliminate duplication across test files and provide
 * smart waiting strategies instead of arbitrary timeouts.
 */

// Common file paths
const EXAMPLE_FILE_PATH = path.join(__dirname, '..', 'example', 'example.xlsx');

/**
 * Setup app with clean state
 * Clears cookies and localStorage, navigates to home page
 */
async function setupApp(page, context) {
  if (context) {
    await context.clearCookies();
  }
  await page.goto('/', { waitUntil: 'load' });
  await page.evaluate(() => localStorage.clear());

  // Wait for XLSX library to load
  await page.waitForFunction(() => typeof XLSX !== 'undefined', { timeout: 10000 });
}

/**
 * Upload the example file
 * Returns true if successful
 */
async function uploadExampleFile(page) {
  // Verify example file exists
  expect(fs.existsSync(EXAMPLE_FILE_PATH)).toBeTruthy();

  // Upload file
  const fileInput = page.locator('#file-input');
  await fileInput.setInputFiles(EXAMPLE_FILE_PATH);

  // Wait for config section to appear (indicates file was processed)
  await page.waitForSelector('#config-section:not(.hidden)', { timeout: 5000 });

  return true;
}

/**
 * Navigate to category screen
 * Assumes file has been uploaded
 */
async function navigateToCategory(page) {
  // Click next button
  await page.click('#btn-next-category');

  // Wait for category screen to be visible and upload screen to be hidden
  await page.waitForSelector('#category-screen:not(.hidden)', { timeout: 5000 });
  await page.waitForFunction(
    () => document.querySelector('#upload-screen')?.classList.contains('hidden'),
    { timeout: 5000 }
  );

  // Wait for category select to be populated
  await page.waitForFunction(
    () => document.querySelector('#category-select').options.length > 1,
    { timeout: 5000 }
  );
}

/**
 * Select a category and navigate to editor
 * @param {number} categoryIndex - Index of category to select (0 = first real category, skips placeholder)
 */
async function navigateToEditor(page, categoryIndex = 0) {
  // Get all category options
  const categoryOptions = await page.locator('#category-select option').all();

  let realCategoryCount = 0;
  for (const option of categoryOptions) {
    const value = await option.getAttribute('value');
    const text = await option.textContent();

    // Skip placeholder options (empty value or contains dashes)
    if (value && value !== '' && !text.includes('--') && value !== '__NEW_CATEGORY__') {
      if (realCategoryCount === categoryIndex) {
        await page.selectOption('#category-select', value);
        break;
      }
      realCategoryCount++;
    }
  }

  // Click Start Editing
  await page.click('#btn-start-editing');

  // Wait for editor screen to be visible
  await waitForEditorScreen(page);
}

/**
 * Wait for editor screen to be fully loaded
 */
async function waitForEditorScreen(page) {
  // Wait for editor screen to be visible
  await page.waitForSelector('#editor-screen:not(.hidden)', { timeout: 5000 });

  // Wait for items list to be present
  await page.waitForSelector('#items-list', { timeout: 5000 });

  // Wait for at least one item to be rendered (if items exist)
  await page.waitForFunction(
    () => {
      const itemsList = document.querySelector('#items-list');
      return itemsList && (
        itemsList.children.length > 0 ||
        itemsList.textContent.includes('No items')
      );
    },
    { timeout: 5000 }
  );
}

/**
 * Complete setup: app → upload → category → editor
 * This is the most common test setup pattern
 */
async function setupEditor(page, context, categoryIndex = 0) {
  await setupApp(page, context);
  await uploadExampleFile(page);
  await navigateToCategory(page);
  await navigateToEditor(page, categoryIndex);
}

/**
 * Get the first non-locked, non-removed item from the editor
 */
async function getFirstNonLockedItem(page) {
  await page.waitForSelector('.item-card', { timeout: 5000 });

  const itemCards = await page.locator('.item-card').all();
  for (const card of itemCards) {
    const isLocked = await card.evaluate(el => el.classList.contains('locked'));
    const isRemoved = await card.evaluate(el => el.classList.contains('removed'));

    if (!isLocked && !isRemoved) {
      return card;
    }
  }

  return null;
}

/**
 * Wait for element to be visible
 * Replaces waitForTimeout for visibility checks
 */
async function waitForVisible(page, selector, timeout = 5000) {
  await page.waitForSelector(selector, { state: 'visible', timeout });
}

/**
 * Wait for element to be hidden
 */
async function waitForHidden(page, selector, timeout = 5000) {
  await page.waitForSelector(selector, { state: 'hidden', timeout });
}

/**
 * Wait for modal to open
 */
async function waitForModal(page, modalId, timeout = 5000) {
  const selector = `#${modalId}:not(.hidden)`;
  await page.waitForSelector(selector, { timeout });
}

/**
 * Wait for modal to close
 */
async function waitForModalClose(page, modalId, timeout = 5000) {
  const selector = `#${modalId}.hidden`;
  await page.waitForSelector(selector, { timeout });
}

/**
 * Navigate to review screen from editor
 */
async function navigateToReview(page) {
  // Click Start Review button
  await page.click('#btn-start-review');

  // Wait for review screen
  await page.waitForSelector('#review-screen:not(.hidden)', { timeout: 5000 });
  await page.waitForSelector('#editor-screen.hidden', { timeout: 5000 });

  // Wait for review data to load
  await page.waitForSelector('#review-ean', { timeout: 5000 });
}

/**
 * Click an item card by index
 */
async function clickItemCard(page, index) {
  const itemCards = await page.locator('.item-card').all();
  if (index < itemCards.length) {
    await itemCards[index].click();
    // Wait for selection to register
    await page.waitForFunction(
      (idx) => {
        const cards = document.querySelectorAll('.item-card');
        return cards[idx] && cards[idx].classList.contains('selected');
      },
      index,
      { timeout: 2000 }
    );
  }
}

/**
 * Get item count in editor
 */
async function getItemCount(page) {
  return await page.locator('.item-card').count();
}

/**
 * Wait for items list to update (after add/delete/reorder)
 */
async function waitForItemsUpdate(page, expectedCount = null) {
  if (expectedCount !== null) {
    await page.waitForFunction(
      (count) => document.querySelectorAll('.item-card').length === count,
      expectedCount,
      { timeout: 5000 }
    );
  } else {
    // Just wait for DOM to settle
    await page.waitForFunction(
      () => {
        const list = document.querySelector('#items-list');
        return list && list.children.length >= 0;
      },
      { timeout: 5000 }
    );
  }
}

module.exports = {
  // Constants
  EXAMPLE_FILE_PATH,

  // Setup functions
  setupApp,
  uploadExampleFile,
  navigateToCategory,
  navigateToEditor,
  setupEditor,

  // Wait helpers
  waitForEditorScreen,
  waitForVisible,
  waitForHidden,
  waitForModal,
  waitForModalClose,
  waitForItemsUpdate,

  // Navigation
  navigateToReview,

  // Item helpers
  getFirstNonLockedItem,
  clickItemCard,
  getItemCount,
};
