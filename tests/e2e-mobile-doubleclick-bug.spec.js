const { test, expect } = require('@playwright/test');
const { setupEditor, waitForModal } = require('./helpers');

/**
 * Test for mobile double-click bug on the reorder screen.
 * Reproduces bug where double-tapping an item on mobile does not open edit modal.
 *
 * Bug: Double-clicking/double-tapping an item in reorder screen does not work on phone.
 * Expected: Double-tapping an item should open the edit modal.
 * Actual: Edit modal does not open when double-tapped on mobile.
 */

// Use mobile device configuration
test.use({
  viewport: { width: 390, height: 844 }, // iPhone 13 size
  isMobile: true,
  hasTouch: true,
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
});

test.describe('Editor Screen - Mobile Double-Click Bug', () => {
  test.beforeEach(async ({ page, context }) => {
    await setupEditor(page, context);
  });

  test('should open edit modal when double-tapping item on mobile', async ({ page }) => {
    // Wait for items to load
    await page.waitForSelector('.item-card', { timeout: 10000 });

    const itemCards = page.locator('.item-card:not(.removed)');
    const count = await itemCards.count();
    expect(count).toBeGreaterThanOrEqual(1);

    // Get the first non-removed item
    const firstCard = itemCards.first();
    const itemContent = firstCard.locator('.item-left');
    await expect(itemContent).toBeVisible();

    const contentBox = await itemContent.boundingBox();
    if (!contentBox) {
      throw new Error('Could not get item content bounding box');
    }

    const tapX = contentBox.x + contentBox.width / 2;
    const tapY = contentBox.y + contentBox.height / 2;

    // Verify modal is not open initially
    const editModal = page.locator('#edit-modal');
    const initiallyHidden = await editModal.evaluate(el => el.classList.contains('hidden'));
    expect(initiallyHidden).toBe(true);

    // Simulate double-tap (two quick taps)
    await page.evaluate((coords) => {
      const itemContent = document.querySelector('.item-card:not(.removed) .item-left');
      const card = itemContent.closest('.item-card');

      // Helper to dispatch a single tap
      const dispatchTap = () => {
        const touch = new Touch({
          identifier: 1,
          target: itemContent,
          clientX: coords.tapX,
          clientY: coords.tapY,
          screenX: coords.tapX,
          screenY: coords.tapY,
        });

        card.dispatchEvent(new TouchEvent('touchstart', {
          touches: [touch],
          changedTouches: [touch],
          bubbles: true,
          cancelable: true,
        }));

        setTimeout(() => {
          const touchEnd = new Touch({
            identifier: 1,
            target: itemContent,
            clientX: coords.tapX,
            clientY: coords.tapY,
            screenX: coords.tapX,
            screenY: coords.tapY,
          });

          card.dispatchEvent(new TouchEvent('touchend', {
            touches: [],
            changedTouches: [touchEnd],
            bubbles: true,
            cancelable: true,
          }));

          // Trigger click after touchend
          setTimeout(() => {
            card.click();
          }, 10);
        }, 50);
      };

      // First tap
      dispatchTap();

      // Second tap (after short delay to simulate double-tap)
      setTimeout(() => {
        dispatchTap();
      }, 150);
    }, { tapX, tapY });

    // Wait for modal to open
    await page.waitForTimeout(500);

    // Verify edit modal is now open
    const modalVisible = await editModal.evaluate(el => !el.classList.contains('hidden'));
    expect(modalVisible).toBe(true);
  });

  test('should open edit modal with correct item data on double-tap', async ({ page }) => {
    // Wait for items to load
    await page.waitForSelector('.item-card', { timeout: 10000 });

    const firstCard = page.locator('.item-card:not(.removed)').first();

    // Get the EAN from the card
    const eanText = await firstCard.locator('.item-ean').textContent();
    // Extract just the EAN value (format is "EAN: 1234567890123")
    const eanValue = eanText.replace(/^EAN:\s*/, '').trim();

    // Double-tap the card
    const itemContent = firstCard.locator('.item-left');
    const contentBox = await itemContent.boundingBox();
    if (!contentBox) {
      throw new Error('Could not get item content bounding box');
    }

    const tapX = contentBox.x + contentBox.width / 2;
    const tapY = contentBox.y + contentBox.height / 2;

    await page.evaluate((coords) => {
      const itemContent = document.querySelector('.item-card:not(.removed) .item-left');
      const card = itemContent.closest('.item-card');

      const dispatchTap = () => {
        const touch = new Touch({
          identifier: 1,
          target: itemContent,
          clientX: coords.tapX,
          clientY: coords.tapY,
          screenX: coords.tapX,
          screenY: coords.tapY,
        });

        card.dispatchEvent(new TouchEvent('touchstart', {
          touches: [touch],
          changedTouches: [touch],
          bubbles: true,
          cancelable: true,
        }));

        setTimeout(() => {
          const touchEnd = new Touch({
            identifier: 1,
            target: itemContent,
            clientX: coords.tapX,
            clientY: coords.tapY,
            screenX: coords.tapX,
            screenY: coords.tapY,
          });

          card.dispatchEvent(new TouchEvent('touchend', {
            touches: [],
            changedTouches: [touchEnd],
            bubbles: true,
            cancelable: true,
          }));

          setTimeout(() => {
            card.click();
          }, 50);
        }, 100);
      };

      dispatchTap();
      setTimeout(() => dispatchTap(), 150);
    }, { tapX, tapY });

    // Wait for modal to open
    await page.waitForTimeout(500);

    // Verify modal shows correct item data
    const editModal = page.locator('#edit-modal');
    const modalVisible = await editModal.evaluate(el => !el.classList.contains('hidden'));
    expect(modalVisible).toBe(true);

    // Check that the EAN input has the correct value
    const eanInput = page.locator('#edit-ean');
    const eanInputValue = await eanInput.inputValue();
    expect(eanInputValue).toBe(eanValue);
  });

  test('should differentiate between single tap and double tap on mobile', async ({ page }) => {
    // Wait for items to load
    await page.waitForSelector('.item-card', { timeout: 10000 });

    const firstCard = page.locator('.item-card:not(.removed)').first();
    const itemContent = firstCard.locator('.item-left');
    const editModal = page.locator('#edit-modal');

    const contentBox = await itemContent.boundingBox();
    if (!contentBox) {
      throw new Error('Could not get item content bounding box');
    }

    const tapX = contentBox.x + contentBox.width / 2;
    const tapY = contentBox.y + contentBox.height / 2;

    // Single tap - should only select, not open modal
    await page.evaluate((coords) => {
      const itemContent = document.querySelector('.item-card:not(.removed) .item-left');
      const card = itemContent.closest('.item-card');

      const touch = new Touch({
        identifier: 1,
        target: itemContent,
        clientX: coords.tapX,
        clientY: coords.tapY,
        screenX: coords.tapX,
        screenY: coords.tapY,
      });

      card.dispatchEvent(new TouchEvent('touchstart', {
        touches: [touch],
        changedTouches: [touch],
        bubbles: true,
        cancelable: true,
      }));

      setTimeout(() => {
        const touchEnd = new Touch({
          identifier: 1,
          target: itemContent,
          clientX: coords.tapX,
          clientY: coords.tapY,
          screenX: coords.tapX,
          screenY: coords.tapY,
        });

        card.dispatchEvent(new TouchEvent('touchend', {
          touches: [],
          changedTouches: [touchEnd],
          bubbles: true,
          cancelable: true,
        }));

        setTimeout(() => {
          card.click();
        }, 10);
      }, 50);
    }, { tapX, tapY });

    // Wait for first tap to complete and verify modal did NOT open
    await page.waitForTimeout(300);
    let modalHidden = await editModal.evaluate(el => el.classList.contains('hidden'));
    expect(modalHidden).toBe(true);

    // Verify item is selected
    let isSelected = await firstCard.evaluate(el => el.classList.contains('selected'));
    expect(isSelected).toBe(true);

    // Now double-tap - should open modal
    // Dispatch both taps quickly to stay within 400ms threshold
    await page.evaluate((coords) => {
      const itemContent = document.querySelector('.item-card:not(.removed) .item-left');
      const card = itemContent.closest('.item-card');

      const dispatchTap = () => {
        const touch = new Touch({
          identifier: 1,
          target: itemContent,
          clientX: coords.tapX,
          clientY: coords.tapY,
          screenX: coords.tapX,
          screenY: coords.tapY,
        });

        card.dispatchEvent(new TouchEvent('touchstart', {
          touches: [touch],
          changedTouches: [touch],
          bubbles: true,
          cancelable: true,
        }));

        setTimeout(() => {
          const touchEnd = new Touch({
            identifier: 1,
            target: itemContent,
            clientX: coords.tapX,
            clientY: coords.tapY,
            screenX: coords.tapX,
            screenY: coords.tapY,
          });

          card.dispatchEvent(new TouchEvent('touchend', {
            touches: [],
            changedTouches: [touchEnd],
            bubbles: true,
            cancelable: true,
          }));

          setTimeout(() => {
            card.click();
          }, 50);
        }, 100);
      };

      dispatchTap();
      // Reduced from 150ms to 100ms to stay well within 400ms window
      setTimeout(() => dispatchTap(), 100);
    }, { tapX, tapY });

    // Wait and verify modal IS open
    await page.waitForTimeout(500);
    modalHidden = await editModal.evaluate(el => el.classList.contains('hidden'));
    expect(modalHidden).toBe(false);
  });
});
