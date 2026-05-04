// Barcode Scanner Utilities - shared ZXing-based scanner

/**
 * Start a ZXing barcode scanner on a video element
 * @param {HTMLVideoElement} videoElement - The video element to use
 * @param {Function} onDetected - Callback when barcode is detected (code) => {}
 * @param {Object} options - Optional configuration
 * @returns {Promise<Object>} - Scanner instance with stop() method
 */
async function startZXingScanner(videoElement, onDetected, options = {}) {
    const {
        deviceId = undefined,
        facingMode = 'environment'
    } = options;

    try {
        const codeReader = new ZXing.BrowserMultiFormatReader();

        // Determine which device to use
        let selectedDeviceId = deviceId;
        if (!selectedDeviceId) {
            // Get default camera (back camera if available)
            const videoDevices = await codeReader.listVideoInputDevices();
            if (videoDevices.length === 0) {
                throw new Error('No camera found');
            }
            selectedDeviceId = videoDevices[0].deviceId;
        }

        // Start decoding
        const controls = await codeReader.decodeFromVideoDevice(
            selectedDeviceId,
            videoElement,
            (result, err) => {
                if (result) {
                    onDetected(result.text);
                }
                if (err && !(err instanceof ZXing.NotFoundException)) {
                    console.error('ZXing scanning error:', err);
                }
            }
        );

        // Return scanner instance
        return {
            stop: () => {
                if (controls && controls.stop) {
                    controls.stop();
                }
                if (codeReader) {
                    codeReader.reset();
                }
                if (videoElement) {
                    videoElement.srcObject = null;
                }
            },
            codeReader: codeReader,
            controls: controls
        };
    } catch (error) {
        console.error('Error starting ZXing scanner:', error);
        throw error;
    }
}

/**
 * Get list of available video input devices
 * @returns {Promise<Array>} - List of video input devices
 */
async function getVideoDevices() {
    try {
        const codeReader = new ZXing.BrowserMultiFormatReader();
        const devices = await codeReader.listVideoInputDevices();
        return devices;
    } catch (error) {
        console.error('Error getting video devices:', error);
        return [];
    }
}

// EAN input field scanner state
let eanBarcodeScanner = null;
let eanScannerCameras = [];
let eanScannerCurrentCameraIndex = 0;
let currentZoomLevel = 1.0;
let currentVideoTrack = null;

function initEanBarcodeScanner() {
    const btnScanBarcode = document.getElementById('btn-scan-barcode');
    const scannerModal = document.getElementById('barcode-scanner-modal');
    const btnCloseScanner = document.getElementById('btn-close-scanner');
    const btnSwitchCamera = document.getElementById('btn-switch-scanner-camera');
    const btnZoomIn = document.getElementById('btn-zoom-in');
    const btnZoomOut = document.getElementById('btn-zoom-out');
    const zoomLevelDisplay = document.getElementById('zoom-level-display');
    const scannerTitle = document.getElementById('barcode-scanner-title');
    const video = document.getElementById('barcode-scanner-video');
    const scannerResult = document.getElementById('barcode-scanner-result');
    const scannerText = document.getElementById('barcode-scanner-text');

    if (!btnScanBarcode) return;

    // Load saved zoom level from localStorage
    const savedZoom = localStorage.getItem('scannerZoomLevel');
    if (savedZoom !== null) {
        currentZoomLevel = parseFloat(savedZoom);
        if (isNaN(currentZoomLevel) || currentZoomLevel < 1.0) {
            currentZoomLevel = 1.0;
        }
    }

    // Set translations
    scannerTitle.textContent = t('scanBarcode');
    btnCloseScanner.textContent = t('close');

    // Remove old event listeners by cloning
    const newBtnScanBarcode = btnScanBarcode.cloneNode(true);
    btnScanBarcode.parentNode.replaceChild(newBtnScanBarcode, btnScanBarcode);

    newBtnScanBarcode.addEventListener('click', async () => {
        try {
            await startEanBarcodeScanning();
        } catch (error) {
            console.error('Error starting EAN barcode scanner:', error);
            alert('Unable to access camera. Please check camera permissions.');
        }
    });

    const newBtnCloseScanner = btnCloseScanner.cloneNode(true);
    newBtnCloseScanner.textContent = t('close');
    btnCloseScanner.parentNode.replaceChild(newBtnCloseScanner, btnCloseScanner);

    newBtnCloseScanner.addEventListener('click', () => {
        stopEanBarcodeScanning();
        hideModal(scannerModal);
    });

    // Switch camera button
    if (btnSwitchCamera) {
        const newBtnSwitchCamera = btnSwitchCamera.cloneNode(true);
        newBtnSwitchCamera.innerHTML = `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="23 4 23 10 17 10"></polyline>
                <polyline points="1 20 1 14 7 14"></polyline>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
            </svg>
        `;
        newBtnSwitchCamera.title = t('switchCamera');
        btnSwitchCamera.parentNode.replaceChild(newBtnSwitchCamera, btnSwitchCamera);

        newBtnSwitchCamera.addEventListener('click', () => {
            switchEanScannerCamera();
        });
    }

    // Zoom controls
    if (btnZoomIn && btnZoomOut && zoomLevelDisplay) {
        // Update zoom display
        updateZoomDisplay();

        const newBtnZoomIn = btnZoomIn.cloneNode(true);
        newBtnZoomIn.innerHTML = btnZoomIn.innerHTML;
        newBtnZoomIn.title = 'Zoom In';
        btnZoomIn.parentNode.replaceChild(newBtnZoomIn, btnZoomIn);

        const newBtnZoomOut = btnZoomOut.cloneNode(true);
        newBtnZoomOut.innerHTML = btnZoomOut.innerHTML;
        newBtnZoomOut.title = 'Zoom Out';
        btnZoomOut.parentNode.replaceChild(newBtnZoomOut, btnZoomOut);

        newBtnZoomIn.addEventListener('click', () => {
            adjustZoom(0.5);
        });

        newBtnZoomOut.addEventListener('click', () => {
            adjustZoom(-0.5);
        });
    }

    // Close on background click
    const closeOnBackground = (e) => {
        if (e.target === scannerModal) {
            stopEanBarcodeScanning();
            hideModal(scannerModal);
        }
    };
    scannerModal.addEventListener('click', closeOnBackground);
}

async function startEanBarcodeScanning(cameraIndex = null) {
    const scannerModal = document.getElementById('barcode-scanner-modal');
    const video = document.getElementById('barcode-scanner-video');
    const scannerResult = document.getElementById('barcode-scanner-result');
    const scannerText = document.getElementById('barcode-scanner-text');
    const btnSwitchCamera = document.getElementById('btn-switch-scanner-camera');

    // Reset result
    scannerResult.classList.add('hidden');
    scannerText.textContent = '';

    // Show modal
    showModal(scannerModal);

    try {
        // Get available cameras
        eanScannerCameras = await getVideoDevices();

        // Use saved camera index if not explicitly specified
        if (cameraIndex === null) {
            const savedIndex = localStorage.getItem('preferredCameraIndex');
            cameraIndex = savedIndex !== null ? parseInt(savedIndex) : 0;
            // Ensure index is within bounds
            if (cameraIndex >= eanScannerCameras.length) {
                cameraIndex = 0;
            }
        }

        eanScannerCurrentCameraIndex = cameraIndex;

        // Show/hide switch button based on camera count
        if (btnSwitchCamera) {
            if (eanScannerCameras.length > 1) {
                btnSwitchCamera.style.display = 'flex';
            } else {
                btnSwitchCamera.style.display = 'none';
            }
        }

        // Get device ID for selected camera
        const deviceId = eanScannerCameras[eanScannerCurrentCameraIndex]?.deviceId;

        // Start scanning using the shared ZXing scanner
        const scanner = await startZXingScanner(video, (code) => {
            // Only accept 13-digit EAN codes
            if (/^\d{13}$/.test(code)) {
                // Valid EAN-13 found
                scannerText.textContent = `${t('eanFound')}: ${code}`;
                scannerResult.classList.remove('hidden');

                // Fill the EAN input field
                const eanInput = document.getElementById('edit-ean');
                if (eanInput) {
                    eanInput.value = code;
                }

                // Stop scanning and close modal after short delay
                setTimeout(() => {
                    stopEanBarcodeScanning();
                    hideModal(scannerModal);
                }, 1000);
            }
        }, { deviceId });

        // Store the scanner for cleanup
        eanBarcodeScanner = scanner;

        // Apply saved zoom level after a short delay to ensure video is ready
        setTimeout(async () => {
            await applySavedZoom();
        }, 500);

    } catch (error) {
        console.error('Error accessing camera:', error);
        hideModal(scannerModal);
        throw error;
    }
}

async function switchEanScannerCamera() {
    if (eanScannerCameras.length <= 1) return;

    // Stop current scanner
    stopEanBarcodeScanning();

    // Switch to next camera
    eanScannerCurrentCameraIndex = (eanScannerCurrentCameraIndex + 1) % eanScannerCameras.length;

    // Save camera preference
    localStorage.setItem('preferredCameraIndex', eanScannerCurrentCameraIndex);

    // Restart with new camera
    await startEanBarcodeScanning(eanScannerCurrentCameraIndex);
}

function stopEanBarcodeScanning() {
    // Stop the scanner
    if (eanBarcodeScanner && eanBarcodeScanner.stop) {
        eanBarcodeScanner.stop();
        eanBarcodeScanner = null;
    }
    currentVideoTrack = null;
}

/**
 * Adjust camera zoom level
 * @param {number} delta - Change in zoom level (e.g., 0.5 or -0.5)
 */
async function adjustZoom(delta) {
    // Calculate new zoom level
    const newZoom = Math.round((currentZoomLevel + delta) * 10) / 10; // Round to 1 decimal place

    // Constrain zoom level to minimum 1.0
    if (newZoom < 1.0) {
        return;
    }

    // Get the video element's track
    const video = document.getElementById('barcode-scanner-video');
    if (!video || !video.srcObject) {
        return;
    }

    const stream = video.srcObject;
    const videoTrack = stream.getVideoTracks()[0];

    if (!videoTrack) {
        return;
    }

    // Store the track for future use
    currentVideoTrack = videoTrack;

    // Check if zoom is supported
    const capabilities = videoTrack.getCapabilities();
    if (!capabilities.zoom) {
        console.warn('Zoom not supported by this camera');
        return;
    }

    // Constrain zoom to camera's max zoom
    const maxZoom = capabilities.zoom.max || 10;
    const constrainedZoom = Math.min(newZoom, maxZoom);

    try {
        // Apply zoom
        await videoTrack.applyConstraints({
            advanced: [{ zoom: constrainedZoom }]
        });

        // Update current zoom level
        currentZoomLevel = constrainedZoom;

        // Save to localStorage
        localStorage.setItem('scannerZoomLevel', currentZoomLevel.toString());

        // Update UI
        updateZoomDisplay();
    } catch (error) {
        console.error('Error applying zoom:', error);
    }
}

/**
 * Update the zoom level display and button states
 */
function updateZoomDisplay() {
    const zoomLevelDisplay = document.getElementById('zoom-level-display');
    const btnZoomOut = document.getElementById('btn-zoom-out');

    if (zoomLevelDisplay) {
        zoomLevelDisplay.textContent = `${currentZoomLevel.toFixed(1)}x`;
    }

    if (btnZoomOut) {
        // Disable zoom out button if at minimum zoom
        btnZoomOut.disabled = currentZoomLevel <= 1.0;
    }
}

/**
 * Apply saved zoom level to the current video track
 */
async function applySavedZoom() {
    if (currentZoomLevel === 1.0) {
        return; // No zoom to apply
    }

    const video = document.getElementById('barcode-scanner-video');
    if (!video || !video.srcObject) {
        return;
    }

    const stream = video.srcObject;
    const videoTrack = stream.getVideoTracks()[0];

    if (!videoTrack) {
        return;
    }

    currentVideoTrack = videoTrack;

    // Check if zoom is supported
    const capabilities = videoTrack.getCapabilities();
    if (!capabilities.zoom) {
        console.warn('Zoom not supported by this camera');
        return;
    }

    // Constrain zoom to camera's max zoom
    const maxZoom = capabilities.zoom.max || 10;
    const constrainedZoom = Math.min(currentZoomLevel, maxZoom);

    try {
        // Apply zoom
        await videoTrack.applyConstraints({
            advanced: [{ zoom: constrainedZoom }]
        });

        // Update current zoom level (in case it was constrained)
        currentZoomLevel = constrainedZoom;

        // Update UI
        updateZoomDisplay();
    } catch (error) {
        console.error('Error applying saved zoom:', error);
    }
}
