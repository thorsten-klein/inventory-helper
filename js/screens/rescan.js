// Full Rescan Screen Controller

let rescanState = {
    scannedItems: [],
    currentCameraIndex: 0,
    availableCameras: [],
    scanner: null,
    lastScanTime: {} // Track last scan time per EAN
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
    const thShelf = document.getElementById('th-rescan-shelf');
    const thRow = document.getElementById('th-rescan-row');
    const thPos = document.getElementById('th-rescan-pos');
    const noItemsMessage = document.getElementById('no-items-scanned');
    const shelfOverlay = document.getElementById('rescan-shelf-overlay');
    const shelfOverlayText = document.getElementById('rescan-shelf-overlay-text');
    const btnManualEan = document.getElementById('btn-manual-ean');

    // Set labels
    modalTitle.textContent = t('rescanTitle');
    shelfLabel.textContent = t('rescanShelf');
    rowLabel.textContent = t('rescanRow');
    btnSwitchCamera.textContent = t('switchCamera');
    btnCancel.textContent = t('cancel');
    btnSave.textContent = t('rescanSave');
    scannedItemsTitle.textContent = t('scannedItems');
    thEan.textContent = t('rescanEan');
    thShelf.textContent = t('shelf');
    thRow.textContent = t('row');
    thPos.textContent = t('pos');
    noItemsMessage.textContent = t('noItemsScanned');
    shelfOverlayText.textContent = t('shelfRequired');
    btnManualEan.textContent = t('manual');

    // Reset state
    rescanState.scannedItems = [];
    rescanState.lastScanTime = {};
    shelfInput.value = '';
    rowInput.value = '1';

    // Populate shelf datalist with unique values from current items
    populateShelfDatalist();

    // Setup +/- buttons for row
    setupRescanRowButtons();

    showModal(modal);
    renderScannedItems();

    // Setup shelf input listener to toggle overlay
    setupShelfInputListener(shelfInput);

    // Check initial shelf state and update overlay
    updateShelfOverlay();

    // Initialize camera immediately
    initializeCamera();

    // Setup button handlers
    setupRescanButtons(btnCancel, btnSave, btnSwitchCamera);

    // Setup manual EAN button
    setupManualEanButton(btnManualEan);

    // Close on background click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeRescanModal();
        }
    });
}

function populateShelfDatalist() {
    const datalist = document.getElementById('rescan-shelf-list');
    if (!datalist) return;

    // Clear existing options
    datalist.innerHTML = '';

    // Get unique shelf values from current items
    const uniqueShelves = new Set();

    if (appState.items && appState.items.length > 0) {
        appState.items.forEach(item => {
            if (item.shelf && !item.removed) {
                uniqueShelves.add(item.shelf);
            }
        });
    }

    // Convert to array and sort
    const sortedShelves = Array.from(uniqueShelves).sort();

    // Add options to datalist
    sortedShelves.forEach(shelf => {
        const option = document.createElement('option');
        option.value = shelf;
        datalist.appendChild(option);
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

function setupShelfInputListener(shelfInput) {
    // Store initial shelf value to detect changes
    let previousShelfValue = shelfInput.value.trim();

    // Remove old event listener by cloning
    const newShelfInput = shelfInput.cloneNode(true);
    newShelfInput.value = shelfInput.value;
    shelfInput.parentNode.replaceChild(newShelfInput, shelfInput);

    newShelfInput.addEventListener('input', () => {
        const currentShelfValue = newShelfInput.value.trim();

        // If shelf value changed (and is not empty), reset row to 1
        if (currentShelfValue !== previousShelfValue && currentShelfValue !== '') {
            const rowInput = document.getElementById('rescan-row');
            if (rowInput) {
                rowInput.value = '1';
            }
        }

        previousShelfValue = currentShelfValue;
        updateShelfOverlay();
    });
}

function updateShelfOverlay() {
    const shelfInput = document.getElementById('rescan-shelf');
    const overlay = document.getElementById('rescan-shelf-overlay');

    const shelfValue = shelfInput.value.trim();

    if (shelfValue === '') {
        // Shelf is empty - show overlay
        overlay.classList.remove('hidden');
    } else {
        // Shelf has value - hide overlay
        overlay.classList.add('hidden');
    }
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

function setupManualEanButton(btnManualEan) {
    // Remove old event listener by cloning
    const newBtnManualEan = btnManualEan.cloneNode(true);
    newBtnManualEan.textContent = t('manual');
    btnManualEan.parentNode.replaceChild(newBtnManualEan, btnManualEan);

    newBtnManualEan.addEventListener('click', () => {
        promptManualEan();
    });
}

function promptManualEan() {
    const shelfInput = document.getElementById('rescan-shelf');
    const shelf = shelfInput.value.trim();

    if (!shelf) {
        alert(t('shelfRequired'));
        return;
    }

    const ean = prompt(t('enterEanManually'));

    if (ean && ean.trim()) {
        const trimmedEan = ean.trim();
        // Update last scan time to prevent immediate duplicate from camera
        rescanState.lastScanTime[trimmedEan] = Date.now();
        // Add the manually entered EAN
        addScannedItem(trimmedEan);
    }
}

function closeRescanModal() {
    const modal = document.getElementById('rescan-modal');
    stopCamera();
    hideModal(modal);
}

async function initializeCamera() {
    try {
        // Get list of available cameras using ZXing
        rescanState.availableCameras = await getVideoDevices();

        if (rescanState.availableCameras.length === 0) {
            alert('No camera found');
            return;
        }

        // Show/hide camera switch button based on number of cameras
        const btnSwitchCamera = document.getElementById('btn-switch-camera');
        if (btnSwitchCamera) {
            btnSwitchCamera.style.display = rescanState.availableCameras.length > 1 ? 'block' : 'none';
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
        // Stop any existing scanner
        stopCamera();

        // Get video element
        const video = document.getElementById('rescan-video');
        if (!video) {
            throw new Error('Video element not found');
        }

        // Start ZXing barcode scanning with the selected camera
        rescanState.scanner = await startZXingScanner(
            video,
            (code) => handleBarcodeDetected(code),
            { deviceId: deviceId }
        );
    } catch (error) {
        console.error('Error starting camera:', error);
        alert('Error starting camera: ' + error.message);
    }
}

function stopCamera() {
    if (rescanState.scanner && rescanState.scanner.stop) {
        rescanState.scanner.stop();
        rescanState.scanner = null;
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
    // Check if shelf is filled
    const shelfInput = document.getElementById('rescan-shelf');
    if (!shelfInput || shelfInput.value.trim() === '') {
        return; // Don't add items when shelf is empty
    }

    // Check if this EAN was scanned recently (within 3 seconds)
    const now = Date.now();
    const lastScanTime = rescanState.lastScanTime[code];

    if (lastScanTime && (now - lastScanTime) < 3000) {
        // Same EAN scanned within 3 seconds - ignore to avoid accidental double scans
        return;
    }

    // Update last scan time for this EAN
    rescanState.lastScanTime[code] = now;

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

    // Calculate position based on non-removed items in the same shelf and row
    const itemsInSameRow = rescanState.scannedItems.filter(item =>
        !item.removed && item.shelf === shelf && item.row === row
    );
    const position = itemsInSameRow.length + 1;

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

    // Filter out removed items for display
    const activeItems = rescanState.scannedItems.filter(item => !item.removed);

    if (activeItems.length === 0) {
        noItemsMessage.style.display = 'block';
        return;
    }

    noItemsMessage.style.display = 'none';

    // Find the last active item index in the original array
    let lastActiveIndex = -1;
    for (let i = rescanState.scannedItems.length - 1; i >= 0; i--) {
        if (!rescanState.scannedItems[i].removed) {
            lastActiveIndex = i;
            break;
        }
    }

    rescanState.scannedItems.forEach((item, index) => {
        if (item.removed) return; // Skip removed items

        const row = document.createElement('tr');
        if (index === lastActiveIndex) {
            row.classList.add('last-scanned');
        }

        row.innerHTML = `
            <td>${item.ean}</td>
            <td>${item.shelf}</td>
            <td>${item.row}</td>
            <td>${item.position}</td>
            <td>
                ${index === lastActiveIndex ? `
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
    // Mark item as removed instead of deleting it
    rescanState.scannedItems[index].removed = true;

    // Recalculate positions based on shelf and row grouping (only for non-removed items)
    const positionCounters = {};
    rescanState.scannedItems.forEach((item) => {
        if (item.removed) return; // Skip removed items

        const key = `${item.shelf}|${item.row}`;
        if (!positionCounters[key]) {
            positionCounters[key] = 0;
        }
        positionCounters[key]++;
        item.position = positionCounters[key];
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
    // Check if there are any non-removed items
    const activeItems = rescanState.scannedItems.filter(item => !item.removed);
    if (activeItems.length === 0) {
        alert(t('noItemsScanned'));
        return;
    }

    // Get the set of scanned EANs
    const scannedEans = new Set(rescanState.scannedItems.map(item => item.ean));

    // Create new items from scanned data (including removed items)
    const newItems = rescanState.scannedItems.map((scannedItem, index) => {
        // Try to find existing item by EAN in uploadedData (original XLSX data for current category)
        let existingItem = null;

        if (appState.uploadedData && Array.isArray(appState.uploadedData)) {
            existingItem = appState.uploadedData.find(item =>
                item.ean === scannedItem.ean && item.category === appState.selectedCategory
            );
        }

        if (!existingItem && appState.items && Array.isArray(appState.items)) {
            existingItem = appState.items.find(item => item.ean === scannedItem.ean);
        }

        // Determine if this is a truly new item (not in uploadedData or current items)
        const isTrulyNew = !existingItem;

        console.log('Rescan item:', scannedItem.ean, 'existingItem:', existingItem, 'isTrulyNew:', isTrulyNew);

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
            removed: scannedItem.removed || false, // Mark as removed if flagged
            isNewItem: isTrulyNew, // Explicit flag for new items
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

    // Find items from original list that were NOT scanned
    const originalItems = appState.items || [];
    const notScannedItems = originalItems.filter(item => !scannedEans.has(item.ean));

    // Add not-scanned items as removed
    notScannedItems.forEach((item, index) => {
        newItems.push({
            id: item.id,
            category: item.category || appState.selectedCategory,
            ean: item.ean,
            shelf: item.shelf,
            row: item.row,
            position: item.position,
            article: item.article || '',
            stock: item.stock || 0,
            locked: false,
            removed: true, // Mark as removed since it wasn't scanned
            // Store original values
            originalShelf: item.originalShelf || item.shelf,
            originalRow: item.originalRow || item.row,
            originalPosition: item.originalPosition || item.position,
            // Store raw row for details
            _rawRow: item._rawRow || [],
            _rowIndex: item._rowIndex !== undefined ? item._rowIndex : -1
        });
    });

    // Replace current items with rescanned items (including removed ones)
    setItems(newItems);

    // Close modal
    closeRescanModal();

    // Re-render editor screen
    renderEditorScreen();
}
