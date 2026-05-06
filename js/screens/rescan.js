// Full Rescan Screen Controller

let rescanState = {
    scannedItems: [],
    currentCameraIndex: 0,
    availableCameras: [],
    scanner: null,
    lastScanTime: {}, // Track last scan time per EAN
    rowRescanMode: false, // Flag for row-specific rescan
    targetShelf: null, // Target shelf for row rescan
    targetRow: null, // Target row for row rescan
    currentZoomLevel: 1.0, // Current zoom level
    currentVideoTrack: null, // Current video track for zoom
    zoomRenderLoop: null // Animation frame ID for zoom rendering
};

function showRescanModal(prefilledShelf = null, prefilledRow = null, rowRescanMode = false) {
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
    const btnZoomIn = document.getElementById('btn-rescan-zoom-in');
    const btnZoomOut = document.getElementById('btn-rescan-zoom-out');
    const zoomLevelDisplay = document.getElementById('rescan-zoom-level-display');

    // Load saved zoom level from localStorage
    const savedZoom = localStorage.getItem('rescanZoomLevel');
    if (savedZoom !== null) {
        rescanState.currentZoomLevel = parseFloat(savedZoom);
        if (isNaN(rescanState.currentZoomLevel) || rescanState.currentZoomLevel < 1.0) {
            rescanState.currentZoomLevel = 1.0;
        }
    }

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
    rescanState.rowRescanMode = rowRescanMode;
    rescanState.targetShelf = prefilledShelf;
    rescanState.targetRow = prefilledRow;

    shelfInput.value = prefilledShelf || '';
    rowInput.value = prefilledRow || '1';

    // Disable shelf and row inputs if in row rescan mode
    if (rowRescanMode) {
        shelfInput.disabled = true;
        rowInput.disabled = true;
    } else {
        shelfInput.disabled = false;
        rowInput.disabled = false;
    }

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

    // Setup zoom controls
    setupRescanZoomControls(btnZoomIn, btnZoomOut, zoomLevelDisplay);

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

    // Set switch camera button as icon (circular arrows for camera flip)
    newBtnSwitchCamera.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="23 4 23 10 17 10"></polyline>
            <polyline points="1 20 1 14 7 14"></polyline>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
        </svg>
    `;
    newBtnSwitchCamera.title = t('switchCamera');

    btnCancel.parentNode.replaceChild(newBtnCancel, btnCancel);
    btnSave.parentNode.replaceChild(newBtnSave, btnSave);
    btnSwitchCamera.parentNode.replaceChild(newBtnSwitchCamera, btnSwitchCamera);

    newBtnCancel.addEventListener('click', () => {
        closeRescanModal();
    });

    newBtnSave.addEventListener('click', () => {
        if (rescanState.rowRescanMode) {
            saveRowRescan();
        } else {
            saveRescan();
        }
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

    showManualEanModal();
}

function showManualEanModal() {
    const modal = document.getElementById('manual-ean-modal');
    const modalTitle = document.getElementById('manual-ean-modal-title');
    const eanInput = document.getElementById('manual-ean-input');
    const eanLabel = document.getElementById('manual-ean-label');
    const btnCancel = document.getElementById('btn-cancel-manual-ean');
    const btnSave = document.getElementById('btn-save-manual-ean');

    // Set labels
    modalTitle.textContent = t('manualEanTitle');
    eanLabel.textContent = t('manualEanLabel');
    eanInput.placeholder = t('manualEanPlaceholder');
    btnCancel.textContent = t('cancel');
    btnSave.textContent = 'OK';

    // Clear input
    eanInput.value = '';

    showModal(modal);

    // Focus on input
    setTimeout(() => eanInput.focus(), 100);

    // Remove old event listeners by cloning
    const newBtnCancel = btnCancel.cloneNode(true);
    const newBtnSave = btnSave.cloneNode(true);
    newBtnCancel.textContent = t('cancel');
    newBtnSave.textContent = 'OK';
    btnCancel.parentNode.replaceChild(newBtnCancel, btnCancel);
    btnSave.parentNode.replaceChild(newBtnSave, btnSave);

    // Cancel button
    newBtnCancel.addEventListener('click', () => {
        hideModal(modal);
    });

    // Save button
    newBtnSave.addEventListener('click', () => {
        const input = document.getElementById('manual-ean-input').value;
        const lines = input.split('\n').map(line => line.trim()).filter(line => line.length > 0);

        if (lines.length === 0) {
            hideModal(modal);
            return;
        }

        // Add each line as a separate item
        lines.forEach(ean => {
            // Update last scan time to prevent immediate duplicate from camera
            rescanState.lastScanTime[ean] = Date.now();
            addScannedItem(ean);
        });

        hideModal(modal);
    });

    // Close on background click
    modal.onclick = (e) => {
        if (e.target === modal) {
            hideModal(modal);
        }
    };
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

        // Use saved camera index from localStorage
        const savedIndex = localStorage.getItem('preferredCameraIndex');
        rescanState.currentCameraIndex = savedIndex !== null ? parseInt(savedIndex) : 0;
        // Ensure index is within bounds
        if (rescanState.currentCameraIndex >= rescanState.availableCameras.length) {
            rescanState.currentCameraIndex = 0;
        }

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

        // Start canvas rendering immediately (no delay)
        applyRescanSavedZoom();
    } catch (error) {
        console.error('Error starting camera:', error);
        alert('Error starting camera: ' + error.message);
    }
}

function stopCamera() {
    // Stop zoom rendering
    stopRescanZoomRendering();

    // Stop scanner
    if (rescanState.scanner && rescanState.scanner.stop) {
        rescanState.scanner.stop();
        rescanState.scanner = null;
    }
    rescanState.currentVideoTrack = null;
}

async function switchCamera() {
    if (rescanState.availableCameras.length <= 1) {
        return;
    }

    rescanState.currentCameraIndex = (rescanState.currentCameraIndex + 1) % rescanState.availableCameras.length;

    // Save camera preference
    localStorage.setItem('preferredCameraIndex', rescanState.currentCameraIndex);

    await startCamera();
}

function handleBarcodeDetected(code) {
    // Only accept valid EAN-13 codes with correct checksum
    if (!isValidEAN13(code)) {
        return; // Invalid EAN-13, ignore
    }

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
        // Use requestAnimationFrame to ensure DOM has updated before scrolling
        requestAnimationFrame(() => {
            // Scroll to bottom smoothly
            wrapper.scrollTo({
                top: wrapper.scrollHeight,
                behavior: 'smooth'
            });
        });
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

function saveRowRescan() {
    // Check if there are any non-removed items
    const activeItems = rescanState.scannedItems.filter(item => !item.removed);
    if (activeItems.length === 0) {
        alert(t('noItemsScanned'));
        return;
    }

    const targetShelf = rescanState.targetShelf;
    const targetRow = rescanState.targetRow;

    // Get the set of scanned EANs
    const scannedEans = new Set(rescanState.scannedItems.map(item => item.ean));

    // Create new items from scanned data
    const newScannedItems = rescanState.scannedItems.map((scannedItem, index) => {
        // Try to find existing item by EAN in uploadedData
        let existingItem = null;

        if (appState.uploadedData && Array.isArray(appState.uploadedData)) {
            existingItem = appState.uploadedData.find(item =>
                item.ean === scannedItem.ean && item.category === appState.selectedCategory
            );
        }

        if (!existingItem && appState.items && Array.isArray(appState.items)) {
            existingItem = appState.items.find(item => item.ean === scannedItem.ean);
        }

        // Determine if this is a truly new item
        const isTrulyNew = !existingItem;

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
            removed: scannedItem.removed || false,
            isNewItem: isTrulyNew,
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

    // Get all current items
    const currentItems = appState.items || [];

    // Keep items from other rows/shelves
    const itemsToKeep = currentItems.filter(item =>
        item.shelf !== targetShelf || item.row !== targetRow
    );

    // Find items from target row that were NOT scanned - mark as removed
    const targetRowItems = currentItems.filter(item =>
        item.shelf === targetShelf && item.row === targetRow
    );

    const notScannedInRow = targetRowItems.filter(item => !scannedEans.has(item.ean));

    // Mark not-scanned items as removed
    const removedItems = notScannedInRow.map(item => ({
        ...item,
        removed: true
    }));

    // Combine: kept items + new scanned items + removed items
    const allItems = [...itemsToKeep, ...newScannedItems, ...removedItems];

    // Replace current items
    setItems(allItems);

    // Close modal
    closeRescanModal();

    // Re-render editor screen
    renderEditorScreen();
}

function showRescanModalForRow(shelf, row) {
    showRescanModal(shelf, row, true);
}

function setupRescanZoomControls(btnZoomIn, btnZoomOut, zoomLevelDisplay) {
    if (!btnZoomIn || !btnZoomOut || !zoomLevelDisplay) {
        return;
    }

    // Update zoom display
    updateRescanZoomDisplay();

    // Remove old event listeners by cloning
    const newBtnZoomIn = btnZoomIn.cloneNode(true);
    newBtnZoomIn.innerHTML = btnZoomIn.innerHTML;
    newBtnZoomIn.title = 'Zoom In';
    btnZoomIn.parentNode.replaceChild(newBtnZoomIn, btnZoomIn);

    const newBtnZoomOut = btnZoomOut.cloneNode(true);
    newBtnZoomOut.innerHTML = btnZoomOut.innerHTML;
    newBtnZoomOut.title = 'Zoom Out';
    btnZoomOut.parentNode.replaceChild(newBtnZoomOut, btnZoomOut);

    newBtnZoomIn.addEventListener('click', () => {
        adjustRescanZoom(0.5);
    });

    newBtnZoomOut.addEventListener('click', () => {
        adjustRescanZoom(-0.5);
    });
}

/**
 * Adjust rescan camera zoom level
 * @param {number} delta - Change in zoom level (e.g., 0.5 or -0.5)
 */
async function adjustRescanZoom(delta) {
    // Calculate new zoom level
    const newZoom = Math.round((rescanState.currentZoomLevel + delta) * 10) / 10; // Round to 1 decimal place

    // Constrain zoom level to minimum 1.0
    if (newZoom < 1.0) {
        return;
    }

    // Update current zoom level
    rescanState.currentZoomLevel = newZoom;

    // Save to localStorage
    localStorage.setItem('rescanZoomLevel', rescanState.currentZoomLevel.toString());

    // Update UI
    updateRescanZoomDisplay();

    // Always use canvas rendering for 2:1 crop (even at 1.0x zoom)
    startRescanZoomRendering();
}

/**
 * Update the rescan zoom level display and button states
 */
function updateRescanZoomDisplay() {
    const zoomLevelDisplay = document.getElementById('rescan-zoom-level-display');
    const btnZoomOut = document.getElementById('btn-rescan-zoom-out');

    if (zoomLevelDisplay) {
        zoomLevelDisplay.textContent = `${rescanState.currentZoomLevel.toFixed(1)}x`;
    }

    if (btnZoomOut) {
        // Disable zoom out button if at minimum zoom
        btnZoomOut.disabled = rescanState.currentZoomLevel <= 1.0;
    }
}

/**
 * Apply saved zoom level to the current rescan video track
 */
async function applyRescanSavedZoom() {
    // Update UI
    updateRescanZoomDisplay();

    // Always start rendering for 2:1 crop (even at 1.0x zoom)
    startRescanZoomRendering();
}

/**
 * Start rendering zoomed video to canvas
 */
function startRescanZoomRendering() {
    const video = document.getElementById('rescan-video');
    const canvas = document.getElementById('rescan-canvas');

    if (!video || !canvas) {
        return;
    }

    // Stop any existing render loop
    stopRescanZoomRendering();

    // Show canvas, hide video
    video.classList.add('zoomed');
    canvas.classList.add('zoomed');

    // Set up canvas rendering
    const ctx = canvas.getContext('2d');

    function render() {
        if (video.readyState === video.HAVE_ENOUGH_DATA) {
            const zoom = rescanState.currentZoomLevel;

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

        rescanState.zoomRenderLoop = requestAnimationFrame(render);
    }

    render();
}

/**
 * Stop rendering zoomed video
 */
function stopRescanZoomRendering() {
    const video = document.getElementById('rescan-video');
    const canvas = document.getElementById('rescan-canvas');

    // Cancel animation frame
    if (rescanState.zoomRenderLoop) {
        cancelAnimationFrame(rescanState.zoomRenderLoop);
        rescanState.zoomRenderLoop = null;
    }

    // Show video, hide canvas
    if (video) {
        video.classList.remove('zoomed');
    }
    if (canvas) {
        canvas.classList.remove('zoomed');
    }
}
