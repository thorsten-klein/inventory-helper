const { test, expect } = require('@playwright/test');
const { setupApp } = require('./helpers');

test.describe('Scanner Modal Button Clickability Bug', () => {
  test.beforeEach(async ({ page, context }) => {
    await context.grantPermissions(['camera']);
    await setupApp(page, context);
  });

  test('close button should be clickable in scanner modal', async ({ page }) => {
    // Open scanner modal manually
    await page.evaluate(() => {
      const scannerModal = document.getElementById('barcode-scanner-modal');
      scannerModal.classList.remove('hidden');
    });

    // Removed 300ms timeout

    // Verify scanner modal is visible
    const scannerModal = page.locator('#barcode-scanner-modal');
    await expect(scannerModal).not.toHaveClass(/hidden/);

    // Check if close button is visible
    const closeButton = await page.locator('#btn-close-scanner');
    await expect(closeButton).toBeVisible();

    // Check if close button is actually clickable (not obscured)
    const isClickable = await page.evaluate(() => {
      const btn = document.getElementById('btn-close-scanner');
      const rect = btn.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const elementAtPoint = document.elementFromPoint(centerX, centerY);

      // Check if the element at that point is the button or a child of the button
      return elementAtPoint === btn || btn.contains(elementAtPoint);
    });

    expect(isClickable).toBe(true);

    // Try to click the close button
    await closeButton.click();
    // Removed 300ms timeout

    // Verify modal is closed
    await expect(scannerModal).toHaveClass(/hidden/);
  });

  test('zoom buttons should be clickable in scanner modal', async ({ page }) => {
    // Open scanner modal manually and set zoom level to make both buttons enabled
    await page.evaluate(() => {
      const scannerModal = document.getElementById('barcode-scanner-modal');
      scannerModal.classList.remove('hidden');
      // Set zoom level to 2.0 so both buttons are enabled
      if (window.currentZoomLevel !== undefined) {
        window.currentZoomLevel = 2.0;
      }
      // Enable both zoom buttons
      const zoomOut = document.getElementById('btn-zoom-out');
      if (zoomOut) zoomOut.disabled = false;
    });

    // Removed 300ms timeout

    // Check zoom in button
    const zoomInButton = await page.locator('#btn-zoom-in');
    await expect(zoomInButton).toBeVisible();

    const zoomInClickable = await page.evaluate(() => {
      const btn = document.getElementById('btn-zoom-in');
      if (!btn) return false;
      const rect = btn.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const elementAtPoint = document.elementFromPoint(centerX, centerY);
      return elementAtPoint === btn || btn.contains(elementAtPoint);
    });

    expect(zoomInClickable).toBe(true);

    // Check zoom out button
    const zoomOutButton = await page.locator('#btn-zoom-out');
    await expect(zoomOutButton).toBeVisible();

    const zoomOutClickable = await page.evaluate(() => {
      const btn = document.getElementById('btn-zoom-out');
      if (!btn) return false;
      const rect = btn.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const elementAtPoint = document.elementFromPoint(centerX, centerY);
      return elementAtPoint === btn || btn.contains(elementAtPoint);
    });

    expect(zoomOutClickable).toBe(true);
  });

  test('switch camera button should be clickable in scanner modal', async ({ page }) => {
    // Open scanner modal manually
    await page.evaluate(() => {
      const scannerModal = document.getElementById('barcode-scanner-modal');
      scannerModal.classList.remove('hidden');
      // Make switch camera button visible (normally shown when multiple cameras are available)
      const switchButton = document.getElementById('btn-switch-scanner-camera');
      if (switchButton) {
        switchButton.style.display = 'flex';
      }
    });

    // Removed 300ms timeout

    // Check switch camera button
    const switchButton = await page.locator('#btn-switch-scanner-camera');
    await expect(switchButton).toBeVisible();

    const switchClickable = await page.evaluate(() => {
      const btn = document.getElementById('btn-switch-scanner-camera');
      if (!btn) return false;
      const rect = btn.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const elementAtPoint = document.elementFromPoint(centerX, centerY);
      return elementAtPoint === btn || btn.contains(elementAtPoint);
    });

    expect(switchClickable).toBe(true);
  });

  test('identify which element is blocking the buttons', async ({ page }) => {
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

    // Open scanner modal
    await page.evaluate(async () => {
      try {
        await startEanBarcodeScanning();
      } catch (error) {
        console.error('Error starting scanner:', error);
      }
    });

    // Removed 500ms timeout

    // Check what elements are at button positions
    const blockingElements = await page.evaluate(() => {
      const buttons = [
        { id: 'btn-close-scanner', name: 'Close Button' },
        { id: 'btn-zoom-in', name: 'Zoom In Button' },
        { id: 'btn-zoom-out', name: 'Zoom Out Button' },
        { id: 'btn-switch-scanner-camera', name: 'Switch Camera Button' }
      ];

      const results = [];
      buttons.forEach(({ id, name }) => {
        const btn = document.getElementById(id);
        if (btn) {
          const rect = btn.getBoundingClientRect();
          const centerX = rect.left + rect.width / 2;
          const centerY = rect.top + rect.height / 2;
          const elementAtPoint = document.elementFromPoint(centerX, centerY);

          results.push({
            button: name,
            buttonId: id,
            elementAtPoint: elementAtPoint ? elementAtPoint.tagName + (elementAtPoint.id ? '#' + elementAtPoint.id : '') + (elementAtPoint.className ? '.' + elementAtPoint.className.split(' ').join('.') : '') : 'null',
            isClickable: elementAtPoint === btn || btn.contains(elementAtPoint),
            zIndex: window.getComputedStyle(btn).zIndex,
            elementAtPointZIndex: elementAtPoint ? window.getComputedStyle(elementAtPoint).zIndex : 'N/A'
          });
        }
      });

      return results;
    });

    // At least one button should report what's blocking it
    expect(blockingElements.length).toBeGreaterThan(0);
  });
});
