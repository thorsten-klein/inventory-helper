const { test, expect } = require('@playwright/test');
const {
  setupApp,
  uploadExampleFile,
  navigateToCategory,
  navigateToEditor,
  navigateToReview,
} = require('./helpers');

test.describe('Jump to Item Modal - Tab Swipe', () => {
  test.beforeEach(async ({ page, context }) => {
    await setupApp(page, context);
    await uploadExampleFile(page);
    await navigateToCategory(page);
    await navigateToEditor(page, 0);

    // Click Start Review button
    await page.click('#btn-start-review');

    // Wait for review screen
    await page.waitForSelector('#review-screen:not(.hidden)', { timeout: 5000 });

    // Wait for location element to be visible
    await page.waitForSelector('#review-location.clickable', { timeout: 5000 });
  });

  test('should switch to next tab when swiping left', async ({ page }) => {
    // Open jump to item modal by clicking location
    await page.click('#review-location.clickable');

    // Wait for modal to be visible
    await page.waitForSelector('#jump-to-item-modal:not(.hidden)', { timeout: 5000 });

    // Get the tabs container
    const tabsContent = page.locator('#jump-tabs-content');

    // Get initial active tab index
    const initialActiveTab = await page.locator('.jump-tab.active').textContent();

    // Get all tabs
    const allTabs = await page.locator('.jump-tab').count();

    // If there's only one tab, we can't test swiping
    if (allTabs <= 1) {
      return;
    }

    // Get the bounding box of the tabs content
    const box = await tabsContent.boundingBox();

    // Perform swipe left (from right to left)
    await page.mouse.move(box.x + box.width - 50, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + 50, box.y + box.height / 2);
    await page.mouse.up();

    // Wait a bit for the tab to switch
    await page.waitForTimeout(300);

    // Get new active tab
    const newActiveTab = await page.locator('.jump-tab.active').textContent();

    // Should have switched to a different tab
    expect(newActiveTab).not.toBe(initialActiveTab);
  });

  test('should switch to previous tab when swiping right', async ({ page }) => {
    // Open jump to item modal
    await page.click('#review-location.clickable');

    // Wait for modal to be visible
    await page.waitForSelector('#jump-to-item-modal:not(.hidden)', { timeout: 5000 });

    // Get all tabs
    const allTabs = await page.locator('.jump-tab').count();

    // If there's only one tab, we can't test swiping
    if (allTabs <= 1) {
      return;
    }

    // First switch to the second tab (so we can swipe back)
    await page.click('.jump-tab:nth-child(2)');

    // Wait a bit
    await page.waitForTimeout(200);

    // Get current active tab
    const initialActiveTab = await page.locator('.jump-tab.active').textContent();

    // Get the tabs content
    const tabsContent = page.locator('#jump-tabs-content');
    const box = await tabsContent.boundingBox();

    // Perform swipe right (from left to right)
    await page.mouse.move(box.x + 50, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width - 50, box.y + box.height / 2);
    await page.mouse.up();

    // Wait a bit for the tab to switch
    await page.waitForTimeout(300);

    // Get new active tab
    const newActiveTab = await page.locator('.jump-tab.active').textContent();

    // Should have switched to a different tab
    expect(newActiveTab).not.toBe(initialActiveTab);
  });

  test('should not switch tabs when swiping vertically', async ({ page }) => {
    // Open jump to item modal
    await page.click('#review-location.clickable');

    // Wait for modal to be visible
    await page.waitForSelector('#jump-to-item-modal:not(.hidden)', { timeout: 5000 });

    // Get all tabs
    const allTabs = await page.locator('.jump-tab').count();

    // If there's only one tab, we can't test swiping
    if (allTabs <= 1) {
      return;
    }

    // Get current active tab
    const initialActiveTab = await page.locator('.jump-tab.active').textContent();

    // Get the tabs content
    const tabsContent = page.locator('#jump-tabs-content');
    const box = await tabsContent.boundingBox();

    // Perform vertical swipe (up)
    await page.mouse.move(box.x + box.width / 2, box.y + box.height - 50);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2, box.y + 50);
    await page.mouse.up();

    // Wait a bit
    await page.waitForTimeout(300);

    // Get new active tab
    const newActiveTab = await page.locator('.jump-tab.active').textContent();

    // Should NOT have switched tabs
    expect(newActiveTab).toBe(initialActiveTab);
  });

  test('should switch tabs with touch swipe', async ({ browser }) => {
    // Create a context with touch enabled
    const context = await browser.newContext({
      hasTouch: true,
      isMobile: true,
      viewport: { width: 375, height: 667 }
    });
    const page = await context.newPage();

    // Setup the app
    await setupApp(page, context);
    await uploadExampleFile(page);
    await navigateToCategory(page);
    await navigateToEditor(page, 0);

    // Click Start Review button
    await page.click('#btn-start-review');

    // Wait for review screen
    await page.waitForSelector('#review-screen:not(.hidden)', { timeout: 5000 });

    // Wait for location element to be visible
    await page.waitForSelector('#review-location.clickable', { timeout: 5000 });

    // Open jump to item modal
    await page.click('#review-location.clickable');

    // Wait for modal to be visible
    await page.waitForSelector('#jump-to-item-modal:not(.hidden)', { timeout: 5000 });

    // Get all tabs
    const allTabs = await page.locator('.jump-tab').count();

    // If there's only one tab, we can't test swiping
    if (allTabs <= 1) {
      return;
    }

    // Get current active tab
    const initialActiveTab = await page.locator('.jump-tab.active').textContent();

    // Get the tabs content
    const tabsContent = page.locator('#jump-tabs-content');
    const box = await tabsContent.boundingBox();

    // Perform touch swipe left (from right to left) using JavaScript
    await tabsContent.evaluate((element, { startXRel, endXRel, startYRel }) => {
      const startX = element.offsetLeft + startXRel;
      const endX = element.offsetLeft + endXRel;
      const startY = element.offsetTop + startYRel;
      const endY = startY;

      // Create and dispatch touchstart event
      const touch1 = new Touch({
        identifier: 1,
        target: element,
        clientX: startX,
        clientY: startY,
        screenX: startX,
        screenY: startY,
        pageX: startX,
        pageY: startY,
      });

      const touchStartEvent = new TouchEvent('touchstart', {
        bubbles: true,
        cancelable: true,
        touches: [touch1],
        changedTouches: [touch1],
      });
      element.dispatchEvent(touchStartEvent);

      // Create and dispatch touchend event
      const touch2 = new Touch({
        identifier: 1,
        target: element,
        clientX: endX,
        clientY: endY,
        screenX: endX,
        screenY: endY,
        pageX: endX,
        pageY: endY,
      });

      const touchEndEvent = new TouchEvent('touchend', {
        bubbles: true,
        cancelable: true,
        changedTouches: [touch2],
      });
      element.dispatchEvent(touchEndEvent);
    }, {
      startXRel: box.width - 50,
      endXRel: 50,
      startYRel: box.height / 2
    });

    // Wait a bit for the tab to switch
    await page.waitForTimeout(300);

    // Get new active tab
    const newActiveTab = await page.locator('.jump-tab.active').textContent();

    // Should have switched to a different tab
    expect(newActiveTab).not.toBe(initialActiveTab);

    // Cleanup
    await context.close();
  });
});
