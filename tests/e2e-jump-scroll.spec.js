const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

test.describe('Jump Modal Scroll Robustness', () => {
  const exampleFilePath = path.join(__dirname, '..', 'example', 'example.xlsx');

  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
  });

  test('should not change tabs when scrolling vertically in jump modal', async ({ page }) => {
    // Skip if example file doesn't exist
    if (!fs.existsSync(exampleFilePath)) {
      test.skip();
      return;
    }

    // Upload file
    const fileInput = page.locator('#file-input');
    await fileInput.setInputFiles(exampleFilePath);
    await page.waitForTimeout(2000);

    // Navigate to category screen
    await page.click('#btn-next-category');
    await page.waitForTimeout(500);

    // Select first category
    const categoryOptions = await page.locator('#category-select option').count();
    if (categoryOptions > 0) {
      const firstOptionValue = await page.locator('#category-select option').first().getAttribute('value');
      if (firstOptionValue) {
        await page.selectOption('#category-select', firstOptionValue);
        await page.waitForTimeout(300);

        // Click Start Editing
        await page.click('#btn-start-editing');
        await page.waitForTimeout(1000);

        // Start review
        const startReviewBtn = page.locator('#btn-start-review');
        if (await startReviewBtn.isVisible()) {
          await startReviewBtn.click();
          await page.waitForTimeout(500);

          // Click on location to open jump modal
          const location = page.locator('#review-location');
          if (await location.isVisible()) {
            await location.click();
            await page.waitForTimeout(500);

            // Modal should be visible
            await expect(page.locator('#jump-to-item-modal')).not.toHaveClass(/hidden/);

            // Get the active tab index before scrolling
            const activeTabBefore = await page.locator('.jump-tab.active').textContent();

            // Get the tab content area
            const tabContent = page.locator('#jump-tabs-content');

            // Check if there's a scrollable table
            const tableExists = await tabContent.locator('table').count() > 0;
            if (tableExists) {
              // Simulate vertical scroll with slight horizontal drift (common in real touch usage)
              // This reproduces the issue where scrolling changes tabs
              await tabContent.evaluate((element) => {
                // Simulate touch scroll with slight horizontal movement
                const startX = 150;
                const startY = 100;
                const endX = 130; // 20px horizontal drift (less than swipe threshold of 50)
                const endY = 300; // 200px vertical movement

                const touchStart = new TouchEvent('touchstart', {
                  touches: [{ screenX: startX, screenY: startY, clientX: startX, clientY: startY }],
                  changedTouches: [{ screenX: startX, screenY: startY, clientX: startX, clientY: startY }]
                });

                const touchEnd = new TouchEvent('touchend', {
                  touches: [],
                  changedTouches: [{ screenX: endX, screenY: endY, clientX: endX, clientY: endY }]
                });

                element.dispatchEvent(touchStart);
                element.dispatchEvent(touchEnd);
              });

              await page.waitForTimeout(300);

              // The active tab should NOT have changed (vertical scroll should not switch tabs)
              const activeTabAfter = await page.locator('.jump-tab.active').textContent();
              expect(activeTabAfter).toBe(activeTabBefore);
            }
          }
        }
      }
    }
  });

  test('should not change tabs when scrolling with 45-degree diagonal movement', async ({ page }) => {
    // Skip if example file doesn't exist
    if (!fs.existsSync(exampleFilePath)) {
      test.skip();
      return;
    }

    // Upload and navigate
    const fileInput = page.locator('#file-input');
    await fileInput.setInputFiles(exampleFilePath);
    await page.waitForTimeout(2000);

    await page.click('#btn-next-category');
    await page.waitForTimeout(500);

    const categoryOptions = await page.locator('#category-select option').count();
    if (categoryOptions > 0) {
      const firstOptionValue = await page.locator('#category-select option').first().getAttribute('value');
      if (firstOptionValue) {
        await page.selectOption('#category-select', firstOptionValue);
        await page.waitForTimeout(300);

        await page.click('#btn-start-editing');
        await page.waitForTimeout(1000);

        const startReviewBtn = page.locator('#btn-start-review');
        if (await startReviewBtn.isVisible()) {
          await startReviewBtn.click();
          await page.waitForTimeout(500);

          const location = page.locator('#review-location');
          if (await location.isVisible()) {
            await location.click();
            await page.waitForTimeout(500);

            const activeTabBefore = await page.locator('.jump-tab.active').textContent();
            const tabContent = page.locator('#jump-tabs-content');

            // Simulate 45-degree diagonal scroll (equal horizontal and vertical)
            // This should NOT trigger tab change because horizontal is not dominant
            await tabContent.evaluate((element) => {
              const startX = 150;
              const startY = 100;
              const endX = 50; // 100px horizontal (exceeds threshold)
              const endY = 200; // 100px vertical (equal to horizontal)

              const touchStart = new TouchEvent('touchstart', {
                touches: [{ screenX: startX, screenY: startY, clientX: startX, clientY: startY }],
                changedTouches: [{ screenX: startX, screenY: startY, clientX: startX, clientY: startY }]
              });

              const touchEnd = new TouchEvent('touchend', {
                touches: [],
                changedTouches: [{ screenX: endX, screenY: endY, clientX: endX, clientY: endY }]
              });

              element.dispatchEvent(touchStart);
              element.dispatchEvent(touchEnd);
            });

            await page.waitForTimeout(300);

            // Tab should NOT change with diagonal movement
            const activeTabAfter = await page.locator('.jump-tab.active').textContent();
            expect(activeTabAfter).toBe(activeTabBefore);
          }
        }
      }
    }
  });

  test('should change tabs when swiping horizontally in jump modal', async ({ page }) => {
    // Skip if example file doesn't exist
    if (!fs.existsSync(exampleFilePath)) {
      test.skip();
      return;
    }

    // Upload file and navigate to review screen with jump modal
    const fileInput = page.locator('#file-input');
    await fileInput.setInputFiles(exampleFilePath);
    await page.waitForTimeout(2000);

    await page.click('#btn-next-category');
    await page.waitForTimeout(500);

    const categoryOptions = await page.locator('#category-select option').count();
    if (categoryOptions > 0) {
      const firstOptionValue = await page.locator('#category-select option').first().getAttribute('value');
      if (firstOptionValue) {
        await page.selectOption('#category-select', firstOptionValue);
        await page.waitForTimeout(300);

        await page.click('#btn-start-editing');
        await page.waitForTimeout(1000);

        const startReviewBtn = page.locator('#btn-start-review');
        if (await startReviewBtn.isVisible()) {
          await startReviewBtn.click();
          await page.waitForTimeout(500);

          const location = page.locator('#review-location');
          if (await location.isVisible()) {
            await location.click();
            await page.waitForTimeout(500);

            await expect(page.locator('#jump-to-item-modal')).not.toHaveClass(/hidden/);

            // Check if there are multiple tabs
            const tabCount = await page.locator('.jump-tab').count();

            if (tabCount > 1) {
              const activeTabBefore = await page.locator('.jump-tab.active').textContent();
              const tabContent = page.locator('#jump-tabs-content');

              // Simulate horizontal swipe (should change tabs)
              await tabContent.evaluate((element) => {
                const startX = 200;
                const startY = 150;
                const endX = 50; // 150px horizontal movement (exceeds threshold)
                const endY = 160; // 10px vertical drift (minimal)

                const touchStart = new TouchEvent('touchstart', {
                  touches: [{ screenX: startX, screenY: startY, clientX: startX, clientY: startY }],
                  changedTouches: [{ screenX: startX, screenY: startY, clientX: startX, clientY: startY }]
                });

                const touchEnd = new TouchEvent('touchend', {
                  touches: [],
                  changedTouches: [{ screenX: endX, screenY: endY, clientX: endX, clientY: endY }]
                });

                element.dispatchEvent(touchStart);
                element.dispatchEvent(touchEnd);
              });

              await page.waitForTimeout(300);

              // The active tab SHOULD have changed (horizontal swipe should switch tabs)
              const activeTabAfter = await page.locator('.jump-tab.active').textContent();
              expect(activeTabAfter).not.toBe(activeTabBefore);
            }
          }
        }
      }
    }
  });

  test('BUG REPRODUCTION: scrolling with 30-degree angle should not change tabs', async ({ page }) => {
    // This test reproduces the exact bug the user reported:
    // Scrolling with slight horizontal drift (common in real usage) was changing tabs

    if (!fs.existsSync(exampleFilePath)) {
      test.skip();
      return;
    }

    const fileInput = page.locator('#file-input');
    await fileInput.setInputFiles(exampleFilePath);
    await page.waitForTimeout(2000);

    await page.click('#btn-next-category');
    await page.waitForTimeout(500);

    const categoryOptions = await page.locator('#category-select option').count();
    if (categoryOptions > 0) {
      const firstOptionValue = await page.locator('#category-select option').first().getAttribute('value');
      if (firstOptionValue) {
        await page.selectOption('#category-select', firstOptionValue);
        await page.waitForTimeout(300);

        await page.click('#btn-start-editing');
        await page.waitForTimeout(1000);

        const startReviewBtn = page.locator('#btn-start-review');
        if (await startReviewBtn.isVisible()) {
          await startReviewBtn.click();
          await page.waitForTimeout(500);

          const location = page.locator('#review-location');
          if (await location.isVisible()) {
            await location.click();
            await page.waitForTimeout(500);

            const activeTabBefore = await page.locator('.jump-tab.active').textContent();
            const tabContent = page.locator('#jump-tabs-content');

            // Simulate realistic scroll with 30-degree angle
            // This is what happens when users try to scroll but drift slightly
            // 60px horizontal, 150px vertical = ~30 degree angle
            // OLD CODE: Would change tabs (bug!)
            // NEW CODE: Does NOT change tabs (fixed!)
            await tabContent.evaluate((element) => {
              const startX = 150;
              const startY = 100;
              const endX = 90;  // 60px horizontal drift
              const endY = 250; // 150px vertical scroll (2.5x horizontal)

              const touchStart = new TouchEvent('touchstart', {
                touches: [{ screenX: startX, screenY: startY, clientX: startX, clientY: startY }],
                changedTouches: [{ screenX: startX, screenY: startY, clientX: startX, clientY: startY }]
              });

              const touchEnd = new TouchEvent('touchend', {
                touches: [],
                changedTouches: [{ screenX: endX, screenY: endY, clientX: endX, clientY: endY }]
              });

              element.dispatchEvent(touchStart);
              element.dispatchEvent(touchEnd);
            });

            await page.waitForTimeout(300);

            // EXPECTED: Tab should NOT change
            // This is primarily vertical movement, user is trying to scroll
            const activeTabAfter = await page.locator('.jump-tab.active').textContent();
            expect(activeTabAfter).toBe(activeTabBefore);
          }
        }
      }
    }
  });

  test('should allow vertical scrolling without interference', async ({ page }) => {
    // Skip if example file doesn't exist
    if (!fs.existsSync(exampleFilePath)) {
      test.skip();
      return;
    }

    // Upload and navigate
    const fileInput = page.locator('#file-input');
    await fileInput.setInputFiles(exampleFilePath);
    await page.waitForTimeout(2000);

    await page.click('#btn-next-category');
    await page.waitForTimeout(500);

    const categoryOptions = await page.locator('#category-select option').count();
    if (categoryOptions > 0) {
      const firstOptionValue = await page.locator('#category-select option').first().getAttribute('value');
      if (firstOptionValue) {
        await page.selectOption('#category-select', firstOptionValue);
        await page.waitForTimeout(300);

        await page.click('#btn-start-editing');
        await page.waitForTimeout(1000);

        const startReviewBtn = page.locator('#btn-start-review');
        if (await startReviewBtn.isVisible()) {
          await startReviewBtn.click();
          await page.waitForTimeout(500);

          const location = page.locator('#review-location');
          if (await location.isVisible()) {
            await location.click();
            await page.waitForTimeout(500);

            // Test pure vertical scroll (no horizontal movement)
            const tabContent = page.locator('#jump-tabs-content .jump-tab-pane.active');
            const tableExists = await tabContent.locator('table').count() > 0;

            if (tableExists) {
              const activeTabBefore = await page.locator('.jump-tab.active').textContent();

              // Pure vertical scroll
              await tabContent.evaluate((element) => {
                const startX = 150;
                const startY = 100;
                const endX = 150; // No horizontal movement
                const endY = 400; // Significant vertical movement

                const touchStart = new TouchEvent('touchstart', {
                  touches: [{ screenX: startX, screenY: startY, clientX: startX, clientY: startY }],
                  changedTouches: [{ screenX: startX, screenY: startY, clientX: startX, clientY: startY }]
                });

                const touchEnd = new TouchEvent('touchend', {
                  touches: [],
                  changedTouches: [{ screenX: endX, screenY: endY, clientX: endX, clientY: endY }]
                });

                element.dispatchEvent(touchStart);
                element.dispatchEvent(touchEnd);
              });

              await page.waitForTimeout(300);

              // Tab should definitely not change with pure vertical scroll
              const activeTabAfter = await page.locator('.jump-tab.active').textContent();
              expect(activeTabAfter).toBe(activeTabBefore);
            }
          }
        }
      }
    }
  });
});
