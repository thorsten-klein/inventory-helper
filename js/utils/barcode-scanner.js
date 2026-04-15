// Barcode Scanner Utilities for EAN input field

let eanBarcodeScanner = null;
let eanScannerStream = null;

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
    const canvas = document.getElementById('barcode-scanner-canvas');
    const scannerResult = document.getElementById('barcode-scanner-result');
    const scannerText = document.getElementById('barcode-scanner-text');

    // Reset result
    scannerResult.classList.add('hidden');
    scannerText.textContent = '';

    // Show modal
    showModal(scannerModal);

    try {
        // Initialize ZXing barcode reader
        const codeReader = new ZXing.BrowserMultiFormatReader();

        // Start scanning - let ZXing handle the camera stream
        const controls = await codeReader.decodeFromVideoDevice(undefined, video, (result, err) => {
            if (result) {
                const code = result.text;

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
            }

            if (err && !(err instanceof ZXing.NotFoundException)) {
                console.error('Scanning error:', err);
            }
        });

        // Store the reader and controls for cleanup
        eanBarcodeScanner = codeReader;
        eanScannerStream = controls;

    } catch (error) {
        console.error('Error accessing camera:', error);
        hideModal(scannerModal);
        throw error;
    }
}

function stopEanBarcodeScanning() {
    // Stop the barcode reader
    if (eanBarcodeScanner) {
        eanBarcodeScanner.reset();
        eanBarcodeScanner = null;
    }

    // Stop the video stream controls
    if (eanScannerStream && eanScannerStream.stop) {
        eanScannerStream.stop();
        eanScannerStream = null;
    }

    // Clear video source
    const video = document.getElementById('barcode-scanner-video');
    if (video) {
        video.srcObject = null;
    }
}
