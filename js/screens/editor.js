// List Editor Screen Controller

let autoScrollInterval = null;
let touchDragState = {
    isDragging: false,
    draggedCard: null,
    draggedIndex: null,
    touchIdentifier: null,
    clone: null,
    longPressTimer: null,
    startX: 0,
    startY: 0
};
let undoState = {
    timer: null,
    itemIndex: null,
    previousState: null
};
let historyState = {
    history: [],
    currentIndex: -1,
    maxHistory: 50
};

function renderEditorScreen() {
    const categoryName = document.getElementById('editor-category-name');
    const itemsList = document.getElementById('items-list');
    const actionButtons = document.getElementById('action-buttons');
    const btnAddItem = document.getElementById('btn-add-item');
    const btnBackCategory = document.getElementById('btn-back-category');
    const btnEditItem = document.getElementById('btn-edit-item');
    const btnStartReview = document.getElementById('btn-start-review');
    const btnSpeechSettings = document.getElementById('btn-editor-speech-settings');
    const btnFullRescan = document.getElementById('btn-full-rescan');
    const btnUndo = document.getElementById('btn-undo');
    const btnRedo = document.getElementById('btn-redo');

    // Hide action buttons (Row +/-, Pos +/- removed, using drag & drop instead)
    actionButtons.style.display = 'none';

    // Set category name with screen label
    categoryName.textContent = `${t('ordering')}: ${appState.selectedCategory}`;

    // Update button text
    btnBackCategory.textContent = t('back');
    btnEditItem.textContent = t('edit');
    btnStartReview.textContent = t('next');
    btnUndo.title = t('undoAction');
    btnRedo.title = t('redoAction');

    // Initialize history with current state
    saveHistoryState(true);

    // Render items
    renderItemsList();

    // Update undo/redo buttons
    updateUndoRedoButtons();

    // Undo button
    btnUndo.onclick = () => {
        performUndoAction();
    };

    // Redo button
    btnRedo.onclick = () => {
        performRedoAction();
    };

    // Speech settings button
    btnSpeechSettings.onclick = () => {
        showEditorSpeechModal();
    };

    // Update speech button state
    updateSpeechButtonState();

    // Full Rescan button
    btnFullRescan.title = t('fullRescan');
    btnFullRescan.onclick = () => {
        showRescanModal();
    };

    // Add item button - show type selection modal
    btnAddItem.onclick = () => {
        showAddTypeModal();
    };

    // Back button
    btnBackCategory.onclick = () => {
        // Reset review state when going back to category selection
        appState.reviewInProgress = false;
        appState.currentReviewIndex = 0;
        appState.currentReviewItemId = null;
        appState.reviewItems = [];

        showScreen('category');
        initCategoryScreen();
    };

    // Edit button
    btnEditItem.onclick = () => {
        const item = getSelectedItem();
        if (!item) return;

        showEditModal(item, false);
    };

    // Start Review button
    btnStartReview.onclick = () => {
        if (appState.items.length === 0) {
            alert(t('noItemsToReview'));
            return;
        }

        // Filter out removed items for review
        appState.reviewItems = appState.items.filter(item => !item.removed);

        if (appState.reviewItems.length === 0) {
            alert(t('noItemsToReview'));
            return;
        }

        // Initialize stock counts only if not already in progress
        if (!appState.reviewInProgress) {
            appState.items.forEach(item => {
                // Only initialize if stock count doesn't exist yet
                if (!getStockCount(item.id)) {
                    // Removed items should have stock count of 0
                    const stockCount = item.removed ? 0 : item.stock;
                    setStockCount(item.id, stockCount, item.stock);
                }
            });
            appState.currentReviewIndex = 0;
            appState.currentReviewItemId = null;
        } else if (appState.currentReviewItemId) {
            // If returning from editor, find the item by ID and restore position in reviewItems
            const itemIndex = appState.reviewItems.findIndex(item => item.id === appState.currentReviewItemId);
            if (itemIndex !== -1) {
                appState.currentReviewIndex = itemIndex;
            }
            // Initialize stock counts for any new items added during editing
            appState.items.forEach(item => {
                if (!getStockCount(item.id)) {
                    // Removed items should have stock count of 0
                    const stockCount = item.removed ? 0 : item.stock;
                    setStockCount(item.id, stockCount, item.stock);
                }
            });
        }

        // Mark review as in progress
        appState.reviewInProgress = true;

        showScreen('review');
        renderReviewScreen();
    };

    // Initialize edit button state
    updateActionButtons();
}

function renderItemsList() {
    const itemsList = document.getElementById('items-list');
    itemsList.innerHTML = '';

    // Separate removed and active items
    const activeItems = appState.items.filter(item => !item.removed);
    const removedItems = appState.items.filter(item => item.removed);

    // Group active items by shelf
    const groups = groupItemsByShelf(activeItems);

    // Get all shelves (including custom shelves with no items)
    const allShelves = getUniqueShelves();

    // Display active items organized by shelf and row
    allShelves.forEach(shelf => {
        // Add shelf header
        const shelfHeader = document.createElement('div');
        shelfHeader.className = 'shelf-header';

        const shelfTitle = document.createElement('span');
        shelfTitle.textContent = `${t('shelfHeader')} "${shelf}"`;
        shelfHeader.appendChild(shelfTitle);

        // Add delete button for empty shelves
        const isEmpty = !groups[shelf] || groups[shelf].length === 0;
        if (isEmpty) {
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'shelf-delete-btn';
            deleteBtn.innerHTML = `
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    <line x1="10" y1="11" x2="10" y2="17"></line>
                    <line x1="14" y1="11" x2="14" y2="17"></line>
                </svg>
            `;
            deleteBtn.onclick = (e) => {
                e.stopPropagation();
                deleteShelf(shelf);
            };
            shelfHeader.appendChild(deleteBtn);
        }

        itemsList.appendChild(shelfHeader);

        // Add items for this shelf (if any)
        if (groups[shelf]) {
            const shelfItems = sortItems(groups[shelf]);

            // Group items by row within this shelf
            const rowGroups = {};
            shelfItems.forEach(item => {
                const row = item.row || 0;
                if (!rowGroups[row]) {
                    rowGroups[row] = [];
                }
                rowGroups[row].push(item);
            });

            // Sort rows numerically
            const sortedRows = Object.keys(rowGroups).sort((a, b) => parseInt(a) - parseInt(b));

            // Display each row with its header
            sortedRows.forEach(row => {
                // Add row header with rescan button
                const rowHeader = document.createElement('div');
                rowHeader.className = 'row-header';

                const rowText = document.createElement('span');
                rowText.textContent = `${t('row')} ${row}`;
                rowHeader.appendChild(rowText);

                const rescanBtn = document.createElement('button');
                rescanBtn.className = 'row-rescan-btn';
                rescanBtn.innerHTML = `
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M3 7V5a2 2 0 0 1 2-2h2"></path>
                        <path d="M17 3h2a2 2 0 0 1 2 2v2"></path>
                        <path d="M21 17v2a2 2 0 0 1-2 2h-2"></path>
                        <path d="M7 21H5a2 2 0 0 1-2-2v-2"></path>
                        <rect x="7" y="7" width="10" height="10" rx="1"></rect>
                    </svg>
                    <span>${t('rescanRowButton')}</span>
                `;
                rescanBtn.onclick = () => {
                    showRescanModalForRow(shelf, parseInt(row));
                };
                rowHeader.appendChild(rescanBtn);

                itemsList.appendChild(rowHeader);

                // Add items for this row
                rowGroups[row].forEach(item => {
                    const itemIndex = appState.items.findIndex(i => i.id === item.id);
                    const itemCard = createItemCard(item, itemIndex);
                    itemsList.appendChild(itemCard);
                });
            });
        }
        // If no items, shelf header is shown with no items under it
    });

    // Display removed items in a separate section
    if (removedItems.length > 0) {
        const deletedHeader = document.createElement('div');
        deletedHeader.className = 'shelf-header deleted-header';
        deletedHeader.textContent = t('deletedItems');
        itemsList.appendChild(deletedHeader);

        removedItems.forEach(item => {
            const itemIndex = appState.items.findIndex(i => i.id === item.id);
            const itemCard = createItemCard(item, itemIndex);
            itemsList.appendChild(itemCard);
        });
    }
}

function createItemCard(item, index) {
    const card = document.createElement('div');
    card.className = 'item-card';
    card.draggable = true;
    card.dataset.itemId = item.id;
    card.dataset.itemIndex = index;

    if (index === appState.selectedItemIndex) {
        card.classList.add('selected');
    }
    if (item.locked) {
        card.classList.add('locked');
    }
    if (item.removed) {
        card.classList.add('removed');
    }

    // Remove leading zeros from article number
    const articleDisplay = item.article ? String(item.article).replace(/^0+/, '') || '0' : '-';

    // Display logic for removed items vs. moved items
    let shelfDisplay, rowDisplay, posDisplay;

    if (item.removed) {
        // Removed items show "-" with original value in parentheses
        shelfDisplay = `${t('shelf')}: <strong>-</strong> <span class="original-pos">(${item.shelf})</span>`;
        rowDisplay = `${t('row')}: <strong>-</strong> <span class="original-pos">(${item.row})</span>`;
        posDisplay = `${t('pos')}: <strong>-</strong> <span class="original-pos">(${item.position})</span>`;
    } else {
        // Check if item has been moved
        const rowChanged = item.originalRow && item.originalRow !== item.row;
        const posChanged = item.originalPosition && item.originalPosition !== item.position;

        shelfDisplay = `${t('shelf')}: <strong>${item.shelf || '-'}</strong>`;
        rowDisplay = rowChanged
            ? `${t('row')}: <strong>${item.row}</strong> <span class="original-pos">(${item.originalRow})</span>`
            : `${t('row')}: <strong>${item.row || '-'}</strong>`;
        posDisplay = posChanged
            ? `${t('pos')}: <strong>${item.position}</strong> <span class="original-pos">(${item.originalPosition})</span>`
            : `${t('pos')}: <strong>${item.position || '-'}</strong>`;
    }

    const lockIndicator = item.locked ? `<span class="lock-badge">${t('locked')}</span>` : '';

    card.innerHTML = `
        <div class="item-row">
            <div class="item-left">
                <span class="item-article"><strong>${articleDisplay}</strong></span>
                <span class="item-ean">${t('ean')}: ${item.ean || '-'}</span>
                ${lockIndicator}
            </div>
            <div class="item-location">
                <span>${shelfDisplay}</span>
                <span>${rowDisplay}</span>
                <span>${posDisplay}</span>
            </div>
        </div>
    `;

    // Add swipe to lock/remove and drag to reorder
    let touchStartX = 0;
    let touchEndX = 0;
    let touchStartY = 0;
    let touchEndY = 0;
    let touchInsideCard = true;
    let swipeDetected = false;
    let touchStartTime = 0;
    let hasMoved = false;

    card.addEventListener('touchstart', (e) => {
        const touch = e.touches[0];
        touchStartX = touch.screenX;
        touchStartY = touch.screenY;
        touchInsideCard = true;
        swipeDetected = false;
        hasMoved = false;
        touchStartTime = Date.now();

        // Start long-press timer for drag (500ms)
        touchDragState.longPressTimer = setTimeout(() => {
            // Don't start drag if already moved (swipe started)
            if (!hasMoved && !item.removed) {
                startTouchDrag(card, index, touch);
            }
        }, 500);
    }, { passive: true });

    card.addEventListener('touchmove', (e) => {
        const touch = e.touches[0];
        const rect = card.getBoundingClientRect();
        const x = touch.clientX;
        const y = touch.clientY;

        const diffX = touch.screenX - touchStartX;
        const diffY = touch.screenY - touchStartY;
        const totalMovement = Math.sqrt(diffX * diffX + diffY * diffY);

        // Cancel long-press if moved more than 10px
        if (totalMovement > 10) {
            hasMoved = true;
            if (touchDragState.longPressTimer) {
                clearTimeout(touchDragState.longPressTimer);
                touchDragState.longPressTimer = null;
            }
        }

        // Handle active drag
        if (touchDragState.isDragging && touchDragState.draggedCard === card) {
            e.preventDefault(); // Prevent scrolling while dragging
            updateTouchDrag(touch);
            return;
        }

        // For swipe gestures, only check vertical bounds (allow horizontal drift)
        // This allows users to swipe even if their finger drifts horizontally outside the card
        if (y < rect.top || y > rect.bottom) {
            touchInsideCard = false;
        }

        // Show swipe feedback (only if not dragging)
        if (!touchDragState.isDragging && Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 30) {
            if (diffX > 0) {
                // Swiping right - lock/green
                card.classList.add('swiping-right');
                card.classList.remove('swiping-left');
            } else {
                // Swiping left - remove/red
                card.classList.add('swiping-left');
                card.classList.remove('swiping-right');
            }
        } else {
            card.classList.remove('swiping-left', 'swiping-right');
        }
    });

    card.addEventListener('touchend', (e) => {
        // Clear long-press timer
        if (touchDragState.longPressTimer) {
            clearTimeout(touchDragState.longPressTimer);
            touchDragState.longPressTimer = null;
        }

        // Handle drag end
        if (touchDragState.isDragging && touchDragState.draggedCard === card) {
            endTouchDrag(e.changedTouches[0]);
            return;
        }

        touchEndX = e.changedTouches[0].screenX;
        touchEndY = e.changedTouches[0].screenY;

        // Remove swipe feedback classes
        card.classList.remove('swiping-left', 'swiping-right');

        // Only handle swipe if touch stayed inside the card and not dragging
        if (touchInsideCard && !touchDragState.isDragging) {
            // Use the current index from the dataset (not the closure variable)
            const currentIndex = parseInt(card.dataset.itemIndex);
            const swipeOccurred = handleItemSwipe(touchStartX, touchEndX, touchStartY, touchEndY, currentIndex);
            if (swipeOccurred) {
                swipeDetected = true;
                // Reset swipe flag after a short delay
                setTimeout(() => {
                    swipeDetected = false;
                }, 300);
            }
        }
    });

    card.addEventListener('touchcancel', (e) => {
        // Clear long-press timer
        if (touchDragState.longPressTimer) {
            clearTimeout(touchDragState.longPressTimer);
            touchDragState.longPressTimer = null;
        }

        // Cancel drag if active
        if (touchDragState.isDragging && touchDragState.draggedCard === card) {
            cancelTouchDrag();
        }

        card.classList.remove('swiping-left', 'swiping-right');
    });

    card.addEventListener('click', () => {
        // Don't handle click if a swipe just occurred
        if (swipeDetected) {
            return;
        }

        // Use the current index from the dataset
        const currentIndex = parseInt(card.dataset.itemIndex);
        if (appState.selectedItemIndex === currentIndex) {
            deselectItem();
        } else {
            selectItem(currentIndex);
        }
        renderItemsList();
        updateActionButtons();
    });

    card.addEventListener('dblclick', () => {
        // Use the current index from the dataset
        const currentIndex = parseInt(card.dataset.itemIndex);
        const freshItem = appState.items[currentIndex];
        if (freshItem) {
            // Select the item first to set the correct index
            appState.selectedItemIndex = currentIndex;
            showEditModal(freshItem, false);
        }
    });

    // Drag and Drop handlers
    card.addEventListener('dragstart', (e) => {
        card.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', item.id);

        // Store the dragged index
        card.dataset.draggedIndex = index;
    });

    card.addEventListener('dragend', (e) => {
        card.classList.remove('dragging');
        // Remove all drag indicators
        document.querySelectorAll('.item-card').forEach(c => {
            c.classList.remove('drag-over-top');
            c.classList.remove('drag-over-bottom');
        });

        // Stop auto-scrolling
        stopAutoScroll();
    });

    card.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';

        const draggingCard = document.querySelector('.dragging');
        if (!draggingCard || draggingCard === card) {
            return;
        }

        // Remove all drag indicators first
        document.querySelectorAll('.item-card').forEach(c => {
            c.classList.remove('drag-over-top');
            c.classList.remove('drag-over-bottom');
        });

        // Calculate if we should drop above or below this card
        const rect = card.getBoundingClientRect();
        const midpoint = rect.top + rect.height / 2;
        const mouseY = e.clientY;

        if (mouseY < midpoint) {
            card.classList.add('drag-over-top');
        } else {
            card.classList.add('drag-over-bottom');
        }

        // Auto-scroll when near edges
        handleAutoScroll(e.clientY);
    });

    card.addEventListener('dragleave', (e) => {
        // Only remove if we're leaving the card entirely
        const rect = card.getBoundingClientRect();
        const x = e.clientX;
        const y = e.clientY;

        if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) {
            card.classList.remove('drag-over-top');
            card.classList.remove('drag-over-bottom');
        }
    });

    card.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();

        card.classList.remove('drag-over-top');
        card.classList.remove('drag-over-bottom');

        const draggedId = e.dataTransfer.getData('text/plain');
        const draggedIndex = appState.items.findIndex(i => i.id === draggedId);
        const targetIndex = parseInt(card.dataset.itemIndex);

        if (draggedIndex === -1 || draggedIndex === targetIndex) {
            return;
        }

        const draggedItem = appState.items[draggedIndex];
        const targetItem = appState.items[targetIndex];

        // Don't allow moving removed items or moving to removed items
        if (draggedItem.removed || targetItem.removed) {
            return;
        }

        // Save history before making changes
        saveHistoryState();

        // Calculate if we should drop above or below
        const rect = card.getBoundingClientRect();
        const midpoint = rect.top + rect.height / 2;
        const mouseY = e.clientY;
        const dropBelow = mouseY >= midpoint;

        // Update the dragged item's shelf and row
        draggedItem.shelf = targetItem.shelf;
        draggedItem.row = targetItem.row;

        // Get all items in the target shelf/row (excluding the dragged item)
        const sameShelfRowItems = appState.items.filter(i =>
            i.shelf === targetItem.shelf &&
            i.row === targetItem.row &&
            i.id !== draggedItem.id &&
            !i.removed
        );

        // Sort by current position
        sameShelfRowItems.sort((a, b) => a.position - b.position);

        // Find the target item in the filtered list
        const targetIndexInList = sameShelfRowItems.findIndex(i => i.id === targetItem.id);

        // Determine insertion point
        let insertIndex;
        if (dropBelow) {
            // Insert after the target
            insertIndex = targetIndexInList + 1;
        } else {
            // Insert before the target
            insertIndex = targetIndexInList;
        }

        // Insert the dragged item at the correct position
        sameShelfRowItems.splice(insertIndex, 0, draggedItem);

        // Renumber all items sequentially starting from 1
        sameShelfRowItems.forEach((item, idx) => {
            item.position = idx + 1;
        });

        // Update selected index
        const newDraggedIndex = appState.items.findIndex(i => i.id === draggedId);
        if (appState.selectedItemIndex === draggedIndex) {
            appState.selectedItemIndex = newDraggedIndex;
        }

        renderItemsList();
        updateActionButtons();
    });

    return card;
}

function handleItemSwipe(startX, endX, startY, endY, itemIndex) {
    const swipeThreshold = 50;
    const diffX = endX - startX;
    const diffY = endY - startY;

    // Only trigger swipe if horizontal movement is greater than vertical movement
    // This prevents accidental swipes when scrolling vertically
    if (Math.abs(diffX) > swipeThreshold && Math.abs(diffX) > Math.abs(diffY)) {
        const item = appState.items[itemIndex];
        if (item) {
            // Save history before making changes
            saveHistoryState();

            if (diffX > 0) {
                // Swipe right - lock/unlock item
                item.locked = !item.locked;
                renderItemsList();
                updateActionButtons();
            } else {
                // Swipe left - mark as removed
                const wasRemoved = item.removed;
                item.removed = !item.removed;

                // Show undo toast only when marking as removed (not when un-removing)
                if (item.removed && !wasRemoved) {
                    showUndoToast(itemIndex);
                } else {
                    renderItemsList();
                    updateActionButtons();
                }
            }
            return true; // Swipe occurred
        }
    }
    return false; // No swipe
}

function updateActionButtons() {
    const btnEditItem = document.getElementById('btn-edit-item');

    // If no item is selected, disable edit button
    if (appState.selectedItemIndex === null) {
        btnEditItem.disabled = true;
    } else {
        btnEditItem.disabled = false; // Edit is always available when item selected
    }
}

function showEditModal(item, isNew) {
    const modal = document.getElementById('edit-modal');
    const modalTitle = document.getElementById('edit-modal-title');
    const eanInput = document.getElementById('edit-ean');
    const shelfSelect = document.getElementById('edit-shelf');
    const rowInput = document.getElementById('edit-row');
    const positionInput = document.getElementById('edit-position');
    const btnSave = document.getElementById('btn-save-edit');
    const btnCancel = document.getElementById('btn-cancel-edit');
    const eanLabel = document.getElementById('edit-ean-label');
    const shelfLabel = document.getElementById('edit-shelf-label');
    const rowLabel = document.getElementById('edit-row-label');
    const positionLabel = document.getElementById('edit-position-label');
    const lockedCheckbox = document.getElementById('edit-locked');
    const lockLabel = document.getElementById('edit-lock-label');
    const removedCheckbox = document.getElementById('edit-removed');
    const removedLabel = document.getElementById('edit-removed-label');

    // Set modal title
    modalTitle.textContent = isNew ? t('addItem') : t('editItem');

    // Update labels
    eanLabel.textContent = t('eanRequired');
    shelfLabel.textContent = t('shelfRequired');
    rowLabel.textContent = t('rowRequired');
    positionLabel.textContent = t('positionRequired');
    lockLabel.textContent = t('lock');
    removedLabel.textContent = t('removed');

    eanInput.value = item.ean;
    rowInput.value = item.row || 1;
    positionInput.value = item.position || 1;
    lockedCheckbox.checked = item.locked || false;
    removedCheckbox.checked = item.removed || false;

    // Setup +/- buttons for row and position
    const btnEditRowMinus = document.getElementById('btn-edit-row-minus');
    const btnEditRowPlus = document.getElementById('btn-edit-row-plus');
    const btnEditPositionMinus = document.getElementById('btn-edit-position-minus');
    const btnEditPositionPlus = document.getElementById('btn-edit-position-plus');

    // Remove old event listeners by cloning
    const newBtnEditRowMinus = btnEditRowMinus.cloneNode(true);
    const newBtnEditRowPlus = btnEditRowPlus.cloneNode(true);
    const newBtnEditPositionMinus = btnEditPositionMinus.cloneNode(true);
    const newBtnEditPositionPlus = btnEditPositionPlus.cloneNode(true);

    btnEditRowMinus.parentNode.replaceChild(newBtnEditRowMinus, btnEditRowMinus);
    btnEditRowPlus.parentNode.replaceChild(newBtnEditRowPlus, btnEditRowPlus);
    btnEditPositionMinus.parentNode.replaceChild(newBtnEditPositionMinus, btnEditPositionMinus);
    btnEditPositionPlus.parentNode.replaceChild(newBtnEditPositionPlus, btnEditPositionPlus);

    newBtnEditRowMinus.addEventListener('click', () => {
        const currentValue = parseInt(rowInput.value) || 1;
        if (currentValue > 1) {
            rowInput.value = currentValue - 1;
        }
    });

    newBtnEditRowPlus.addEventListener('click', () => {
        const currentValue = parseInt(rowInput.value) || 1;
        rowInput.value = currentValue + 1;
    });

    newBtnEditPositionMinus.addEventListener('click', () => {
        const currentValue = parseInt(positionInput.value) || 1;
        if (currentValue > 1) {
            positionInput.value = currentValue - 1;
        }
    });

    newBtnEditPositionPlus.addEventListener('click', () => {
        const currentValue = parseInt(positionInput.value) || 1;
        positionInput.value = currentValue + 1;
    });

    // Populate shelf dropdown
    const shelves = getUniqueShelves();
    shelfSelect.innerHTML = '';

    // Add existing shelves
    shelves.forEach(shelf => {
        const option = document.createElement('option');
        option.value = shelf;
        option.textContent = shelf;
        if (shelf === item.shelf) {
            option.selected = true;
        }
        shelfSelect.appendChild(option);
    });

    showModal(modal);

    // Initialize EAN barcode scanner
    initEanBarcodeScanner();

    // Remove old event listeners
    const newBtnSave = btnSave.cloneNode(true);
    const newBtnCancel = btnCancel.cloneNode(true);
    newBtnSave.textContent = t('save');
    newBtnCancel.textContent = t('cancel');
    btnSave.parentNode.replaceChild(newBtnSave, btnSave);
    btnCancel.parentNode.replaceChild(newBtnCancel, btnCancel);

    // Save button
    newBtnSave.addEventListener('click', () => {
        const newEan = eanInput.value.trim();
        const newShelf = shelfSelect.value.trim();
        const newRow = parseInt(rowInput.value);
        let newPosition = parseInt(positionInput.value);
        const newLocked = lockedCheckbox.checked;
        const newRemoved = removedCheckbox.checked;

        console.log('Save clicked:', { newEan, newShelf, newRow, newPosition, newLocked, newRemoved });

        if (!newEan || !newShelf || !newRow || !newPosition) {
            alert(t('eanShelfRequired'));
            return;
        }

        // Save history before making changes
        saveHistoryState();

        // Calculate max allowed position based on whether we're moving within same row or to different location
        let maxAllowedPosition;
        const sameLocation = !isNew && (item.shelf === newShelf && item.row === newRow);

        if (sameLocation) {
            // Moving within same row - max position is the total count of items in that row
            const totalItemsInRow = appState.items.filter(i => i.shelf === newShelf && i.row === newRow).length;
            maxAllowedPosition = totalItemsInRow;
        } else {
            // Moving to different row/shelf or adding new - max is current max + 1
            const itemsToCheck = isNew ? appState.items : appState.items.filter((_, idx) => idx !== appState.selectedItemIndex);
            const maxPositionInRow = getMaxPositionInRow(itemsToCheck, newShelf, newRow);
            maxAllowedPosition = maxPositionInRow + 1;
        }

        // Cap the position if it's too high
        if (newPosition > maxAllowedPosition) {
            newPosition = maxAllowedPosition;
        }

        // Store the item ID to find it after sorting
        const itemId = item.id;

        // Check if EAN has changed and lookup article number
        let newArticle = item.article;
        if (newEan !== item.ean) {
            // EAN changed - look up article number from uploaded data
            const matchingItem = appState.uploadedData.find(uploadedItem => uploadedItem.ean === newEan);
            if (matchingItem && matchingItem.article) {
                newArticle = matchingItem.article;
            } else {
                // EAN not found in uploaded data - set to empty
                newArticle = '';
            }
        }

        if (isNew) {
            // Add new item
            const newItem = { ...item, ean: newEan, article: newArticle, shelf: newShelf, row: newRow, position: newPosition, locked: newLocked, removed: newRemoved };
            addItem(newItem);
            appState.items = adjustPositionsAfterChange(appState.items, -1, newShelf, newRow, newPosition);
        } else {
            // Update existing item with position adjustment
            const oldShelf = item.shelf;
            const oldRow = item.row;
            const oldPosition = item.position;

            console.log('Old values:', { oldShelf, oldRow, oldPosition });
            console.log('New values:', { newShelf, newRow, newPosition });

            updateItem(appState.selectedItemIndex, { ean: newEan, article: newArticle, shelf: newShelf, row: newRow, position: newPosition, locked: newLocked, removed: newRemoved });
            console.log('After updateItem:', appState.items[appState.selectedItemIndex]);

            appState.items = adjustPositionsAfterChange(appState.items, appState.selectedItemIndex, newShelf, newRow, newPosition, oldShelf, oldRow, oldPosition);
            console.log('After adjustPositionsAfterChange:', appState.items);
        }

        appState.items = normalizePositions(sortItems(appState.items));
        console.log('After sortItems:', appState.items);

        // Find the new index of the edited item after sorting
        const newIndex = appState.items.findIndex(i => i.id === itemId);
        if (newIndex !== -1) {
            appState.selectedItemIndex = newIndex;
        }

        hideModal(modal);
        renderItemsList();
        updateActionButtons();
        scrollToSelectedItem();
    });

    // Cancel button
    newBtnCancel.addEventListener('click', () => {
        hideModal(modal);
    });

    // Close on background click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            hideModal(modal);
        }
    });
}

function scrollToSelectedItem() {
    if (appState.selectedItemIndex === null) return;

    // Small delay to ensure DOM is updated
    setTimeout(() => {
        const selectedCard = document.querySelector('.item-card.selected');
        if (selectedCard) {
            selectedCard.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
                inline: 'nearest'
            });
        }
    }, 100);
}

function getUniqueShelves() {
    const shelves = new Set();

    // Add shelves from existing items
    appState.items.forEach(item => {
        if (item.shelf) {
            shelves.add(item.shelf);
        }
    });

    // Add custom shelves created by user
    appState.customShelves.forEach(shelf => {
        shelves.add(shelf);
    });

    return Array.from(shelves).sort(compareAlphanumeric);
}

function deleteShelf(shelfName) {
    // Save history before making changes
    saveHistoryState();

    // Remove shelf from custom shelves
    const index = appState.customShelves.indexOf(shelfName);
    if (index > -1) {
        appState.customShelves.splice(index, 1);
    }

    // Re-render the list
    renderItemsList();
}

function showAddTypeModal() {
    const modal = document.getElementById('add-type-modal');
    const modalTitle = document.getElementById('add-type-modal-title');
    const btnAddShelf = document.getElementById('btn-add-shelf-type');
    const btnAddItemType = document.getElementById('btn-add-item-type');
    const btnCancel = document.getElementById('btn-cancel-add-type');

    // Update modal text
    modalTitle.textContent = t('whatToAdd');

    showModal(modal);

    // Remove old event listeners by cloning
    const newBtnAddShelf = btnAddShelf.cloneNode(true);
    const newBtnAddItem = btnAddItemType.cloneNode(true);
    const newBtnCancel = btnCancel.cloneNode(true);
    newBtnAddShelf.textContent = t('addShelf');
    newBtnAddItem.textContent = t('addItem');
    newBtnCancel.textContent = t('cancel');
    btnAddShelf.parentNode.replaceChild(newBtnAddShelf, btnAddShelf);
    btnAddItemType.parentNode.replaceChild(newBtnAddItem, btnAddItemType);
    btnCancel.parentNode.replaceChild(newBtnCancel, btnCancel);

    // Add Shelf button
    newBtnAddShelf.addEventListener('click', () => {
        hideModal(modal);
        showAddShelfModal();
    });

    // Add Item button
    newBtnAddItem.addEventListener('click', () => {
        hideModal(modal);

        const selectedItem = getSelectedItem();
        const row = selectedItem ? selectedItem.row : 1;
        const position = selectedItem ? selectedItem.position : 1;

        const newItem = {
            id: `item-new-${Date.now()}`,
            category: appState.selectedCategory,
            ean: '',
            shelf: selectedItem ? selectedItem.shelf : '',
            row: row,
            position: position,
            originalRow: row,
            originalPosition: position,
            article: '',
            stock: 0,
            locked: false,
            removed: false,
            isNewItem: true // Explicit flag for new items
        };

        showEditModal(newItem, true);
    });

    // Cancel button
    newBtnCancel.addEventListener('click', () => {
        hideModal(modal);
    });

    // Close on background click
    const closeOnBackground = (e) => {
        if (e.target === modal) {
            hideModal(modal);
            modal.removeEventListener('click', closeOnBackground);
        }
    };
    modal.addEventListener('click', closeOnBackground);
}

function showAddShelfModal() {
    const modal = document.getElementById('add-shelf-modal');
    const modalTitle = document.getElementById('add-shelf-modal-title');
    const shelfNameLabel = document.getElementById('new-shelf-name-label');
    const shelfNameInput = document.getElementById('new-shelf-name');
    const btnSave = document.getElementById('btn-save-add-shelf');
    const btnCancel = document.getElementById('btn-cancel-add-shelf');

    // Update modal text
    modalTitle.textContent = t('addNewShelf');
    shelfNameLabel.textContent = t('shelfName');

    shelfNameInput.value = '';
    showModal(modal);

    // Remove old event listeners
    const newBtnSave = btnSave.cloneNode(true);
    const newBtnCancel = btnCancel.cloneNode(true);
    newBtnSave.textContent = t('save');
    newBtnCancel.textContent = t('cancel');
    btnSave.parentNode.replaceChild(newBtnSave, btnSave);
    btnCancel.parentNode.replaceChild(newBtnCancel, btnCancel);

    // Save button
    newBtnSave.addEventListener('click', () => {
        const shelfName = shelfNameInput.value.trim();

        if (!shelfName) {
            alert(t('enterShelfName'));
            return;
        }

        // Add shelf to custom shelves list
        addCustomShelf(shelfName);

        hideModal(modal);

        // Re-render to show the new shelf header
        renderItemsList();
    });

    // Cancel button
    newBtnCancel.addEventListener('click', () => {
        hideModal(modal);
    });

    // Close on background click
    const closeOnBackground = (e) => {
        if (e.target === modal) {
            hideModal(modal);
            modal.removeEventListener('click', closeOnBackground);
        }
    };
    modal.addEventListener('click', closeOnBackground);
}

function showEditorSpeechModal() {
    const modal = document.getElementById('editor-speech-modal');
    const modalTitle = document.getElementById('editor-speech-modal-title');
    const enableLabel = document.getElementById('speech-enable-label');
    const articleLabel = document.getElementById('speech-article-label');
    const eanLabel = document.getElementById('speech-ean-label');
    const enabledCheckbox = document.getElementById('speech-enabled');
    const articleDigitsInput = document.getElementById('speech-article-digits');
    const eanDigitsInput = document.getElementById('speech-ean-digits');
    const btnSave = document.getElementById('btn-save-speech');
    const btnCancel = document.getElementById('btn-cancel-speech');

    // Update modal text
    modalTitle.textContent = t('speechSettings');
    enableLabel.textContent = t('enableSpeech');
    articleLabel.textContent = t('articleDigits');
    eanLabel.textContent = t('eanDigits');

    // Set current values
    enabledCheckbox.checked = appState.editorSpeech.enabled;
    articleDigitsInput.value = appState.editorSpeech.articleDigits;
    eanDigitsInput.value = appState.editorSpeech.eanDigits;

    showModal(modal);

    // Remove old event listeners
    const newBtnSave = btnSave.cloneNode(true);
    const newBtnCancel = btnCancel.cloneNode(true);
    newBtnSave.textContent = t('save');
    newBtnCancel.textContent = t('cancel');
    btnSave.parentNode.replaceChild(newBtnSave, btnSave);
    btnCancel.parentNode.replaceChild(newBtnCancel, btnCancel);

    // Save button
    newBtnSave.addEventListener('click', () => {
        appState.editorSpeech.enabled = enabledCheckbox.checked;
        appState.editorSpeech.articleDigits = parseInt(articleDigitsInput.value) || 0;
        appState.editorSpeech.eanDigits = parseInt(eanDigitsInput.value) || 0;

        updateSpeechButtonState();
        hideModal(modal);
    });

    // Cancel button
    newBtnCancel.addEventListener('click', () => {
        hideModal(modal);
    });

    // Close on background click
    const closeOnBackground = (e) => {
        if (e.target === modal) {
            hideModal(modal);
            modal.removeEventListener('click', closeOnBackground);
        }
    };
    modal.addEventListener('click', closeOnBackground);
}

function updateSpeechButtonState() {
    const btnSpeechSettings = document.getElementById('btn-editor-speech-settings');
    if (appState.editorSpeech.enabled) {
        btnSpeechSettings.classList.add('active');
    } else {
        btnSpeechSettings.classList.remove('active');
    }
}

function speakItemDetails(item) {
    if (!item) return;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterances = [];

    // Add article number digits as one utterance
    if (appState.editorSpeech.articleDigits > 0 && item.article) {
        const articleStr = String(item.article).replace(/^0+/, '') || '0';
        const digits = articleStr.slice(-appState.editorSpeech.articleDigits);
        const articleDigits = digits.split('').join(' ');

        const utterance = new SpeechSynthesisUtterance(articleDigits);
        utterance.rate = 1.5;
        utterance.lang = appState.currentLanguage === 'de' ? 'de-DE' : 'en-US';
        utterances.push(utterance);
    }

    // Add EAN digits as one utterance
    if (appState.editorSpeech.eanDigits > 0 && item.ean) {
        const eanStr = String(item.ean);
        const digits = eanStr.slice(-appState.editorSpeech.eanDigits);
        const eanDigits = digits.split('').join(' ');

        const utterance = new SpeechSynthesisUtterance(eanDigits);
        utterance.rate = 1.5;
        utterance.lang = appState.currentLanguage === 'de' ? 'de-DE' : 'en-US';
        utterances.push(utterance);
    }

    // Speak all utterances
    utterances.forEach(utterance => {
        window.speechSynthesis.speak(utterance);
    });
}

function adjustPositionsAfterChange(items, changedItemIndex, newShelf, newRow, newPosition, oldShelf, oldRow, oldPosition) {
    // Create a copy to work with
    const adjustedItems = [...items];

    // If old position info is provided (editing existing item)
    if (oldShelf !== undefined && oldRow !== undefined && oldPosition !== undefined) {
        // Check if shelf or row changed
        const shelfOrRowChanged = oldShelf !== newShelf || oldRow !== newRow;

        if (shelfOrRowChanged) {
            // Moving to different shelf or row

            // Step 1: Close gap in old location (skip removed items)
            adjustedItems.forEach((item, index) => {
                if (index !== changedItemIndex &&
                    !item.removed &&
                    item.shelf === oldShelf &&
                    item.row === oldRow &&
                    item.position > oldPosition) {
                    item.position--;
                }
            });

            // Step 2: Make room in new location (skip removed items)
            adjustedItems.forEach((item, index) => {
                if (index !== changedItemIndex &&
                    !item.removed &&
                    item.shelf === newShelf &&
                    item.row === newRow &&
                    item.position >= newPosition) {
                    item.position++;
                }
            });

            // Step 3: Set the changed item's new position
            adjustedItems[changedItemIndex].shelf = newShelf;
            adjustedItems[changedItemIndex].row = newRow;
            adjustedItems[changedItemIndex].position = newPosition;
        } else {
            // Same shelf and row - just reordering
            if (newPosition !== oldPosition) {
                if (newPosition > oldPosition) {
                    // Moving down (e.g., pos 1 -> pos 3)
                    // Items between old and new shift up (skip removed items)
                    adjustedItems.forEach((item, index) => {
                        if (index !== changedItemIndex &&
                            !item.removed &&
                            item.shelf === newShelf &&
                            item.row === newRow &&
                            item.position > oldPosition &&
                            item.position <= newPosition) {
                            item.position--;
                        }
                    });
                } else {
                    // Moving up (e.g., pos 3 -> pos 1)
                    // Items between new and old shift down (skip removed items)
                    adjustedItems.forEach((item, index) => {
                        if (index !== changedItemIndex &&
                            !item.removed &&
                            item.shelf === newShelf &&
                            item.row === newRow &&
                            item.position >= newPosition &&
                            item.position < oldPosition) {
                            item.position++;
                        }
                    });
                }

                // Set the changed item's new position
                adjustedItems[changedItemIndex].position = newPosition;
            }
        }
    } else {
        // Adding new item - make room at the new position (skip removed items)
        adjustedItems.forEach((item, index) => {
            if (index !== changedItemIndex &&
                !item.removed &&
                item.shelf === newShelf &&
                item.row === newRow &&
                item.position >= newPosition) {
                item.position++;
            }
        });
    }

    return adjustedItems;
}

function handleAutoScroll(mouseY) {
    const itemsList = document.getElementById('items-list');
    if (!itemsList) return;

    const rect = itemsList.getBoundingClientRect();
    const scrollZone = 100; // pixels from top/bottom to trigger scroll
    const scrollSpeedUp = 8; // pixels per frame for scrolling up
    const scrollSpeedDown = 20; // pixels per frame for scrolling down (much faster)

    const distanceFromTop = mouseY - rect.top;
    const distanceFromBottom = rect.bottom - mouseY;

    // Stop any existing auto-scroll
    stopAutoScroll();

    if (distanceFromTop < scrollZone && distanceFromTop > 0) {
        // Near top - scroll up
        const speed = Math.max(2, scrollSpeedUp * (1 - distanceFromTop / scrollZone));
        autoScrollInterval = setInterval(() => {
            itemsList.scrollTop -= speed;
        }, 16); // ~60fps
    } else if (distanceFromBottom < scrollZone && distanceFromBottom > 0) {
        // Near bottom - scroll down (much faster)
        const speed = Math.max(4, scrollSpeedDown * (1 - distanceFromBottom / scrollZone));
        autoScrollInterval = setInterval(() => {
            itemsList.scrollTop += speed;
        }, 16); // ~60fps
    }
}

function stopAutoScroll() {
    if (autoScrollInterval) {
        clearInterval(autoScrollInterval);
        autoScrollInterval = null;
    }
}

// Touch Drag and Drop Functions
function startTouchDrag(card, index, touch) {
    const item = appState.items[index];
    if (!item || item.removed) return;

    // Vibrate to indicate drag started (if supported)
    if (navigator.vibrate) {
        navigator.vibrate(50);
    }

    touchDragState.isDragging = true;
    touchDragState.draggedCard = card;
    touchDragState.draggedIndex = index;
    touchDragState.touchIdentifier = touch.identifier;
    touchDragState.startX = touch.clientX;
    touchDragState.startY = touch.clientY;

    // Add dragging class
    card.classList.add('dragging');
    card.style.opacity = '0.4';

    // Create a clone for visual feedback
    const clone = card.cloneNode(true);
    clone.classList.add('drag-clone');
    clone.style.position = 'fixed';
    clone.style.width = card.offsetWidth + 'px';
    clone.style.height = card.offsetHeight + 'px';
    clone.style.left = touch.clientX - card.offsetWidth / 2 + 'px';
    clone.style.top = touch.clientY - card.offsetHeight / 2 + 'px';
    clone.style.pointerEvents = 'none';
    clone.style.zIndex = '10000';
    clone.style.opacity = '0.9';
    clone.style.transform = 'scale(1.05)';
    clone.style.boxShadow = '0 10px 30px rgba(0,0,0,0.3)';
    clone.style.transition = 'none';

    document.body.appendChild(clone);
    touchDragState.clone = clone;
}

function updateTouchDrag(touch) {
    if (!touchDragState.isDragging || !touchDragState.clone) return;

    const clone = touchDragState.clone;
    const card = touchDragState.draggedCard;

    // Update clone position
    clone.style.left = touch.clientX - clone.offsetWidth / 2 + 'px';
    clone.style.top = touch.clientY - clone.offsetHeight / 2 + 'px';

    // Find the element under the touch point
    clone.style.display = 'none';
    const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
    clone.style.display = '';

    // Remove all drag indicators first
    document.querySelectorAll('.item-card').forEach(c => {
        c.classList.remove('drag-over-top');
        c.classList.remove('drag-over-bottom');
    });

    // Find the item card under the touch
    let targetCard = elementBelow;
    while (targetCard && !targetCard.classList.contains('item-card')) {
        targetCard = targetCard.parentElement;
    }

    if (targetCard && targetCard !== card && !targetCard.classList.contains('dragging')) {
        const rect = targetCard.getBoundingClientRect();
        const midpoint = rect.top + rect.height / 2;

        if (touch.clientY < midpoint) {
            targetCard.classList.add('drag-over-top');
        } else {
            targetCard.classList.add('drag-over-bottom');
        }
    }

    // Auto-scroll
    handleAutoScroll(touch.clientY);
}

function endTouchDrag(touch) {
    if (!touchDragState.isDragging) return;

    const card = touchDragState.draggedCard;
    const draggedIndex = touchDragState.draggedIndex;
    const clone = touchDragState.clone;

    // Find the element under the final touch point
    if (clone) {
        clone.style.display = 'none';
    }
    const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);

    // Find the target card
    let targetCard = elementBelow;
    while (targetCard && !targetCard.classList.contains('item-card')) {
        targetCard = targetCard.parentElement;
    }

    // Perform the drop if we have a valid target
    if (targetCard && targetCard !== card) {
        const targetIndex = parseInt(targetCard.dataset.itemIndex);
        if (targetIndex !== draggedIndex && !isNaN(targetIndex)) {
            const draggedItem = appState.items[draggedIndex];
            const targetItem = appState.items[targetIndex];

            if (draggedItem && targetItem && !draggedItem.removed && !targetItem.removed) {
                // Save history before making changes
                saveHistoryState();

                // Calculate if we should drop above or below
                const rect = targetCard.getBoundingClientRect();
                const midpoint = rect.top + rect.height / 2;
                const dropBelow = touch.clientY >= midpoint;

                // Update the dragged item's shelf and row
                draggedItem.shelf = targetItem.shelf;
                draggedItem.row = targetItem.row;

                // Get all items in the target shelf/row (excluding the dragged item)
                const sameShelfRowItems = appState.items.filter(i =>
                    i.shelf === targetItem.shelf &&
                    i.row === targetItem.row &&
                    i.id !== draggedItem.id &&
                    !i.removed
                );

                // Sort by current position
                sameShelfRowItems.sort((a, b) => a.position - b.position);

                // Find the target item in the filtered list
                const targetIndexInList = sameShelfRowItems.findIndex(i => i.id === targetItem.id);

                // Determine insertion point
                let insertIndex;
                if (dropBelow) {
                    insertIndex = targetIndexInList + 1;
                } else {
                    insertIndex = targetIndexInList;
                }

                // Insert the dragged item at the correct position
                sameShelfRowItems.splice(insertIndex, 0, draggedItem);

                // Renumber all items sequentially starting from 1
                sameShelfRowItems.forEach((item, idx) => {
                    item.position = idx + 1;
                });

                // Update selected index
                const newDraggedIndex = appState.items.findIndex(i => i.id === draggedItem.id);
                if (appState.selectedItemIndex === draggedIndex) {
                    appState.selectedItemIndex = newDraggedIndex;
                }

                renderItemsList();
                updateActionButtons();
            }
        }
    }

    // Cleanup
    cleanupTouchDrag();
}

function cancelTouchDrag() {
    cleanupTouchDrag();
}

function cleanupTouchDrag() {
    // Remove clone
    if (touchDragState.clone) {
        touchDragState.clone.remove();
        touchDragState.clone = null;
    }

    // Remove dragging class
    if (touchDragState.draggedCard) {
        touchDragState.draggedCard.classList.remove('dragging');
        touchDragState.draggedCard.style.opacity = '';
    }

    // Remove all drag indicators
    document.querySelectorAll('.item-card').forEach(c => {
        c.classList.remove('drag-over-top');
        c.classList.remove('drag-over-bottom');
    });

    // Stop auto-scrolling
    stopAutoScroll();

    // Reset state
    touchDragState.isDragging = false;
    touchDragState.draggedCard = null;
    touchDragState.draggedIndex = null;
    touchDragState.touchIdentifier = null;
    touchDragState.startX = 0;
    touchDragState.startY = 0;
}

// Undo Toast Functions
function showUndoToast(itemIndex) {
    const toast = document.getElementById('undo-toast');
    const message = document.getElementById('undo-toast-message');
    const undoBtn = document.getElementById('undo-toast-btn');

    // Clear any existing timer
    if (undoState.timer) {
        clearTimeout(undoState.timer);
    }

    // Save state for undo
    undoState.itemIndex = itemIndex;
    undoState.previousState = {
        removed: false // We know it was not removed before
    };

    // Update message
    message.textContent = t('itemRemoved');
    undoBtn.textContent = t('undo');

    // Remove slideOut class and show toast
    toast.classList.remove('slideOut');
    toast.classList.remove('hidden');

    // Render immediately to show the removal
    renderItemsList();
    updateActionButtons();

    // Setup undo button click handler
    undoBtn.onclick = () => {
        performUndo();
    };

    // Auto-hide after 4 seconds
    undoState.timer = setTimeout(() => {
        hideUndoToast();
    }, 4000);
}

function performUndo() {
    // Use the history undo instead of manual restoration
    // This keeps history in sync
    performUndoAction();
    hideUndoToast();
}

function hideUndoToast() {
    const toast = document.getElementById('undo-toast');

    // Clear timer
    if (undoState.timer) {
        clearTimeout(undoState.timer);
        undoState.timer = null;
    }

    // Add slideOut animation
    toast.classList.add('slideOut');

    // Hide after animation completes
    setTimeout(() => {
        toast.classList.add('hidden');
        toast.classList.remove('slideOut');
    }, 300);

    // Reset undo state
    undoState.itemIndex = null;
    undoState.previousState = null;
}

// History Management Functions
function saveHistoryState(isInitial = false) {
    // Create a deep copy of the current items state
    const snapshot = JSON.parse(JSON.stringify(appState.items));

    if (isInitial) {
        // Initialize history with the first state
        historyState.history = [snapshot];
        historyState.currentIndex = 0;
    } else {
        // Remove any future history if we're not at the end
        if (historyState.currentIndex < historyState.history.length - 1) {
            historyState.history = historyState.history.slice(0, historyState.currentIndex + 1);
        }

        // Add new snapshot
        historyState.history.push(snapshot);
        historyState.currentIndex++;

        // Limit history size
        if (historyState.history.length > historyState.maxHistory) {
            historyState.history.shift();
            historyState.currentIndex--;
        }
    }

    updateUndoRedoButtons();
}

function performUndoAction() {
    if (historyState.currentIndex > 0) {
        historyState.currentIndex--;
        restoreHistoryState();
    }
}

function performRedoAction() {
    if (historyState.currentIndex < historyState.history.length - 1) {
        historyState.currentIndex++;
        restoreHistoryState();
    }
}

function restoreHistoryState() {
    // Restore the items from history
    const snapshot = historyState.history[historyState.currentIndex];
    appState.items = JSON.parse(JSON.stringify(snapshot));

    // Re-render
    renderItemsList();
    updateActionButtons();
    updateUndoRedoButtons();

    // Hide undo toast if visible
    hideUndoToast();
}

function updateUndoRedoButtons() {
    const btnUndo = document.getElementById('btn-undo');
    const btnRedo = document.getElementById('btn-redo');

    if (btnUndo) {
        btnUndo.disabled = historyState.currentIndex <= 0;
    }

    if (btnRedo) {
        btnRedo.disabled = historyState.currentIndex >= historyState.history.length - 1;
    }
}
