const { test, expect } = require('@playwright/test');

test.describe('Favicon', () => {
  test('should have favicon link tags in HTML head', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    // Check for SVG favicon
    const svgFavicon = page.locator('link[rel="icon"][type="image/svg+xml"]');
    await expect(svgFavicon).toHaveCount(1);
    const svgHref = await svgFavicon.getAttribute('href');
    expect(svgHref).toBe('favicon.svg');

    // Check for fallback favicon
    const fallbackFavicon = page.locator('link[rel="icon"][type="image/png"]');
    await expect(fallbackFavicon).toHaveCount(1);
    const pngHref = await fallbackFavicon.getAttribute('href');
    expect(pngHref).toBe('favicon.png');

    // Check for Apple touch icon
    const appleTouchIcon = page.locator('link[rel="apple-touch-icon"]');
    await expect(appleTouchIcon).toHaveCount(1);
    const appleHref = await appleTouchIcon.getAttribute('href');
    expect(appleHref).toBe('apple-touch-icon.png');
  });

  test('SVG favicon file should be accessible', async ({ page }) => {
    const response = await page.goto('/favicon.svg');
    expect(response?.status()).toBe(200);

    const contentType = response?.headers()['content-type'];
    expect(contentType).toContain('svg');
  });

  test('favicon should be visible in browser tab', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

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
    await page.waitForTimeout(500);

    // Check for apple-touch-icon with sizes
    const appleTouchIcon = page.locator('link[rel="apple-touch-icon"]');
    const sizes = await appleTouchIcon.getAttribute('sizes');
    expect(sizes).toBe('180x180');
  });
});
