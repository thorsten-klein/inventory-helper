const { test, expect } = require('@playwright/test');
const { setupEditor } = require('./helpers');

/**
 * Test for single tap opening modal bug on the reorder screen.
 * Reproduces bug where a single tap opens the edit modal instead of just selecting.
 *
 * Bug: Tapping on an item opens the modal.
 * Expected: Single tap should only select the item. Double tap should open modal.
 * Actual: Single tap opens the modal.
 */

// Use mobile device configuration
test.use({
  viewport: { width: 390, height: 844 }, // iPhone 13 size
  isMobile: true,
  hasTouch: true,
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
});

test.describe('Editor Screen - Single Tap Modal Bug', () => {
  test.beforeEach(async ({ page, context }) => {
    await setupEditor(page, context);
  });

  test('should NOT open modal on single tap - should only select', async ({ page }) => {
    // Wait for items to load
    await page.waitForSelector('.item-card', { timeout: 10000 });

    const firstCard = page.locator('.item-card:not(.removed)').first();
    const editModal = page.locator('#edit-modal');

    // Verify modal is not open initially
    const initiallyHidden = await editModal.evaluate(el => el.classList.contains('hidden'));
    expect(initiallyHidden).toBe(true);

    // Verify item is not selected initially
    const initiallySelected = await firstCard.evaluate(el => el.classList.contains('selected'));
    expect(initiallySelected).toBe(false);

    // Get card position
    const cardBox = await firstCard.boundingBox();
    if (!cardBox) {
      throw new Error('Could not get card bounding box');
    }

    const tapX = cardBox.x + cardBox.width / 2;
    const tapY = cardBox.y + cardBox.height / 2;

    // Track click events
    await page.evaluate(() => {
      window.clickEventCount = 0;
      window.clickEventTimes = [];
    });

    // Simulate a single tap WITHOUT manually calling click
    // Let the browser handle the natural click event
    await page.evaluate((coords) => {
      const card = document.querySelector('.item-card:not(.removed)');

      // Add listener to track clicks
      card.addEventListener('click', () => {
        window.clickEventCount++;
        window.clickEventTimes.push(Date.now());
      }, { once: false });

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

        // DO NOT manually call card.click() here
        // The browser should naturally fire a click event after touchend
      }, 50);
    }, { tapX, tapY });

    // Wait for any events to process (increased from 500ms for stability)
    await page.waitForTimeout(800);

    // Check how many click events fired
    const clickCount = await page.evaluate(() => window.clickEventCount);
    console.log(`Click events fired: ${clickCount}`);

    // Should only have ONE click event (not two)
    // If we get 2 clicks from a single tap, that's the bug
    expect(clickCount).toBeLessThanOrEqual(1);

    // Verify item IS selected
    const isSelected = await firstCard.evaluate(el => el.classList.contains('selected'));
    expect(isSelected).toBe(true);

    // Verify modal is NOT open (single tap should not open modal)
    const modalHidden = await editModal.evaluate(el => el.classList.contains('hidden'));
    expect(modalHidden).toBe(true);
  });

  test('should open modal ONLY on double tap, not single tap', async ({ page }) => {
    // Wait for items to load
    await page.waitForSelector('.item-card', { timeout: 10000 });

    const firstCard = page.locator('.item-card:not(.removed)').first();
    const editModal = page.locator('#edit-modal');

    const cardBox = await firstCard.boundingBox();
    if (!cardBox) {
      throw new Error('Could not get card bounding box');
    }

    const tapX = cardBox.x + cardBox.width / 2;
    const tapY = cardBox.y + cardBox.height / 2;

    // Helper function to simulate a tap
    const simulateTap = async () => {
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

          setTimeout(() => {
            card.click();
          }, 50);
        }, 100);
      }, { tapX, tapY });

      await page.waitForTimeout(250);
    };

    // First tap - should only select
    await simulateTap();
    // Reduced wait to keep second tap well within 400ms window
    await page.waitForTimeout(100);

    let isSelected = await firstCard.evaluate(el => el.classList.contains('selected'));
    expect(isSelected).toBe(true);

    let modalHidden = await editModal.evaluate(el => el.classList.contains('hidden'));
    expect(modalHidden).toBe(true); // Modal should still be hidden after first tap

    // Second tap (within double-tap window) - should open modal
    // Start second tap quickly to stay within 400ms threshold
    await simulateTap();
    await page.waitForTimeout(500);

    modalHidden = await editModal.evaluate(el => el.classList.contains('hidden'));
    expect(modalHidden).toBe(false); // Modal should now be open
  });

  test('should not open modal if taps are too far apart', async ({ page }) => {
    // Wait for items to load
    await page.waitForSelector('.item-card', { timeout: 10000 });

    const firstCard = page.locator('.item-card:not(.removed)').first();
    const editModal = page.locator('#edit-modal');

    const cardBox = await firstCard.boundingBox();
    if (!cardBox) {
      throw new Error('Could not get card bounding box');
    }

    const tapX = cardBox.x + cardBox.width / 2;
    const tapY = cardBox.y + cardBox.height / 2;

    const simulateTap = async () => {
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

          setTimeout(() => {
            card.click();
          }, 50);
        }, 100);
      }, { tapX, tapY });

      await page.waitForTimeout(250);
    };

    // First tap
    await simulateTap();
    // Wait for tap to complete fully
    await page.waitForTimeout(300);

    // Wait much longer than double-tap threshold (600ms >> 400ms threshold)
    // This ensures we're well past the 400ms window
    await page.waitForTimeout(600);

    // Second tap (too late for double-tap)
    await simulateTap();
    await page.waitForTimeout(300);

    // Modal should NOT be open (taps were too far apart)
    const modalHidden = await editModal.evaluate(el => el.classList.contains('hidden'));
    expect(modalHidden).toBe(true);

    // Item should stay selected (tapping selected item keeps it selected)
    // Re-query the card since renderItemsList recreates cards
    const isSelected = await page.locator('.item-card:not(.removed)').first().evaluate(el => el.classList.contains('selected'));
    expect(isSelected).toBe(true);
  });

  test('should only open modal on double-tap of selected item', async ({ page }) => {
    // Wait for items to load
    await page.waitForSelector('.item-card', { timeout: 10000 });

    const firstCard = page.locator('.item-card:not(.removed)').first();
    const secondCard = page.locator('.item-card:not(.removed)').nth(1);
    const editModal = page.locator('#edit-modal');

    // Helper to tap a card
    const tapCard = async (card) => {
      const cardBox = await card.boundingBox();
      if (!cardBox) throw new Error('Could not get card bounding box');

      const tapX = cardBox.x + cardBox.width / 2;
      const tapY = cardBox.y + cardBox.height / 2;

      await page.evaluate((coords) => {
        const elements = document.elementsFromPoint(coords.tapX, coords.tapY);
        const card = elements.find(el => el.classList.contains('item-card'));

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

          setTimeout(() => {
            card.click();
          }, 50);
        }, 100);
      }, { tapX, tapY });

      await page.waitForTimeout(250);
    };

    // Tap first card to select it
    await tapCard(firstCard);
    // Wait for selection to process
    await page.waitForTimeout(100);

    // Tap second card (switches selection, should NOT open modal)
    // This should NOT trigger double-tap because it's a different item
    await tapCard(secondCard);
    await page.waitForTimeout(300);

    // Modal should NOT be open
    let modalHidden = await editModal.evaluate(el => el.classList.contains('hidden'));
    expect(modalHidden).toBe(true);

    // Second card should be selected
    const secondSelected = await secondCard.evaluate(el => el.classList.contains('selected'));
    expect(secondSelected).toBe(true);
  });

  test('should NOT fire multiple click events from single tap', async ({ page }) => {
    // Wait for items to load
    await page.waitForSelector('.item-card', { timeout: 10000 });

    const firstCard = page.locator('.item-card:not(.removed)').first();
    const editModal = page.locator('#edit-modal');

    const cardBox = await firstCard.boundingBox();
    if (!cardBox) {
      throw new Error('Could not get card bounding box');
    }

    const tapX = cardBox.x + cardBox.width / 2;
    const tapY = cardBox.y + cardBox.height / 2;

    // Track all click events with timestamps
    const clickEvents = await page.evaluate((coords) => {
      return new Promise((resolve) => {
        const card = document.querySelector('.item-card:not(.removed)');
        const events = [];
        let clickHandler;

        clickHandler = (e) => {
          events.push({
            timestamp: Date.now(),
            target: e.target.className
          });
        };

        // Capture all clicks for 600ms
        card.addEventListener('click', clickHandler);

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

          // Wait to collect all click events
          setTimeout(() => {
            card.removeEventListener('click', clickHandler);
            resolve(events);
          }, 500);
        }, 50);
      });
    }, { tapX, tapY });

    console.log('Click events captured:', clickEvents);

    // A single tap should produce at most 1 click event
    // If we get 2+ click events, that's causing the double-tap to trigger
    expect(clickEvents.length).toBeLessThanOrEqual(1);

    // If there were 2 clicks, check the timing
    if (clickEvents.length === 2) {
      const timeDiff = clickEvents[1].timestamp - clickEvents[0].timestamp;
      console.log(`Time between clicks: ${timeDiff}ms`);
      // If they're within 300ms, they'd trigger double-tap behavior
      if (timeDiff < 300) {
        throw new Error(`Two clicks fired within ${timeDiff}ms from single tap - this causes modal to open!`);
      }
    }

    // Modal should NOT be open
    const modalHidden = await editModal.evaluate(el => el.classList.contains('hidden'));
    expect(modalHidden).toBe(true);
  });

  test('should work with mouse clicks (not just touch)', async ({ page }) => {
    // Wait for items to load
    await page.waitForSelector('.item-card', { timeout: 10000 });

    const firstCard = page.locator('.item-card:not(.removed)').first();
    const editModal = page.locator('#edit-modal');

    // Single click - should only select
    await firstCard.click();
    await page.waitForTimeout(100);

    let isSelected = await firstCard.evaluate(el => el.classList.contains('selected'));
    expect(isSelected).toBe(true);

    let modalHidden = await editModal.evaluate(el => el.classList.contains('hidden'));
    expect(modalHidden).toBe(true);

    // Double click - should open modal
    await firstCard.dblclick();
    await page.waitForTimeout(200);

    modalHidden = await editModal.evaluate(el => el.classList.contains('hidden'));
    expect(modalHidden).toBe(false);
  });
});
