const { test, expect } = require('@playwright/test');
const { setupEditor } = require('./helpers');

/**
 * Regression test: scrolling on the reorder screen causes a brief vibration
 * because the long-press timer fires even during a vertical scroll gesture.
 *
 * Root cause: touchmove only cancels the longPressTimer for clear horizontal
 * swipes (diffX > diffY && diffX > 50px). Vertical scroll movements leave the
 * 200 ms timer running, so it fires navigator.vibrate(50) while the user scrolls.
 *
 * Expected: navigator.vibrate must NOT be called when the user scrolls vertically.
 */

test.use({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  userAgent:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
});

test.describe('Reorder screen – scroll vibration bug', () => {
  test.beforeEach(async ({ page, context }) => {
    await setupEditor(page, context);
  });

  test('scrolling vertically does NOT trigger haptic vibration', async ({ page }) => {
    await page.waitForSelector('.item-card:not(.removed)', { timeout: 10000 });

    // Intercept navigator.vibrate so we can count calls
    await page.evaluate(() => {
      window._vibrateCallCount = 0;
      navigator.vibrate = () => { window._vibrateCallCount++; return true; };
    });

    const firstCard = page.locator('.item-card:not(.removed)').first();
    const box = await firstCard.boundingBox();
    const startX = box.x + box.width / 2;
    const startY = box.y + box.height / 2;

    // Simulate a vertical scroll gesture on an item card (NOT the drag handle).
    // Critically, touchend fires at 250 ms — AFTER the 200 ms long-press timer —
    // so the timer would vibrate before touchend could cancel it (bug).
    // With the fix, touchmove at 50 ms cancels the timer before it fires.
    await page.evaluate(({ x, y }) => {
      const card = document.querySelector('.item-card:not(.removed)');

      const mkTouch = (id, cx, cy) =>
        new Touch({ identifier: id, target: card, clientX: cx, clientY: cy, screenX: cx, screenY: cy });

      card.dispatchEvent(new TouchEvent('touchstart', {
        touches: [mkTouch(1, x, y)],
        changedTouches: [mkTouch(1, x, y)],
        bubbles: true, cancelable: true,
      }));

      // Move 60 px upward after 50 ms (clear vertical scroll, no horizontal drift).
      // longPressTimer is still running at this point.
      setTimeout(() => {
        card.dispatchEvent(new TouchEvent('touchmove', {
          touches: [mkTouch(1, x, y - 60)],
          changedTouches: [mkTouch(1, x, y - 60)],
          bubbles: true, cancelable: true,
        }));
      }, 50);

      // Lift finger at 250 ms — after the 200 ms timer would fire — to prove
      // that it's touchmove (not touchend) that must cancel the timer.
      setTimeout(() => {
        card.dispatchEvent(new TouchEvent('touchend', {
          touches: [],
          changedTouches: [mkTouch(1, x, y - 60)],
          bubbles: true, cancelable: true,
        }));
      }, 250);
    }, { x: startX, y: startY });

    // Wait longer than the 200 ms longPressTimer
    await page.waitForTimeout(400);

    const callCount = await page.evaluate(() => window._vibrateCallCount);
    expect(callCount, 'navigator.vibrate should NOT be called during a vertical scroll').toBe(0);
  });

  test('scrolling diagonally (more vertical than horizontal) does NOT vibrate', async ({ page }) => {
    await page.waitForSelector('.item-card:not(.removed)', { timeout: 10000 });

    await page.evaluate(() => {
      window._vibrateCallCount = 0;
      navigator.vibrate = () => { window._vibrateCallCount++; return true; };
    });

    const firstCard = page.locator('.item-card:not(.removed)').first();
    const box = await firstCard.boundingBox();
    const startX = box.x + box.width / 2;
    const startY = box.y + box.height / 2;

    // Diagonal scroll: 20 px right, 60 px up – mostly vertical
    await page.evaluate(({ x, y }) => {
      const card = document.querySelector('.item-card:not(.removed)');
      const mkTouch = (id, cx, cy) =>
        new Touch({ identifier: id, target: card, clientX: cx, clientY: cy, screenX: cx, screenY: cy });

      card.dispatchEvent(new TouchEvent('touchstart', {
        touches: [mkTouch(1, x, y)],
        changedTouches: [mkTouch(1, x, y)],
        bubbles: true, cancelable: true,
      }));

      setTimeout(() => {
        card.dispatchEvent(new TouchEvent('touchmove', {
          touches: [mkTouch(1, x + 20, y - 60)],
          changedTouches: [mkTouch(1, x + 20, y - 60)],
          bubbles: true, cancelable: true,
        }));
      }, 50);

      setTimeout(() => {
        card.dispatchEvent(new TouchEvent('touchend', {
          touches: [],
          changedTouches: [mkTouch(1, x + 20, y - 60)],
          bubbles: true, cancelable: true,
        }));
      }, 120);
    }, { x: startX, y: startY });

    await page.waitForTimeout(400);

    const callCount = await page.evaluate(() => window._vibrateCallCount);
    expect(callCount, 'navigator.vibrate should NOT be called during diagonal scroll').toBe(0);
  });

  test('long press on drag handle still vibrates (drag intent)', async ({ page }) => {
    await page.waitForSelector('.item-card:not(.removed)', { timeout: 10000 });

    await page.evaluate(() => {
      window._vibrateCallCount = 0;
      navigator.vibrate = () => { window._vibrateCallCount++; return true; };
    });

    // Touch the drag handle (which immediately sets longPressTriggered = true and vibrates)
    const dragHandle = page.locator('.item-card:not(.removed) .drag-handle').first();
    const box = await dragHandle.boundingBox();
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;

    await page.evaluate(({ x, y }) => {
      const handle = document.querySelector('.item-card:not(.removed) .drag-handle');
      const card = handle.closest('.item-card');
      const mkTouch = (id, cx, cy) =>
        new Touch({ identifier: id, target: handle, clientX: cx, clientY: cy, screenX: cx, screenY: cy });

      card.dispatchEvent(new TouchEvent('touchstart', {
        touches: [mkTouch(1, x, y)],
        changedTouches: [mkTouch(1, x, y)],
        bubbles: true, cancelable: true,
      }));
    }, { x, y });

    // Wait a bit (vibrate fires synchronously for drag handle)
    await page.waitForTimeout(100);

    const callCount = await page.evaluate(() => window._vibrateCallCount);
    expect(callCount, 'navigator.vibrate SHOULD be called when touching drag handle').toBe(1);
  });

  test('diagonal scroll with horizontal drift should NOT trigger swipe-to-lock', async ({ page }) => {
    // Regression: during a scroll gesture, a finger naturally drifts horizontally.
    // If that horizontal drift exceeds 50 px and is greater than vertical movement,
    // handleItemSwipe fires and locks the item — even though the user was scrolling.
    //
    // The fix: track verticalScrollDetected in touchmove. If vertical movement
    // dominates at any point during the gesture, skip swipe processing in touchend.
    await page.waitForSelector('.item-card:not(.removed)', { timeout: 10000 });

    const firstCard = page.locator('.item-card:not(.removed)').first();
    const initiallyLocked = await firstCard.evaluate(el => el.classList.contains('locked'));

    const box = await firstCard.boundingBox();
    const startX = box.x + box.width / 2;
    const startY = box.y + box.height / 2;

    // Simulate a scroll-with-drift gesture using two touchmove events:
    //   1st touchmove: 15 px down, 10 px right  → vertical dominates (scroll detected)
    //   2nd touchmove: 55 px down, 65 px right   → horizontal now leads in total delta,
    //                                               but vertical was dominant first
    // touchend: diffX=65 > 50 AND diffX=65 > diffY=55 → old code fires swipe; fixed code does not.
    await page.evaluate(({ x, y }) => {
      const card = document.querySelector('.item-card:not(.removed)');
      const mk = (cx, cy) =>
        new Touch({ identifier: 1, target: card, clientX: cx, clientY: cy, screenX: cx, screenY: cy });

      card.dispatchEvent(new TouchEvent('touchstart', {
        touches: [mk(x, y)], changedTouches: [mk(x, y)], bubbles: true, cancelable: true,
      }));

      // First move: mostly vertical – marks the gesture as a scroll
      setTimeout(() => {
        card.dispatchEvent(new TouchEvent('touchmove', {
          touches: [mk(x + 10, y + 15)], changedTouches: [mk(x + 10, y + 15)],
          bubbles: true, cancelable: true,
        }));
      }, 30);

      // Second move: more horizontal drift accumulated – but vertical was seen first
      setTimeout(() => {
        card.dispatchEvent(new TouchEvent('touchmove', {
          touches: [mk(x + 65, y + 55)], changedTouches: [mk(x + 65, y + 55)],
          bubbles: true, cancelable: true,
        }));
      }, 60);

      // Lift finger
      setTimeout(() => {
        card.dispatchEvent(new TouchEvent('touchend', {
          touches: [], changedTouches: [mk(x + 65, y + 55)], bubbles: true, cancelable: true,
        }));
      }, 120);
    }, { x: startX, y: startY });

    await page.waitForTimeout(400);

    const nowLocked = await firstCard.evaluate(el => el.classList.contains('locked'));
    expect(nowLocked, 'swipe-to-lock must NOT fire during a scroll gesture with horizontal drift').toBe(initiallyLocked);
  });
});
