const { test, expect } = require('@playwright/test');
const { setupEditor } = require('./helpers');

/**
 * Test for tapping different item opens modal bug.
 * Reproduces bug where tapping a different item opens modal instead of switching selection.
 *
 * Bug: When item A is selected and user taps item B, modal opens.
 * Expected: Tapping item B should only switch selection to item B.
 * Actual: Modal opens incorrectly.
 */

// Use mobile device configuration
test.use({
  viewport: { width: 390, height: 844 }, // iPhone 13 size
  isMobile: true,
  hasTouch: true,
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
});

test.describe('Editor Screen - Tap Different Item Bug', () => {
  test.beforeEach(async ({ page, context }) => {
    await setupEditor(page, context);
  });

  test('DETAILED: track all events when tapping different items', async ({ page }) => {
    // Wait for items to load
    await page.waitForSelector('.item-card', { timeout: 10000 });

    const itemCards = page.locator('.item-card:not(.removed)');
    const count = await itemCards.count();
    expect(count).toBeGreaterThanOrEqual(2);

    const firstCard = itemCards.first();
    const secondCard = itemCards.nth(1);

    // Get item IDs
    const firstItemId = await firstCard.evaluate(el => el.dataset.itemId);
    const secondItemId = await secondCard.evaluate(el => el.dataset.itemId);

    console.log('First item ID:', firstItemId);
    console.log('Second item ID:', secondItemId);

    // Helper to tap and track all events
    const tapAndTrack = async (card, itemId, tapNumber) => {
      const cardBox = await card.boundingBox();
      if (!cardBox) throw new Error('Could not get card bounding box');

      const tapX = cardBox.x + cardBox.width / 2;
      const tapY = cardBox.y + cardBox.height / 2;

      const events = await page.evaluate(({ coords, id, num }) => {
        return new Promise((resolve) => {
          const card = document.querySelector(`[data-item-id="${id}"]`);
          if (!card) {
            resolve({ error: 'Card not found' });
            return;
          }

          const eventLog = [];
          const startTime = Date.now();

          // Track all clicks on this card
          const clickListener = (e) => {
            eventLog.push({
              type: 'click',
              time: Date.now() - startTime,
              isTrusted: e.isTrusted,
              target: e.target.className
            });
          };

          card.addEventListener('click', clickListener);

          // Perform touch
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

            // Wait to collect all clicks
            setTimeout(() => {
              card.removeEventListener('click', clickListener);

              // Re-query the card since renderItemsList recreates all cards
              const updatedCard = document.querySelector(`[data-item-id="${id}"]`);

              // Get state after tap
              const state = {
                clickEvents: eventLog,
                itemSelected: updatedCard ? updatedCard.classList.contains('selected') : false,
                modalOpen: !document.getElementById('edit-modal').classList.contains('hidden'),
                doubleTapState: {
                  lastTapTime: window.doubleTapState?.lastTapTime || 0,
                  lastTapItemId: window.doubleTapState?.lastTapItemId || null,
                  timeSinceStart: Date.now() - startTime
                }
              };

              resolve(state);
            }, 200);
          }, 50);
        });
      }, { coords: { tapX, tapY }, id: itemId, num: tapNumber });

      console.log(`Tap ${tapNumber} on item ${itemId}:`, events);
      return events;
    };

    // Tap first item
    const tap1 = await tapAndTrack(firstCard, firstItemId, 1);
    expect(tap1.clickEvents.length).toBeGreaterThanOrEqual(1);
    expect(tap1.itemSelected).toBe(true);
    expect(tap1.modalOpen).toBe(false);

    await page.waitForTimeout(150);

    // Tap second item (DIFFERENT item)
    const tap2 = await tapAndTrack(secondCard, secondItemId, 2);
    console.log('Second tap click events:', tap2.clickEvents);
    console.log('Second tap state:', tap2.doubleTapState);

    expect(tap2.clickEvents.length).toBeGreaterThanOrEqual(1);

    // CRITICAL: Modal should NOT be open when tapping different item
    if (tap2.modalOpen) {
      throw new Error(`BUG REPRODUCED: Modal opened after tapping different item! Click events: ${JSON.stringify(tap2.clickEvents)}`);
    }
    expect(tap2.modalOpen).toBe(false);
    expect(tap2.itemSelected).toBe(true);
  });

  test('should NOT open modal when tapping different item - should switch selection', async ({ page }) => {
    // Wait for items to load
    await page.waitForSelector('.item-card', { timeout: 10000 });

    const itemCards = page.locator('.item-card:not(.removed)');
    const count = await itemCards.count();
    expect(count).toBeGreaterThanOrEqual(2);

    const firstCard = itemCards.first();
    const secondCard = itemCards.nth(1);
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
          card.dispatchEvent(new TouchEvent('touchend', {
            touches: [],
            changedTouches: [touch],
            bubbles: true,
            cancelable: true,
          }));
        }, 50);
      }, { tapX, tapY });

      await page.waitForTimeout(100);
    };

    // Step 1: Tap first card to select it
    await tapCard(firstCard);
    await page.waitForTimeout(100);

    // Verify first card is selected
    let firstSelected = await firstCard.evaluate(el => el.classList.contains('selected'));
    expect(firstSelected).toBe(true);

    // Verify modal is NOT open
    let modalHidden = await editModal.evaluate(el => el.classList.contains('hidden'));
    expect(modalHidden).toBe(true);

    // Step 2: Tap second card (different item)
    await tapCard(secondCard);
    await page.waitForTimeout(100);

    // Verify selection switched to second card
    firstSelected = await firstCard.evaluate(el => el.classList.contains('selected'));
    let secondSelected = await secondCard.evaluate(el => el.classList.contains('selected'));
    expect(firstSelected).toBe(false);
    expect(secondSelected).toBe(true);

    // Verify modal is STILL NOT open
    modalHidden = await editModal.evaluate(el => el.classList.contains('hidden'));
    expect(modalHidden).toBe(true);
  });

  test('should switch selection when clicking different items rapidly', async ({ page }) => {
    // Wait for items to load
    await page.waitForSelector('.item-card', { timeout: 10000 });

    const itemCards = page.locator('.item-card:not(.removed)');
    const count = await itemCards.count();
    expect(count).toBeGreaterThanOrEqual(3);

    const firstCard = itemCards.first();
    const secondCard = itemCards.nth(1);
    const thirdCard = itemCards.nth(2);
    const editModal = page.locator('#edit-modal');

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
          card.dispatchEvent(new TouchEvent('touchend', {
            touches: [],
            changedTouches: [touch],
            bubbles: true,
            cancelable: true,
          }));
        }, 50);
      }, { tapX, tapY });

      await page.waitForTimeout(80);
    };

    // Tap first card
    await tapCard(firstCard);
    await page.waitForTimeout(80);

    // Tap second card (within 300ms of first tap)
    await tapCard(secondCard);
    await page.waitForTimeout(80);

    // Modal should NOT open (different items were tapped)
    let modalHidden = await editModal.evaluate(el => el.classList.contains('hidden'));
    expect(modalHidden).toBe(true);

    // Second card should be selected
    let secondSelected = await secondCard.evaluate(el => el.classList.contains('selected'));
    expect(secondSelected).toBe(true);

    // Tap third card
    await tapCard(thirdCard);
    await page.waitForTimeout(80);

    // Modal should still NOT open
    modalHidden = await editModal.evaluate(el => el.classList.contains('hidden'));
    expect(modalHidden).toBe(true);

    // Third card should be selected
    let thirdSelected = await thirdCard.evaluate(el => el.classList.contains('selected'));
    expect(thirdSelected).toBe(true);
  });

  test('should track which item was tapped for double-tap detection', async ({ page }) => {
    // Wait for items to load
    await page.waitForSelector('.item-card', { timeout: 10000 });

    const itemCards = page.locator('.item-card:not(.removed)');
    const count = await itemCards.count();
    expect(count).toBeGreaterThanOrEqual(2);

    const firstCard = itemCards.first();
    const secondCard = itemCards.nth(1);
    const editModal = page.locator('#edit-modal');

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
          card.dispatchEvent(new TouchEvent('touchend', {
            touches: [],
            changedTouches: [touch],
            bubbles: true,
            cancelable: true,
          }));
        }, 50);
      }, { tapX, tapY });

      await page.waitForTimeout(100);
    };

    // Select first card
    await tapCard(firstCard);
    await page.waitForTimeout(100);

    // Get item IDs to verify tracking
    const firstItemId = await firstCard.evaluate(el => el.dataset.itemId);
    const secondItemId = await secondCard.evaluate(el => el.dataset.itemId);

    console.log('First item ID:', firstItemId);
    console.log('Second item ID:', secondItemId);

    // Check global state
    const stateAfterFirstTap = await page.evaluate(() => {
      return {
        lastTapTime: window.doubleTapState?.lastTapTime || 0,
        lastTapItemId: window.doubleTapState?.lastTapItemId || null
      };
    });

    console.log('State after first tap:', stateAfterFirstTap);

    // Tap second card (different item)
    await tapCard(secondCard);
    await page.waitForTimeout(100);

    // Check global state again
    const stateAfterSecondTap = await page.evaluate(() => {
      return {
        lastTapTime: window.doubleTapState?.lastTapTime || 0,
        lastTapItemId: window.doubleTapState?.lastTapItemId || null
      };
    });

    console.log('State after second tap:', stateAfterSecondTap);

    // Verify lastTapItemId changed to second item
    // (This helps us understand if the tracking is working correctly)

    // Modal should NOT be open
    const modalHidden = await editModal.evaluate(el => el.classList.contains('hidden'));
    expect(modalHidden).toBe(true);
  });

  test('COMPREHENSIVE: select, switch, double-tap sequence', async ({ page }) => {
    // This test covers the complete user flow that was buggy
    await page.waitForSelector('.item-card', { timeout: 10000 });

    const itemCards = page.locator('.item-card:not(.removed)');
    const firstCard = itemCards.first();
    const secondCard = itemCards.nth(1);
    const editModal = page.locator('#edit-modal');

    const tapCard = async (card, description) => {
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
          card.dispatchEvent(new TouchEvent('touchend', {
            touches: [],
            changedTouches: [touch],
            bubbles: true,
            cancelable: true,
          }));
        }, 50);
      }, { tapX, tapY });

      await page.waitForTimeout(120);
      console.log(`After ${description}:`);

      const state = await page.evaluate(() => {
        return {
          firstSelected: document.querySelector('.item-card:not(.removed)')?.classList.contains('selected'),
          secondSelected: document.querySelectorAll('.item-card:not(.removed)')[1]?.classList.contains('selected'),
          modalOpen: !document.getElementById('edit-modal').classList.contains('hidden')
        };
      });

      console.log('  State:', state);
      return state;
    };

    // Step 1: Tap Item A → should select it
    let state = await tapCard(firstCard, 'tap Item A');
    expect(state.firstSelected).toBe(true);
    expect(state.modalOpen).toBe(false);

    // Step 2: Tap Item B → should switch selection, NOT open modal
    state = await tapCard(secondCard, 'tap Item B (different)');
    expect(state.firstSelected).toBe(false);
    expect(state.secondSelected).toBe(true);
    expect(state.modalOpen).toBe(false); // CRITICAL: Modal should NOT open

    // Step 3: Tap Item B again → should open modal (double-tap on same item)
    state = await tapCard(secondCard, 'tap Item B again (double-tap)');
    expect(state.modalOpen).toBe(true); // Modal SHOULD open now
  });

  test('should only open modal on double-tap of SAME item', async ({ page }) => {
    // Wait for items to load
    await page.waitForSelector('.item-card', { timeout: 10000 });

    const itemCards = page.locator('.item-card:not(.removed)');
    const firstCard = itemCards.first();
    const secondCard = itemCards.nth(1);
    const editModal = page.locator('#edit-modal');

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
          card.dispatchEvent(new TouchEvent('touchend', {
            touches: [],
            changedTouches: [touch],
            bubbles: true,
            cancelable: true,
          }));
        }, 50);
      }, { tapX, tapY });

      await page.waitForTimeout(100);
    };

    // Scenario 1: Tap first, then second (different items) - should NOT open modal
    await tapCard(firstCard);
    await page.waitForTimeout(100);
    await tapCard(secondCard);
    await page.waitForTimeout(100);

    let modalHidden = await editModal.evaluate(el => el.classList.contains('hidden'));
    expect(modalHidden).toBe(true);

    // Wait a bit to reset
    await page.waitForTimeout(400);

    // Scenario 2: Tap second twice (same item) - SHOULD open modal
    await tapCard(secondCard);
    await page.waitForTimeout(150);
    await tapCard(secondCard);
    await page.waitForTimeout(200);

    modalHidden = await editModal.evaluate(el => el.classList.contains('hidden'));
    expect(modalHidden).toBe(false);
  });
});
