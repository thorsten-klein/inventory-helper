// Full Rescan Screen Controller

let rescanState = {
    scannedItems: [],
    currentCameraIndex: 0,
    availableCameras: [],
    isScanning: false,
    lastScannedCode: null,
    lastScanTime: 0
};

function showRescanModal() {
    const modal = document.getElementById('rescan-modal');
    const modalTitle = document.getElementById('rescan-modal-title');
    const shelfInput = document.getElementById('rescan-shelf');
    const rowInput = document.getElementById('rescan-row');
    const shelfLabel = document.getElementById('rescan-shelf-label');
    const rowLabel = document.getElementById('rescan-row-label');
    const btnSwitchCamera = document.getElementById('btn-switch-camera');
    const btnCancel = document.getElementById('btn-cancel-rescan');
    const btnSave = document.getElementById('btn-save-rescan');
    const scannedItemsTitle = document.getElementById('scanned-items-title');
    const thEan = document.getElementById('th-rescan-ean');
    const thRow = document.getElementById('th-rescan-row');
    const thPos = document.getElementById('th-rescan-pos');
    const noItemsMessage = document.getElementById('no-items-scanned');

    // Set labels
    modalTitle.textContent = t('rescanTitle');
    shelfLabel.textContent = t('rescanShelf');
    rowLabel.textContent = t('rescanRow');
    btnSwitchCamera.textContent = t('switchCamera');
    btnCancel.textContent = t('cancel');
    btnSave.textContent = t('rescanSave');
    scannedItemsTitle.textContent = t('scannedItems');
    thEan.textContent = t('rescanEan');
    thRow.textContent = t('row');
    thPos.textContent = t('pos');
    noItemsMessage.textContent = t('noItemsScanned');

    // Reset state
    rescanState.scannedItems = [];
    shelfInput.value = '';
    rowInput.value = '1';

    // Setup +/- buttons for row
    setupRescanRowButtons();

    showModal(modal);
    renderScannedItems();

    // Initialize camera
    initializeCamera();

    // Setup button handlers
    setupRescanButtons(btnCancel, btnSave, btnSwitchCamera);

    // Close on background click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeRescanModal();
        }
    });
}

function setupRescanRowButtons() {
    const btnRowMinus = document.getElementById('btn-rescan-row-minus');
    const btnRowPlus = document.getElementById('btn-rescan-row-plus');
    const rowInput = document.getElementById('rescan-row');

    // Remove old event listeners by cloning
    const newBtnRowMinus = btnRowMinus.cloneNode(true);
    const newBtnRowPlus = btnRowPlus.cloneNode(true);
    btnRowMinus.parentNode.replaceChild(newBtnRowMinus, btnRowMinus);
    btnRowPlus.parentNode.replaceChild(newBtnRowPlus, btnRowPlus);

    newBtnRowMinus.addEventListener('click', () => {
        const currentValue = parseInt(rowInput.value) || 1;
        if (currentValue > 1) {
            rowInput.value = currentValue - 1;
        }
    });

    newBtnRowPlus.addEventListener('click', () => {
        const currentValue = parseInt(rowInput.value) || 1;
        rowInput.value = currentValue + 1;
    });
}

function setupRescanButtons(btnCancel, btnSave, btnSwitchCamera) {
    // Remove old event listeners by cloning
    const newBtnCancel = btnCancel.cloneNode(true);
    const newBtnSave = btnSave.cloneNode(true);
    const newBtnSwitchCamera = btnSwitchCamera.cloneNode(true);
    newBtnCancel.textContent = t('cancel');
    newBtnSave.textContent = t('rescanSave');
    newBtnSwitchCamera.textContent = t('switchCamera');
    btnCancel.parentNode.replaceChild(newBtnCancel, btnCancel);
    btnSave.parentNode.replaceChild(newBtnSave, btnSave);
    btnSwitchCamera.parentNode.replaceChild(newBtnSwitchCamera, btnSwitchCamera);

    newBtnCancel.addEventListener('click', () => {
        closeRescanModal();
    });

    newBtnSave.addEventListener('click', () => {
        saveRescan();
    });

    newBtnSwitchCamera.addEventListener('click', () => {
        switchCamera();
    });
}

function closeRescanModal() {
    const modal = document.getElementById('rescan-modal');
    stopCamera();
    hideModal(modal);
}

async function initializeCamera() {
    try {
        // Get list of available cameras
        const devices = await navigator.mediaDevices.enumerateDevices();
        rescanState.availableCameras = devices.filter(device => device.kind === 'videoinput');

        if (rescanState.availableCameras.length === 0) {
            alert('No camera found');
            return;
        }

        // Start with the first camera (usually back camera on mobile)
        rescanState.currentCameraIndex = 0;
        await startCamera();
    } catch (error) {
        console.error('Error initializing camera:', error);
        alert('Error accessing camera: ' + error.message);
    }
}

async function startCamera() {
    const deviceId = rescanState.availableCameras[rescanState.currentCameraIndex].deviceId;

    try {
        // Stop any existing Quagga instance
        if (rescanState.isScanning) {
            Quagga.stop();
            rescanState.isScanning = false;
        }

        // Start barcode scanning with the selected camera
        startBarcodeScanning(deviceId);
    } catch (error) {
        console.error('Error starting camera:', error);
        alert('Error starting camera: ' + error.message);
    }
}

function startBarcodeScanning(deviceId) {
    if (rescanState.isScanning) {
        Quagga.stop();
    }

    const constraints = {
        width: { min: 640 },
        height: { min: 480 },
        aspectRatio: { min: 1, max: 2 }
    };

    if (deviceId) {
        constraints.deviceId = { exact: deviceId };
    } else {
        constraints.facingMode = "environment";
    }

    Quagga.init({
        inputStream: {
            name: "Live",
            type: "LiveStream",
            target: document.querySelector('#rescan-camera-container'),
            constraints: constraints
        },
        decoder: {
            readers: [
                "ean_reader",
                "ean_8_reader",
                "code_128_reader",
                "code_39_reader",
                "upc_reader",
                "upc_e_reader"
            ],
            debug: {
                drawBoundingBox: true,
                showFrequency: false,
                drawScanline: true,
                showPattern: false
            }
        },
        locator: {
            patchSize: "medium",
            halfSample: true
        },
        locate: true,
        frequency: 10
    }, (err) => {
        if (err) {
            console.error('QuaggaJS initialization error:', err);
            return;
        }
        Quagga.start();
        rescanState.isScanning = true;
    });

    Quagga.onDetected((data) => {
        handleBarcodeDetected(data.codeResult.code);
    });
}

function stopCamera() {
    if (rescanState.isScanning) {
        Quagga.stop();
        rescanState.isScanning = false;
    }
}

async function switchCamera() {
    if (rescanState.availableCameras.length <= 1) {
        return;
    }

    rescanState.currentCameraIndex = (rescanState.currentCameraIndex + 1) % rescanState.availableCameras.length;
    await startCamera();
}

function handleBarcodeDetected(code) {
    const now = Date.now();

    // Debounce: ignore same code within 2 seconds
    if (code === rescanState.lastScannedCode && (now - rescanState.lastScanTime) < 2000) {
        return;
    }

    rescanState.lastScannedCode = code;
    rescanState.lastScanTime = now;

    // Add to scanned items
    addScannedItem(code);
}

function addScannedItem(ean) {
    const rowInput = document.getElementById('rescan-row');
    const shelfInput = document.getElementById('rescan-shelf');

    const shelf = shelfInput.value.trim();
    const row = parseInt(rowInput.value) || 1;

    if (!shelf) {
        alert(t('shelfRequired'));
        return;
    }

    // Calculate position (auto-increment)
    const position = rescanState.scannedItems.length + 1;

    const scannedItem = {
        ean: ean,
        shelf: shelf,
        row: row,
        position: position
    };

    rescanState.scannedItems.push(scannedItem);

    // Play a beep sound (optional)
    playBeep();

    // Render the list
    renderScannedItems();

    // Scroll to bottom
    scrollToLastScannedItem();
}

function playBeep() {
    // Create a simple beep sound
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800;
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
}

function renderScannedItems() {
    const tbody = document.getElementById('scanned-items-tbody');
    const noItemsMessage = document.getElementById('no-items-scanned');

    tbody.innerHTML = '';

    if (rescanState.scannedItems.length === 0) {
        noItemsMessage.style.display = 'block';
        return;
    }

    noItemsMessage.style.display = 'none';

    rescanState.scannedItems.forEach((item, index) => {
        const row = document.createElement('tr');
        if (index === rescanState.scannedItems.length - 1) {
            row.classList.add('last-scanned');
        }

        row.innerHTML = `
            <td>${item.ean}</td>
            <td>${item.row}</td>
            <td>${item.position}</td>
            <td>
                ${index === rescanState.scannedItems.length - 1 ? `
                    <button class="btn-remove-scan" data-index="${index}">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            <line x1="10" y1="11" x2="10" y2="17"></line>
                            <line x1="14" y1="11" x2="14" y2="17"></line>
                        </svg>
                    </button>
                ` : ''}
            </td>
        `;

        tbody.appendChild(row);
    });

    // Add event listeners to remove buttons
    document.querySelectorAll('.btn-remove-scan').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.currentTarget.dataset.index);
            removeScannedItem(index);
        });
    });
}

function removeScannedItem(index) {
    rescanState.scannedItems.splice(index, 1);

    // Recalculate positions
    rescanState.scannedItems.forEach((item, idx) => {
        item.position = idx + 1;
    });

    renderScannedItems();
}

function scrollToLastScannedItem() {
    const wrapper = document.querySelector('.scanned-items-table-wrapper');
    if (wrapper) {
        wrapper.scrollTop = wrapper.scrollHeight;
    }
}

function saveRescan() {
    if (rescanState.scannedItems.length === 0) {
        alert(t('noItemsScanned'));
        return;
    }

    // Create new items from scanned data
    const newItems = rescanState.scannedItems.map((scannedItem, index) => {
        // Try to find existing item by EAN
        let existingItem = appState.uploadedData.find(item => item.ean === scannedItem.ean);

        if (!existingItem) {
            existingItem = appState.items.find(item => item.ean === scannedItem.ean);
        }

        // Create new item with scanned position data
        const newItem = {
            id: existingItem ? existingItem.id : `item-rescan-${Date.now()}-${index}`,
            category: appState.selectedCategory,
            ean: scannedItem.ean,
            shelf: scannedItem.shelf,
            row: scannedItem.row,
            position: scannedItem.position,
            article: existingItem ? existingItem.article : '',
            stock: existingItem ? existingItem.stock : 0,
            locked: false,
            // Store original values
            originalShelf: existingItem ? existingItem.originalShelf || existingItem.shelf : scannedItem.shelf,
            originalRow: existingItem ? existingItem.originalRow || existingItem.row : scannedItem.row,
            originalPosition: existingItem ? existingItem.originalPosition || existingItem.position : scannedItem.position,
            // Store raw row for details
            _rawRow: existingItem ? existingItem._rawRow : [],
            _rowIndex: existingItem ? existingItem._rowIndex : -1
        };

        return newItem;
    });

    // Replace current items with rescanned items
    setItems(newItems);

    // Close modal
    closeRescanModal();

    // Re-render editor screen
    renderEditorScreen();

    // Show success message
    alert(t('rescanApplied'));
}
