const { test, expect } = require('@playwright/test');

test.describe('Scanner Buttons Clickable from Search Modal - Bug Fix Verification', () => {
  test('buttons should be clickable when scanner is opened from search modal', async ({ page }) => {
    await page.context().grantPermissions(['camera']);
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

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

    // Simulate opening search modal and then scanner modal (user scenario)
    await page.evaluate(() => {
      // Open search modal
      const searchModal = document.getElementById('search-modal');
      searchModal.classList.remove('hidden');

      // Simulate clicking scan button (which opens scanner modal)
      const scannerModal = document.getElementById('barcode-scanner-modal');
      scannerModal.classList.remove('hidden');
    });

    await page.waitForTimeout(300);

    // Verify both modals are open
    const modalsOpen = await page.evaluate(() => {
      const search = document.getElementById('search-modal');
      const scanner = document.getElementById('barcode-scanner-modal');
      return {
        search: !search.classList.contains('hidden'),
        scanner: !scanner.classList.contains('hidden')
      };
    });

    expect(modalsOpen.search).toBe(true);
    expect(modalsOpen.scanner).toBe(true);

    // Check z-index hierarchy
    const zIndexCheck = await page.evaluate(() => {
      const searchModal = document.getElementById('search-modal');
      const scannerModal = document.getElementById('barcode-scanner-modal');
      const closeButton = document.getElementById('btn-close-scanner');
      const switchCamera = document.getElementById('btn-switch-scanner-camera');
      const zoomIn = document.getElementById('btn-zoom-in');
      const zoomOut = document.getElementById('btn-zoom-out');
      const zoomControls = document.querySelector('.scanner-zoom-controls');
      const modalButtons = document.querySelector('#barcode-scanner-modal .modal-buttons');

      return {
        searchModalZ: parseInt(window.getComputedStyle(searchModal).zIndex),
        scannerModalZ: parseInt(window.getComputedStyle(scannerModal).zIndex),
        closeButtonZ: closeButton ? parseInt(window.getComputedStyle(closeButton).zIndex) || 0 : 0,
        switchCameraZ: switchCamera ? parseInt(window.getComputedStyle(switchCamera).zIndex) : 0,
        zoomInZ: zoomIn ? parseInt(window.getComputedStyle(zoomIn.parentElement).zIndex) : 0,
        zoomOutZ: zoomOut ? parseInt(window.getComputedStyle(zoomOut.parentElement).zIndex) : 0,
        zoomControlsZ: zoomControls ? parseInt(window.getComputedStyle(zoomControls).zIndex) : 0,
        modalButtonsZ: modalButtons ? parseInt(window.getComputedStyle(modalButtons).zIndex) : 0
      };
    });

    // Verify correct z-index hierarchy
    expect(zIndexCheck.scannerModalZ).toBe(1100); // Scanner modal
    expect(zIndexCheck.searchModalZ).toBe(1000);  // Search modal
    expect(zIndexCheck.switchCameraZ).toBe(1200); // Switch camera button
    expect(zIndexCheck.zoomControlsZ).toBe(1200); // Zoom controls
    expect(zIndexCheck.modalButtonsZ).toBe(1200); // Modal buttons container

    // All button z-indexes should be above both modals
    expect(zIndexCheck.switchCameraZ).toBeGreaterThan(zIndexCheck.scannerModalZ);
    expect(zIndexCheck.switchCameraZ).toBeGreaterThan(zIndexCheck.searchModalZ);
    expect(zIndexCheck.zoomControlsZ).toBeGreaterThan(zIndexCheck.scannerModalZ);
    expect(zIndexCheck.zoomControlsZ).toBeGreaterThan(zIndexCheck.searchModalZ);
    expect(zIndexCheck.modalButtonsZ).toBeGreaterThan(zIndexCheck.scannerModalZ);
    expect(zIndexCheck.modalButtonsZ).toBeGreaterThan(zIndexCheck.searchModalZ);
  });
});
