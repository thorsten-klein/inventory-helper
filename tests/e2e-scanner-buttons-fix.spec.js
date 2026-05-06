const { test, expect } = require('@playwright/test');

test.describe('Scanner Modal Buttons Clickability - After Fix', () => {
  test.beforeEach(async ({ page }) => {
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
  });

  test('scanner modal buttons should have z-index 1200', async ({ page }) => {
    // Open scanner modal directly
    await page.evaluate(() => {
      const modal = document.getElementById('barcode-scanner-modal');
      modal.classList.remove('hidden');
    });

    await page.waitForTimeout(300);

    const zIndexes = await page.evaluate(() => {
      const switchBtn = document.getElementById('btn-switch-scanner-camera');
      const zoomControls = document.querySelector('.scanner-zoom-controls');
      const modalButtons = document.querySelector('#barcode-scanner-modal .modal-buttons');
      const modal = document.getElementById('barcode-scanner-modal');

      return {
        modal: window.getComputedStyle(modal).zIndex,
        switchCamera: switchBtn ? window.getComputedStyle(switchBtn).zIndex : 'N/A',
        zoomControls: zoomControls ? window.getComputedStyle(zoomControls).zIndex : 'N/A',
        modalButtons: modalButtons ? window.getComputedStyle(modalButtons).zIndex : 'N/A'
      };
    });

    // All buttons should have z-index 1200
    expect(zIndexes.switchCamera).toBe('1200');
    expect(zIndexes.zoomControls).toBe('1200');
    expect(zIndexes.modalButtons).toBe('1200');
    // Modal itself should be 1100
    expect(zIndexes.modal).toBe('1100');
  });

  test('buttons should be above search modal when both are open', async ({ page }) => {
    // Open search modal
    await page.evaluate(() => {
      const searchModal = document.getElementById('search-modal');
      searchModal.classList.remove('hidden');
    });

    await page.waitForTimeout(200);

    // Open scanner modal
    await page.evaluate(() => {
      const scannerModal = document.getElementById('barcode-scanner-modal');
      scannerModal.classList.remove('hidden');
    });

    await page.waitForTimeout(200);

    // Check z-index hierarchy
    const hierarchy = await page.evaluate(() => {
      const searchModal = document.getElementById('search-modal');
      const scannerModal = document.getElementById('barcode-scanner-modal');
      const switchBtn = document.getElementById('btn-switch-scanner-camera');
      const zoomControls = document.querySelector('.scanner-zoom-controls');

      return {
        searchModal: parseInt(window.getComputedStyle(searchModal).zIndex),
        scannerModal: parseInt(window.getComputedStyle(scannerModal).zIndex),
        switchButton: parseInt(window.getComputedStyle(switchBtn).zIndex),
        zoomControls: parseInt(window.getComputedStyle(zoomControls).zIndex)
      };
    });

    // Scanner modal should be above search modal
    expect(hierarchy.scannerModal).toBeGreaterThan(hierarchy.searchModal);

    // Scanner buttons should be above scanner modal
    expect(hierarchy.switchButton).toBeGreaterThan(hierarchy.scannerModal);
    expect(hierarchy.zoomControls).toBeGreaterThan(hierarchy.scannerModal);

    // Scanner buttons should be WAY above search modal
    expect(hierarchy.switchButton).toBeGreaterThan(hierarchy.searchModal);
    expect(hierarchy.zoomControls).toBeGreaterThan(hierarchy.searchModal);
  });

  test('buttons should have higher z-index than modal pseudo-element', async ({ page }) => {
    await page.evaluate(() => {
      const modal = document.getElementById('barcode-scanner-modal');
      modal.classList.remove('hidden');
    });

    await page.waitForTimeout(200);

    const comparison = await page.evaluate(() => {
      const container = document.getElementById('barcode-scanner-container');
      const switchBtn = document.getElementById('btn-switch-scanner-camera');
      const zoomControls = document.querySelector('.scanner-zoom-controls');

      const pseudoStyle = window.getComputedStyle(container, '::before');
      const pseudoZIndex = parseInt(pseudoStyle.zIndex);

      const switchZIndex = parseInt(window.getComputedStyle(switchBtn).zIndex);
      const zoomZIndex = parseInt(window.getComputedStyle(zoomControls).zIndex);

      return {
        pseudoElement: pseudoZIndex,
        switchButton: switchZIndex,
        zoomControls: zoomZIndex,
        pseudoPointerEvents: pseudoStyle.pointerEvents
      };
    });

    // Buttons should have much higher z-index than pseudo-element
    expect(comparison.switchButton).toBeGreaterThan(comparison.pseudoElement);
    expect(comparison.zoomControls).toBeGreaterThan(comparison.pseudoElement);

    // Pseudo-element should have pointer-events: none
    expect(comparison.pseudoPointerEvents).toBe('none');
  });
});
