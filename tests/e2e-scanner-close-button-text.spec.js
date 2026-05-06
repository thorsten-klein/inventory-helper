const { test, expect } = require('@playwright/test');

test.describe('Scanner Close Button Text', () => {
  test('close button should have text after page load', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Wait for initialization
    // Removed 500ms timeout

    // Check if close button has text
    const buttonText = await page.evaluate(() => {
      const btn = document.getElementById('btn-close-scanner');
      return btn ? btn.textContent.trim() : null;
    });

    expect(buttonText).toBeTruthy();
    expect(buttonText.length).toBeGreaterThan(0);
  });
});
