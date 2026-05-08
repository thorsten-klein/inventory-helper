// Barcode Scanner Utilities - shared ZXing-based scanner

// Global variable to track which input field should receive the scanned barcode
let barcodeScannerTargetInput = null;

/**
 * Validate EAN-13 barcode with checksum
 * @param {string} ean - The EAN code to validate
 * @returns {boolean} - True if valid EAN-13
 */
function isValidEAN13(ean) {
    // Must be exactly 13 digits
    if (!/^\d{13}$/.test(ean)) {
        return false;
    }

    // Calculate checksum
    let sum = 0;
    for (let i = 0; i < 12; i++) {
        const digit = parseInt(ean[i]);
        // Odd positions (1st, 3rd, 5th...) multiply by 1
        // Even positions (2nd, 4th, 6th...) multiply by 3
        sum += digit * (i % 2 === 0 ? 1 : 3);
    }

    // Check digit calculation
    const checkDigit = (10 - (sum % 10)) % 10;
    const providedCheckDigit = parseInt(ean[12]);

    return checkDigit === providedCheckDigit;
}

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

        // Suppress ZXing's console noise during scanning
        const originalConsoleError = console.error;
        const originalConsoleWarn = console.warn;

        console.error = (...args) => {
            // Filter out ZXing's expected scanning errors
            const message = args[0]?.toString() || '';
            if (message.includes('MultiFormatReader') ||
                message.includes('non-ReaderException') ||
                message.includes('ReaderException')) {
                return; // Suppress noisy scanning errors
            }
            originalConsoleError.apply(console, args);
        };

        console.warn = (...args) => {
            // Filter out "video already playing" warnings
            const message = args[0]?.toString() || '';
            if (message.includes('play video that is already playing')) {
                return;
            }
            originalConsoleWarn.apply(console, args);
        };

        // Start decoding
        const controls = await codeReader.decodeFromVideoDevice(
            selectedDeviceId,
            videoElement,
            (result, err) => {
                if (result) {
                    onDetected(result.text);
                }
                // Silently ignore all scanning errors (they're expected and normal)
            }
        );

        // Return scanner instance
        return {
            stop: () => {
                // Restore console methods
                console.error = originalConsoleError;
                console.warn = originalConsoleWarn;

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
            controls: controls,
            _restoreConsole: () => {
                // Fallback method to restore console
                console.error = originalConsoleError;
                console.warn = originalConsoleWarn;
            }
        };
    } catch (error) {
        // Restore console on error
        console.error = originalConsoleError;
        console.warn = originalConsoleWarn;
        originalConsoleError('Error starting ZXing scanner:', error);
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
let scannerZoomRenderLoop = null;

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
            // Only accept valid EAN-13 codes with correct checksum
            if (isValidEAN13(code)) {
                // Valid EAN-13 found
                scannerText.textContent = `${t('eanFound')}: ${code}`;
                scannerResult.classList.remove('hidden');

                // Fill the target input field (either custom target or default edit-ean)
                const targetInput = barcodeScannerTargetInput || document.getElementById('edit-ean');
                if (targetInput) {
                    targetInput.value = code;
                }

                // Reset target input for next scan
                barcodeScannerTargetInput = null;

                // Stop scanning and close modal after short delay
                setTimeout(() => {
                    stopEanBarcodeScanning();
                    hideModal(scannerModal);
                }, 1000);
            }
        }, { deviceId });

        // Store the scanner for cleanup
        eanBarcodeScanner = scanner;

        // Start canvas rendering immediately (no delay)
        applySavedZoom();

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
    // Stop zoom rendering
    stopScannerZoomRendering();

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

    // Update current zoom level
    currentZoomLevel = newZoom;

    // Save to localStorage
    localStorage.setItem('scannerZoomLevel', currentZoomLevel.toString());

    // Update UI
    updateZoomDisplay();

    // Always use canvas rendering for 2:1 crop (even at 1.0x zoom)
    startScannerZoomRendering();
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
    // Update UI
    updateZoomDisplay();

    // Always start rendering for 2:1 crop (even at 1.0x zoom)
    startScannerZoomRendering();
}

/**
 * Start rendering zoomed video to canvas
 */
function startScannerZoomRendering() {
    const video = document.getElementById('barcode-scanner-video');
    const canvas = document.getElementById('barcode-scanner-canvas');

    if (!video || !canvas) {
        return;
    }

    // Stop any existing render loop
    stopScannerZoomRendering();

    // Show canvas, hide video
    video.classList.add('zoomed');
    canvas.classList.add('zoomed');

    // Set up canvas rendering
    const ctx = canvas.getContext('2d');

    function render() {
        if (video.readyState === video.HAVE_ENOUGH_DATA) {
            const zoom = currentZoomLevel;

            // Target aspect ratio: 2:1 (width:height)
            const targetAspectRatio = 2.0;

            // Calculate the base crop dimensions for 2:1 ratio at 1x zoom
            let baseCropWidth, baseCropHeight;
            const videoAspectRatio = video.videoWidth / video.videoHeight;

            if (videoAspectRatio > targetAspectRatio) {
                // Video is wider than 2:1, crop width
                baseCropHeight = video.videoHeight;
                baseCropWidth = baseCropHeight * targetAspectRatio;
            } else {
                // Video is taller than 2:1, crop height
                baseCropWidth = video.videoWidth;
                baseCropHeight = baseCropWidth / targetAspectRatio;
            }

            // Apply zoom to the base crop
            const cropWidth = baseCropWidth / zoom;
            const cropHeight = baseCropHeight / zoom;
            const cropX = (video.videoWidth - cropWidth) / 2;
            const cropY = (video.videoHeight - cropHeight) / 2;

            // Set canvas to fixed size (based on 2:1 ratio)
            // Use the base crop dimensions to maintain consistent display size
            if (canvas.width !== baseCropWidth || canvas.height !== baseCropHeight) {
                canvas.width = baseCropWidth;
                canvas.height = baseCropHeight;
            }

            // Clear canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Draw cropped video scaled to fill canvas
            ctx.drawImage(
                video,
                cropX, cropY, cropWidth, cropHeight,  // Source crop
                0, 0, canvas.width, canvas.height     // Destination (fill canvas, scaled up)
            );
        }

        scannerZoomRenderLoop = requestAnimationFrame(render);
    }

    render();
}

/**
 * Stop rendering zoomed video
 */
function stopScannerZoomRendering() {
    const video = document.getElementById('barcode-scanner-video');
    const canvas = document.getElementById('barcode-scanner-canvas');

    // Cancel animation frame
    if (scannerZoomRenderLoop) {
        cancelAnimationFrame(scannerZoomRenderLoop);
        scannerZoomRenderLoop = null;
    }

    // Show video, hide canvas
    if (video) {
        video.classList.remove('zoomed');
    }
    if (canvas) {
        canvas.classList.remove('zoomed');
    }
}
