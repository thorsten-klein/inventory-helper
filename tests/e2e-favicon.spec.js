const { test, expect } = require('@playwright/test');

test.describe('Favicon', () => {
  test('should have favicon link tags in HTML head', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    // Removed 500ms timeout

    // Check for SVG favicon
    const svgFavicon = page.locator('link[rel="icon"][type="image/svg+xml"]');
    await expect(svgFavicon).toHaveCount(1);
    const svgHref = await svgFavicon.getAttribute('href');
    expect(svgHref).toBe('favicon.svg');

    // Check for Apple touch icon (using SVG)
    const appleTouchIcon = page.locator('link[rel="apple-touch-icon"]');
    await expect(appleTouchIcon).toHaveCount(1);
    const appleHref = await appleTouchIcon.getAttribute('href');
    expect(appleHref).toBe('favicon.svg');
  });

  test('SVG favicon file should be accessible', async ({ page }) => {
    const response = await page.goto('/favicon.svg');
    expect(response?.status()).toBe(200);

    const contentType = response?.headers()['content-type'];
    expect(contentType).toContain('svg');
  });

  test('favicon should be visible in browser tab', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    // Removed 500ms timeout

    // Check that the page title is set
    const title = await page.title();
    expect(title).toBe('Stock Inventory Review');

    // Verify favicon link is in the document
    const faviconExists = await page.evaluate(() => {
      const links = document.querySelectorAll('link[rel*="icon"]');
      return links.length > 0;
    });
    expect(faviconExists).toBe(true);
  });

  test('should have proper sizes attribute for different device resolutions', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    // Removed 500ms timeout

    // Check for apple-touch-icon with sizes
    const appleTouchIcon = page.locator('link[rel="apple-touch-icon"]');
    const sizes = await appleTouchIcon.getAttribute('sizes');
    expect(sizes).toBe('180x180');
  });
});
