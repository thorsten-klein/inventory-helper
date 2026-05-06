const { test, expect } = require('@playwright/test');

test.describe('Scanner Modal Buttons Simple Test', () => {
  test('check what element is at button position when scanner modal is open', async ({ page }) => {
    await page.context().grantPermissions(['camera']);
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Mock getUserMedia
    await page.evaluate(() => {
      navigator.mediaDevices.getUserMedia = async () => {
        const canvas = document.createElement('canvas');
        canvas.width = 640;
        canvas.height = 480;
        const stream = canvas.captureStream();
        return stream;
      };
    });

    // Open scanner modal by setting classes directly
    await page.evaluate(() => {
      const modal = document.getElementById('barcode-scanner-modal');
      modal.classList.remove('hidden');
    });

    await page.waitForTimeout(500);

    // Check what's at the close button position
    const closeButtonInfo = await page.evaluate(() => {
      const btn = document.getElementById('btn-close-scanner');
      if (!btn) return { error: 'Button not found' };

      const rect = btn.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const elementAtPoint = document.elementFromPoint(centerX, centerY);

      return {
        buttonRect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
        buttonZIndex: window.getComputedStyle(btn).zIndex,
        buttonPosition: window.getComputedStyle(btn).position,
        elementAtPoint: elementAtPoint ? {
          tag: elementAtPoint.tagName,
          id: elementAtPoint.id,
          classes: elementAtPoint.className,
          zIndex: window.getComputedStyle(elementAtPoint).zIndex
        } : null,
        isClickable: elementAtPoint === btn || btn.contains(elementAtPoint),
        modalZIndex: window.getComputedStyle(document.getElementById('barcode-scanner-modal')).zIndex
      };
    });

    console.log('Close button analysis:', JSON.stringify(closeButtonInfo, null, 2));

    // Check zoom buttons
    const zoomButtonInfo = await page.evaluate(() => {
      const zoomIn = document.getElementById('btn-zoom-in');
      const zoomOut = document.getElementById('btn-zoom-out');
      const container = document.getElementById('barcode-scanner-container');

      const results = [];

      [
        { btn: zoomIn, name: 'Zoom In' },
        { btn: zoomOut, name: 'Zoom Out' }
      ].forEach(({ btn, name }) => {
        if (!btn) {
          results.push({ name, error: 'Button not found' });
          return;
        }

        const rect = btn.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const elementAtPoint = document.elementFromPoint(centerX, centerY);

        results.push({
          name,
          buttonRect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
          buttonZIndex: window.getComputedStyle(btn).zIndex,
          parentZIndex: btn.parentElement ? window.getComputedStyle(btn.parentElement).zIndex : 'N/A',
          elementAtPoint: elementAtPoint ? {
            tag: elementAtPoint.tagName,
            id: elementAtPoint.id,
            classes: elementAtPoint.className,
            zIndex: window.getComputedStyle(elementAtPoint).zIndex
          } : null,
          isClickable: elementAtPoint === btn || btn.contains(elementAtPoint)
        });
      });

      // Also check the container pseudo-element
      const containerStyle = window.getComputedStyle(container, '::before');

      return {
        buttons: results,
        containerPseudoElement: {
          zIndex: containerStyle.zIndex,
          pointerEvents: containerStyle.pointerEvents,
          boxShadow: containerStyle.boxShadow.substring(0, 100) // Truncate for readability
        }
      };
    });

    console.log('Zoom buttons analysis:', JSON.stringify(zoomButtonInfo, null, 2));

    // At least log the findings
    expect(closeButtonInfo).toBeDefined();
    expect(zoomButtonInfo).toBeDefined();
  });
});
