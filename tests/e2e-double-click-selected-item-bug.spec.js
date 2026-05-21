const { test, expect } = require('@playwright/test');
const { setupEditor } = require('./helpers');

/**
 * Test for double-click on already selected item bug.
 * Reproduces bug where double-clicking an already selected item doesn't open modal.
 *
 * Bug: When double-clicking on an already selected item, the modal does not open.
 * Expected: Double-clicking a selected item should open the edit modal.
 * Actual: Modal doesn't open.
 */

// Use mobile device configuration
test.use({
  viewport: { width: 390, height: 844 }, // iPhone 13 size
  isMobile: true,
  hasTouch: true,
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
});

test.describe('Editor Screen - Double Click Selected Item Bug', () => {
  test.beforeEach(async ({ page, context }) => {
    await setupEditor(page, context);
  });

  test('DETAILED: should fire click from touch and open modal on double-tap selected item', async ({ page }) => {
    // Wait for items to load
    await page.waitForSelector('.item-card', { timeout: 10000 });

    const firstCard = page.locator('.item-card:not(.removed)').first();
    const editModal = page.locator('#edit-modal');

    const cardBox = await firstCard.boundingBox();
    if (!cardBox) throw new Error('Could not get card bounding box');

    const tapX = cardBox.x + cardBox.width / 2;
    const tapY = cardBox.y + cardBox.height / 2;

    // Helper to perform a tap and track events
    const performTapAndTrack = async (tapNumber) => {
      const result = await page.evaluate(({ coords, num }) => {
        return new Promise((resolve) => {
          const card = document.querySelector('.item-card:not(.removed)');
          const log = { clicksFired: 0, selectedAfter: false, modalOpen: false };

          const clickListener = () => {
            log.clicksFired++;
          };

          card.addEventListener('click', clickListener, { once: false });

          const touch = new Touch({
            identifier: 1,
            target: card,
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
            card.dispatchEvent(new TouchEvent('touchend', {
              touches: [],
              changedTouches: [touch],
              bubbles: true,
              cancelable: true,
            }));

            // Wait for click to fire and state to update
            setTimeout(() => {
              card.removeEventListener('click', clickListener);
              // Re-query the card since renderItemsList recreates all cards
              const updatedCard = document.querySelector('.item-card:not(.removed)');
              log.selectedAfter = updatedCard ? updatedCard.classList.contains('selected') : false;
              log.modalOpen = !document.getElementById('edit-modal').classList.contains('hidden');
              resolve(log);
            }, 150);
          }, 50);
        });
      }, { coords: { tapX, tapY }, num: tapNumber });

      console.log(`Tap ${tapNumber} result:`, result);
      return result;
    };

    // First tap - should select the item
    const tap1 = await performTapAndTrack(1);
    expect(tap1.clicksFired).toBeGreaterThanOrEqual(1); // At least one click should fire
    expect(tap1.selectedAfter).toBe(true); // Item should be selected
    expect(tap1.modalOpen).toBe(false); // Modal should NOT be open

    await page.waitForTimeout(100);

    // Second tap - should keep selected (not deselect)
    const tap2 = await performTapAndTrack(2);
    expect(tap2.clicksFired).toBeGreaterThanOrEqual(1); // Click should fire
    expect(tap2.selectedAfter).toBe(true); // Item should still be selected
    expect(tap2.modalOpen).toBe(true); // Modal SHOULD be open now

    // Final verification
    const modalVisible = await editModal.evaluate(el => !el.classList.contains('hidden'));
    expect(modalVisible).toBe(true);
  });

  test('should track click events from touch', async ({ page }) => {
    // Wait for items to load
    await page.waitForSelector('.item-card', { timeout: 10000 });

    const firstCard = page.locator('.item-card:not(.removed)').first();

    // Track click events
    const events = await page.evaluate(() => {
      return new Promise((resolve) => {
        const card = document.querySelector('.item-card:not(.removed)');
        const eventLog = [];

        const clickListener = (e) => {
          eventLog.push({ type: 'click', time: Date.now() });
        };

        card.addEventListener('click', clickListener);

        // Simulate touch
        const touch = new Touch({
          identifier: 1,
          target: card,
          clientX: 100,
          clientY: 100,
          screenX: 100,
          screenY: 100,
        });

        card.dispatchEvent(new TouchEvent('touchstart', {
          touches: [touch],
          changedTouches: [touch],
          bubbles: true,
          cancelable: true,
        }));

        setTimeout(() => {
          card.dispatchEvent(new TouchEvent('touchend', {
            touches: [],
            changedTouches: [touch],
            bubbles: true,
            cancelable: true,
          }));

          // Wait to see if click fires
          setTimeout(() => {
            card.removeEventListener('click', clickListener);
            resolve(eventLog);
          }, 300);
        }, 50);
      });
    });

    console.log('Events from touch:', events);

    // Check if click event fired
    if (events.length === 0) {
      throw new Error('No click event fired from touchstart/touchend - this is the bug!');
    }
  });

  test('should open modal when double-tapping already selected item', async ({ page }) => {
    // Wait for items to load
    await page.waitForSelector('.item-card', { timeout: 10000 });

    const firstCard = page.locator('.item-card:not(.removed)').first();
    const editModal = page.locator('#edit-modal');

    // Helper to simulate a tap
    const simulateTap = async () => {
      const cardBox = await firstCard.boundingBox();
      if (!cardBox) throw new Error('Could not get card bounding box');

      const tapX = cardBox.x + cardBox.width / 2;
      const tapY = cardBox.y + cardBox.height / 2;

      await page.evaluate((coords) => {
        const card = document.querySelector('.item-card:not(.removed)');

        const touch = new Touch({
          identifier: 1,
          target: card,
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
            target: card,
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
        }, 50);
      }, { tapX, tapY });

      await page.waitForTimeout(100);
    };

    // Step 1: Select the item with first tap
    await simulateTap();
    await page.waitForTimeout(100);

    // Verify item is selected
    let isSelected = await firstCard.evaluate(el => el.classList.contains('selected'));
    expect(isSelected).toBe(true);

    // Verify modal is NOT open yet
    let modalHidden = await editModal.evaluate(el => el.classList.contains('hidden'));
    expect(modalHidden).toBe(true);

    // Step 2: Double-tap the already selected item
    await simulateTap();
    await page.waitForTimeout(100);
    await simulateTap();
    await page.waitForTimeout(200);

    // Verify modal IS now open
    modalHidden = await editModal.evaluate(el => el.classList.contains('hidden'));
    expect(modalHidden).toBe(false);
  });

  test('should open modal when double-clicking already selected item with mouse', async ({ page }) => {
    // Wait for items to load
    await page.waitForSelector('.item-card', { timeout: 10000 });

    const firstCard = page.locator('.item-card:not(.removed)').first();
    const editModal = page.locator('#edit-modal');

    // Step 1: Select with single click
    await firstCard.click();
    await page.waitForTimeout(100);

    // Verify selected
    let isSelected = await firstCard.evaluate(el => el.classList.contains('selected'));
    expect(isSelected).toBe(true);

    // Step 2: Double-click the selected item
    await firstCard.dblclick();
    await page.waitForTimeout(200);

    // Verify modal opened
    const modalHidden = await editModal.evaluate(el => el.classList.contains('hidden'));
    expect(modalHidden).toBe(false);
  });

  test('should open modal on two quick taps of selected item', async ({ page }) => {
    // Wait for items to load
    await page.waitForSelector('.item-card', { timeout: 10000 });

    const firstCard = page.locator('.item-card:not(.removed)').first();
    const editModal = page.locator('#edit-modal');

    const cardBox = await firstCard.boundingBox();
    if (!cardBox) throw new Error('Could not get card bounding box');

    const tapX = cardBox.x + cardBox.width / 2;
    const tapY = cardBox.y + cardBox.height / 2;

    // First tap to select
    await page.evaluate((coords) => {
      const card = document.querySelector('.item-card:not(.removed)');

      const touch = new Touch({
        identifier: 1,
        target: card,
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
        card.dispatchEvent(new TouchEvent('touchend', {
          touches: [],
          changedTouches: [touch],
          bubbles: true,
          cancelable: true,
        }));
      }, 50);
    }, { tapX, tapY });

    await page.waitForTimeout(150);

    // Verify selected
    let isSelected = await firstCard.evaluate(el => el.classList.contains('selected'));
    expect(isSelected).toBe(true);

    // Now do two quick taps (within 300ms each)
    await page.evaluate((coords) => {
      const card = document.querySelector('.item-card.selected');

      const performTap = (delay) => {
        setTimeout(() => {
          const touch = new Touch({
            identifier: 1,
            target: card,
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
            card.dispatchEvent(new TouchEvent('touchend', {
              touches: [],
              changedTouches: [touch],
              bubbles: true,
              cancelable: true,
            }));
          }, 50);
        }, delay);
      };

      performTap(0);      // First tap
      performTap(150);    // Second tap 150ms later (within 300ms window)
    }, { tapX, tapY });

    await page.waitForTimeout(500);

    // Modal should be open
    const modalHidden = await editModal.evaluate(el => el.classList.contains('hidden'));
    expect(modalHidden).toBe(false);
  });

  test('should handle sequence: select, wait, then double-tap to open modal', async ({ page }) => {
    // Wait for items to load
    await page.waitForSelector('.item-card', { timeout: 10000 });

    const firstCard = page.locator('.item-card:not(.removed)').first();
    const editModal = page.locator('#edit-modal');

    // Select with single tap
    await firstCard.click();
    await page.waitForTimeout(100);

    // Verify selected
    let isSelected = await firstCard.evaluate(el => el.classList.contains('selected'));
    expect(isSelected).toBe(true);

    // Wait longer than double-tap window (400ms)
    await page.waitForTimeout(400);

    // Now double-tap the selected item
    const cardBox = await firstCard.boundingBox();
    if (!cardBox) throw new Error('Could not get card bounding box');

    const tapX = cardBox.x + cardBox.width / 2;
    const tapY = cardBox.y + cardBox.height / 2;

    // Two taps in quick succession
    for (let i = 0; i < 2; i++) {
      await page.evaluate((coords) => {
        const card = document.querySelector('.item-card.selected');

        const touch = new Touch({
          identifier: 1,
          target: card,
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
          card.dispatchEvent(new TouchEvent('touchend', {
            touches: [],
            changedTouches: [touch],
            bubbles: true,
            cancelable: true,
          }));
        }, 50);
      }, { tapX, tapY });

      await page.waitForTimeout(120); // 120ms between taps
    }

    await page.waitForTimeout(200);

    // Modal should be open
    const modalHidden = await editModal.evaluate(el => el.classList.contains('hidden'));
    expect(modalHidden).toBe(false);
  });

  test('should open modal on double-tap when doubleTapState was reset to null', async ({ page }) => {
    // Regression: doubleTapState.lastTapItemId is null after a double-tap opens the modal
    // (it's also null on first interaction). Tapping the still-selected item was incorrectly
    // treated as "clicking a different item" (!sameItem branch), which called deselectItem()
    // on the first tap. The second tap then re-selected it. The modal never opened.
    await page.waitForSelector('.item-card', { timeout: 10000 });

    const firstCard = page.locator('.item-card:not(.removed)').first();
    const editModal = page.locator('#edit-modal');

    // Select item
    await firstCard.click();
    await expect(firstCard).toHaveClass(/selected/);

    // Simulate the state left behind after a previous double-tap opened the modal
    await page.evaluate(() => {
      doubleTapState.lastTapItemId = null;
      doubleTapState.lastTapTime = 0;
    });

    // Wait past the 100ms click-deduplication window so the next click is not ignored
    await page.waitForTimeout(150);

    // First tap: with the bug, this deselects the item (!sameItem + isCurrentlySelected).
    // With the fix, it keeps the item selected and records tap time.
    await firstCard.click();

    // Wait long enough to escape deduplication (>100ms) but stay inside the
    // 400ms double-tap window so the second tap registers as a double-tap.
    await page.waitForTimeout(150);

    // Second tap: should trigger double-tap detection and open the modal
    await firstCard.click();
    await page.waitForTimeout(200);

    await expect(editModal).not.toHaveClass(/hidden/);
  });

  test('should track double-tap state across re-renders', async ({ page }) => {
    // Wait for items to load
    await page.waitForSelector('.item-card', { timeout: 10000 });

    const firstCard = page.locator('.item-card:not(.removed)').first();
    const editModal = page.locator('#edit-modal');

    // Get the item ID to verify state persistence
    const itemId = await firstCard.evaluate(el => el.dataset.itemId);

    const cardBox = await firstCard.boundingBox();
    if (!cardBox) throw new Error('Could not get card bounding box');

    const tapX = cardBox.x + cardBox.width / 2;
    const tapY = cardBox.y + cardBox.height / 2;

    // First tap - will select and trigger re-render
    await page.evaluate((coords) => {
      const card = document.querySelector('.item-card:not(.removed)');

      const touch = new Touch({
        identifier: 1,
        target: card,
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
        card.dispatchEvent(new TouchEvent('touchend', {
          touches: [],
          changedTouches: [touch],
          bubbles: true,
          cancelable: true,
        }));
      }, 50);
    }, { tapX, tapY });

    // Wait for re-render to complete
    await page.waitForTimeout(200);

    // Verify item is still there and selected
    const selectedCard = page.locator('.item-card.selected');
    await expect(selectedCard).toBeVisible();
    const selectedItemId = await selectedCard.evaluate(el => el.dataset.itemId);
    expect(selectedItemId).toBe(itemId);

    // Second tap within double-tap window
    await page.evaluate((coords) => {
      const card = document.querySelector('.item-card.selected');

      const touch = new Touch({
        identifier: 1,
        target: card,
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
        card.dispatchEvent(new TouchEvent('touchend', {
          touches: [],
          changedTouches: [touch],
          bubbles: true,
          cancelable: true,
        }));
      }, 50);
    }, { tapX, tapY });

    await page.waitForTimeout(200);

    // Modal should be open
    const modalHidden = await editModal.evaluate(el => el.classList.contains('hidden'));
    expect(modalHidden).toBe(false);
  });
});
