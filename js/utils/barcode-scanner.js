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

function initEanBarcodeScanner() {
    const btnScanBarcode = document.getElementById('btn-scan-barcode');
    const scannerModal = document.getElementById('barcode-scanner-modal');
    const btnCloseScanner = document.getElementById('btn-close-scanner');
    const scannerTitle = document.getElementById('barcode-scanner-title');
    const video = document.getElementById('barcode-scanner-video');
    const scannerResult = document.getElementById('barcode-scanner-result');
    const scannerText = document.getElementById('barcode-scanner-text');

    if (!btnScanBarcode) return;

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

    // Close on background click
    const closeOnBackground = (e) => {
        if (e.target === scannerModal) {
            stopEanBarcodeScanning();
            hideModal(scannerModal);
        }
    };
    scannerModal.addEventListener('click', closeOnBackground);
}

async function startEanBarcodeScanning() {
    const scannerModal = document.getElementById('barcode-scanner-modal');
    const video = document.getElementById('barcode-scanner-video');
    const scannerResult = document.getElementById('barcode-scanner-result');
    const scannerText = document.getElementById('barcode-scanner-text');

    // Reset result
    scannerResult.classList.add('hidden');
    scannerText.textContent = '';

    // Show modal
    showModal(scannerModal);

    try {
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
        });

        // Store the scanner for cleanup
        eanBarcodeScanner = scanner;

    } catch (error) {
        console.error('Error accessing camera:', error);
        hideModal(scannerModal);
        throw error;
    }
}

function stopEanBarcodeScanning() {
    // Stop the scanner
    if (eanBarcodeScanner && eanBarcodeScanner.stop) {
        eanBarcodeScanner.stop();
        eanBarcodeScanner = null;
    }
}
