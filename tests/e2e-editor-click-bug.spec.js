const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

test.describe('Editor Screen - Click Bug Investigation', () => {
  const exampleFilePath = path.join(__dirname, '..', 'example', 'example.xlsx');

  test('should not show any weird text in top-left corner when clicking item', async ({ page }) => {
    // Skip if example file doesn't exist
    if (!fs.existsSync(exampleFilePath)) {
      test.skip();
      return;
    }

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

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

        // Wait for editor screen
        await page.waitForSelector('#editor-screen:not(.hidden)');
        await page.waitForSelector('.item-card', { timeout: 5000 });

        // Take screenshot before click
        await page.screenshot({ path: 'test-results/before-click.png' });

        // Get elements in top-left corner before clicking
        const beforeElements = await page.evaluate(() => {
          const topLeft = document.elementFromPoint(10, 10);
          const elements = [];
          let current = topLeft;
          while (current && current !== document.body) {
            elements.push({
              tag: current.tagName,
              className: current.className,
              text: current.textContent?.substring(0, 50),
              style: {
                position: window.getComputedStyle(current).position,
                top: window.getComputedStyle(current).top,
                left: window.getComputedStyle(current).left,
                display: window.getComputedStyle(current).display
              }
            });
            current = current.parentElement;
          }
          return elements;
        });

        console.log('Elements at top-left BEFORE click:', JSON.stringify(beforeElements, null, 2));

        // Click on first item
        const firstItem = page.locator('.item-card').first();
        await firstItem.click();
        await page.waitForTimeout(500);

        // Take screenshot after click
        await page.screenshot({ path: 'test-results/after-click.png' });

        // Get elements in top-left corner after clicking
        const afterElements = await page.evaluate(() => {
          const topLeft = document.elementFromPoint(10, 10);
          const elements = [];
          let current = topLeft;
          while (current && current !== document.body) {
            elements.push({
              tag: current.tagName,
              className: current.className,
              text: current.textContent?.substring(0, 50),
              style: {
                position: window.getComputedStyle(current).position,
                top: window.getComputedStyle(current).top,
                left: window.getComputedStyle(current).left,
                display: window.getComputedStyle(current).display
              }
            });
            current = current.parentElement;
          }
          return elements;
        });

        console.log('Elements at top-left AFTER click:', JSON.stringify(afterElements, null, 2));

        // Check for any new elements or text
        const newElements = afterElements.filter((after, index) => {
          const before = beforeElements[index];
          return !before || after.text !== before.text || after.className !== before.className;
        });

        console.log('NEW or CHANGED elements:', JSON.stringify(newElements, null, 2));

        // Check for any absolute/fixed positioned elements with text
        const suspiciousElements = await page.evaluate(() => {
          const all = Array.from(document.querySelectorAll('*'));
          return all
            .filter(el => {
              const style = window.getComputedStyle(el);
              const hasText = el.textContent && el.textContent.trim().length > 0;
              const isPositioned = style.position === 'absolute' || style.position === 'fixed';
              const isInTopLeft = parseInt(style.top) < 100 && parseInt(style.left) < 100;
              return hasText && isPositioned && isInTopLeft && style.display !== 'none';
            })
            .map(el => ({
              tag: el.tagName,
              className: el.className,
              id: el.id,
              text: el.textContent.substring(0, 100),
              style: {
                position: window.getComputedStyle(el).position,
                top: window.getComputedStyle(el).top,
                left: window.getComputedStyle(el).left,
                zIndex: window.getComputedStyle(el).zIndex
              }
            }));
        });

        console.log('Suspicious positioned elements with text:', JSON.stringify(suspiciousElements, null, 2));

        // Verify no suspicious elements exist
        expect(suspiciousElements.length).toBe(0);
      }
    }
  });
});
