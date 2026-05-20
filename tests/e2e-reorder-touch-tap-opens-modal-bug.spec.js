const { test, expect } = require('@playwright/test');
const { setupEditor } = require('./helpers');

/**
 * Regression test: single tap on reorder screen opens edit modal on mobile.
 *
 * Root cause: `touchend` handler calls `card.click()` manually, but the browser
 * also fires a synthetic click after touchend. Two clicks within 400ms trigger
 * the double-tap detection, which opens the modal.
 *
 * Expected: single tap → select only. Double tap → open modal.
 */

test.use({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  userAgent:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
});

test.describe('Reorder screen – touch tap bug', () => {
  test.beforeEach(async ({ page, context }) => {
    await setupEditor(page, context);
  });

  test('single tap selects item but does NOT open edit modal', async ({ page }) => {
    await page.waitForSelector('.item-card:not(.removed)', { timeout: 10000 });

    const firstCard = page.locator('.item-card:not(.removed)').first();
    const editModal = page.locator('#edit-modal');

    // Modal must be hidden before tap
    await expect(editModal).toHaveClass(/hidden/);

    // Single tap using Playwright's tap() – mirrors real phone behaviour:
    // touchstart → touchend → browser synthetic click all fire in sequence.
    await firstCard.tap();

    // Give event handlers time to settle
    await page.waitForTimeout(600);

    // Item must be selected
    await expect(firstCard).toHaveClass(/selected/);

    // Modal must STILL be hidden — single tap must not open it
    await expect(editModal).toHaveClass(/hidden/);
  });

  test('double tap opens edit modal on mobile', async ({ page }) => {
    await page.waitForSelector('.item-card:not(.removed)', { timeout: 10000 });

    const firstCard = page.locator('.item-card:not(.removed)').first();
    const editModal = page.locator('#edit-modal');

    // First tap – select
    await firstCard.tap();
    await page.waitForTimeout(100);

    // Second tap quickly – should open modal
    await firstCard.tap();
    await page.waitForTimeout(400);

    await expect(editModal).not.toHaveClass(/hidden/);
  });
});
