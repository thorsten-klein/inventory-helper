// List Editor Screen Controller

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

    // Hide action buttons
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

        hideMoveButtons();
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

    // Setup keyboard navigation
    setupEditorKeyboardHandlers();
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

    // Add swipe to lock/remove
    let touchStartX = 0;
    let touchEndX = 0;
    let touchStartY = 0;
    let touchEndY = 0;
    let swipeDetected = false;

    card.addEventListener('touchstart', (e) => {
        const touch = e.touches[0];
        touchStartX = touch.screenX;
        touchStartY = touch.screenY;
        swipeDetected = false;
    }, { passive: true });

    card.addEventListener('touchmove', (e) => {
        const touch = e.touches[0];
        const diffX = touch.screenX - touchStartX;
        const diffY = touch.screenY - touchStartY;

        // Show swipe feedback
        if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 30) {
            if (diffX > 0) {
                card.classList.add('swiping-right');
                card.classList.remove('swiping-left');
            } else {
                card.classList.add('swiping-left');
                card.classList.remove('swiping-right');
            }
        } else {
            card.classList.remove('swiping-left', 'swiping-right');
        }
    }, { passive: true });

    card.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        touchEndY = e.changedTouches[0].screenY;

        // Remove swipe feedback classes
        card.classList.remove('swiping-left', 'swiping-right');

        // Handle swipe
        const currentIndex = parseInt(card.dataset.itemIndex);
        const swipeOccurred = handleItemSwipe(touchStartX, touchEndX, touchStartY, touchEndY, currentIndex);
        if (swipeOccurred) {
            swipeDetected = true;
            setTimeout(() => {
                swipeDetected = false;
            }, 300);
        }
    }, { passive: true });

    card.addEventListener('touchcancel', (e) => {
        card.classList.remove('swiping-left', 'swiping-right');
    }, { passive: true });

    card.addEventListener('click', () => {
        // Don't handle click if a swipe just occurred
        if (swipeDetected) {
            return;
        }

        // Use the current index from the dataset
        const currentIndex = parseInt(card.dataset.itemIndex);
        if (appState.selectedItemIndex === currentIndex) {
            deselectItem();
            hideMoveButtons();
        } else {
            selectItem(currentIndex);
            showMoveButtons(currentIndex);
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
            if (diffX > 0) {
                // Swipe right - lock/unlock item
                saveHistoryState();
                item.locked = !item.locked;
                renderItemsList();
                updateActionButtons();

                // Update move buttons if this item is selected
                if (appState.selectedItemIndex === itemIndex) {
                    showMoveButtons(itemIndex);
                }
            } else {
                // Swipe left - confirm and mark as removed
                const wasRemoved = item.removed;

                if (wasRemoved) {
                    // Un-removing an item - no confirmation needed
                    saveHistoryState();
                    item.removed = false;
                    renderItemsList();
                    updateActionButtons();

                    // Update move buttons if this item is selected
                    if (appState.selectedItemIndex === itemIndex) {
                        showMoveButtons(itemIndex);
                    }
                } else {
                    // Removing an item - ask for confirmation
                    const itemDescription = item.ean || t('thisItem');
                    showConfirmRemoveModal(itemDescription, () => {
                        saveHistoryState();
                        item.removed = true;

                        // Hide move buttons since item is now removed
                        hideMoveButtons();

                        renderItemsList();
                        updateActionButtons();
                    });
                }
            }
            return true; // Swipe occurred
        }
    }
    return false; // No swipe
}

function showConfirmRemoveModal(itemDescription, onConfirm) {
    const modal = document.getElementById('confirm-remove-modal');
    const title = document.getElementById('confirm-remove-title');
    const message = document.getElementById('confirm-remove-message');
    const btnCancel = document.getElementById('btn-cancel-remove');
    const btnConfirm = document.getElementById('btn-confirm-remove');

    // Set text
    title.textContent = t('confirmRemove');
    message.textContent = `${itemDescription}?`;
    btnCancel.textContent = t('cancel');
    btnConfirm.textContent = t('confirmRemove');

    // Show modal
    showModal(modal);

    // Focus on confirm button
    setTimeout(() => btnConfirm.focus(), 100);

    // Remove old event listeners by cloning
    const newBtnCancel = btnCancel.cloneNode(true);
    const newBtnConfirm = btnConfirm.cloneNode(true);
    newBtnCancel.textContent = t('cancel');
    newBtnConfirm.textContent = t('confirmRemove');
    btnCancel.parentNode.replaceChild(newBtnCancel, btnCancel);
    btnConfirm.parentNode.replaceChild(newBtnConfirm, btnConfirm);

    // Keyboard handler for Enter key
    const keyHandler = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            document.removeEventListener('keydown', keyHandler);
            hideModal(modal);
            onConfirm();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            document.removeEventListener('keydown', keyHandler);
            hideModal(modal);
        }
    };

    document.addEventListener('keydown', keyHandler);

    // Cancel button
    newBtnCancel.addEventListener('click', () => {
        document.removeEventListener('keydown', keyHandler);
        hideModal(modal);
    });

    // Confirm button
    newBtnConfirm.addEventListener('click', () => {
        document.removeEventListener('keydown', keyHandler);
        hideModal(modal);
        onConfirm();
    });

    // Close on background click
    modal.onclick = (e) => {
        if (e.target === modal) {
            document.removeEventListener('keydown', keyHandler);
            hideModal(modal);
        }
    };
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

function setupEditorKeyboardHandlers() {
    // Remove old listener if any
    document.removeEventListener('keydown', handleEditorKeydown);

    // Add new listener
    document.addEventListener('keydown', handleEditorKeydown);
}

function handleEditorKeydown(e) {
    // Only handle arrow keys when on editor screen
    const currentScreen = document.querySelector('.screen:not(.hidden)');
    if (!currentScreen || currentScreen.id !== 'editor-screen') {
        return;
    }

    // Don't handle if user is typing in an input field or a modal is open
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
    }

    // Check if any modal is visible
    const modals = document.querySelectorAll('.modal:not(.hidden)');
    if (modals.length > 0) {
        return;
    }

    const visibleItems = appState.items.filter(item => !item.removed);
    const currentIndex = appState.selectedItemIndex;

    if (e.key === 'ArrowRight') {
        // Swipe right action - lock/unlock item
        e.preventDefault();
        if (currentIndex !== null && currentIndex >= 0 && currentIndex < appState.items.length) {
            const item = appState.items[currentIndex];
            if (item) {
                saveHistoryState();
                item.locked = !item.locked;
                renderItemsList();
                updateActionButtons();
                showMoveButtons(currentIndex);
            }
        }
    } else if (e.key === 'ArrowLeft') {
        // Swipe left action - confirm and mark as removed/un-removed
        e.preventDefault();
        if (currentIndex !== null && currentIndex >= 0 && currentIndex < appState.items.length) {
            const item = appState.items[currentIndex];
            if (item) {
                const wasRemoved = item.removed;

                if (wasRemoved) {
                    // Un-removing an item - no confirmation needed
                    saveHistoryState();
                    item.removed = false;
                    renderItemsList();
                    updateActionButtons();
                    showMoveButtons(currentIndex);
                } else {
                    // Removing an item - ask for confirmation
                    const itemDescription = item.ean || t('thisItem');
                    showConfirmRemoveModal(itemDescription, () => {
                        saveHistoryState();
                        item.removed = true;
                        hideMoveButtons();
                        renderItemsList();
                        updateActionButtons();
                    });
                }
            }
        }
    } else if (e.key === 'ArrowDown') {
        // Select next item
        e.preventDefault();
        if (currentIndex === null) {
            // No item selected, select first visible item
            if (visibleItems.length > 0) {
                const firstVisibleIndex = appState.items.indexOf(visibleItems[0]);
                selectItem(firstVisibleIndex);
                renderItemsList();
                updateActionButtons();
                scrollToItem(firstVisibleIndex);
                showMoveButtons(firstVisibleIndex);
            }
        } else {
            // Find the next visible item in the full items array
            let nextIndex = currentIndex + 1;
            while (nextIndex < appState.items.length && appState.items[nextIndex].removed) {
                nextIndex++;
            }
            if (nextIndex < appState.items.length) {
                selectItem(nextIndex);
                renderItemsList();
                updateActionButtons();
                scrollToItem(nextIndex);
                showMoveButtons(nextIndex);
            }
        }
    } else if (e.key === 'ArrowUp') {
        // Select previous item
        e.preventDefault();
        if (currentIndex === null) {
            // No item selected, select last visible item
            if (visibleItems.length > 0) {
                const lastVisibleIndex = appState.items.indexOf(visibleItems[visibleItems.length - 1]);
                selectItem(lastVisibleIndex);
                renderItemsList();
                updateActionButtons();
                scrollToItem(lastVisibleIndex);
                showMoveButtons(lastVisibleIndex);
            }
        } else {
            // Find the previous visible item in the full items array
            let prevIndex = currentIndex - 1;
            while (prevIndex >= 0 && appState.items[prevIndex].removed) {
                prevIndex--;
            }
            if (prevIndex >= 0) {
                selectItem(prevIndex);
                renderItemsList();
                updateActionButtons();
                scrollToItem(prevIndex);
                showMoveButtons(prevIndex);
            }
        }
    }
}

function scrollToItem(itemIndex) {
    // Find the card element for this item and scroll it into view
    const card = document.querySelector(`[data-item-index="${itemIndex}"]`);
    if (card) {
        card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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

            updateItem(appState.selectedItemIndex, { ean: newEan, article: newArticle, shelf: newShelf, row: newRow, position: newPosition, locked: newLocked, removed: newRemoved });

            appState.items = adjustPositionsAfterChange(appState.items, appState.selectedItemIndex, newShelf, newRow, newPosition, oldShelf, oldRow, oldPosition);
        }

        appState.items = normalizePositions(sortItems(appState.items));

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

function showMoveButtons(itemIndex) {
    // Remove any existing move buttons
    const existingButtons = document.getElementById('move-buttons-container');
    if (existingButtons) {
        existingButtons.remove();
    }

    // Get item data
    const item = appState.items[itemIndex];
    if (!item || item.removed) return;

    // Get all items in the same shelf/row (excluding removed items)
    const sameRowItems = appState.items.filter(i =>
        i.shelf === item.shelf &&
        i.row === item.row &&
        !i.removed
    );
    sameRowItems.sort((a, b) => a.position - b.position);

    // Find this item's position in the filtered list
    const positionInRow = sameRowItems.findIndex(i => i.id === item.id);

    // Can move up if: not first in row, OR first in row but row > 1 (can move to previous row)
    const canMoveUp = positionInRow > 0 || (positionInRow === 0 && item.row > 1);

    // Can always move down (either within row or to next row)
    const canMoveDown = true;

    // Create buttons container
    const buttonsContainer = document.createElement('div');
    buttonsContainer.id = 'move-buttons-container';
    buttonsContainer.style.cssText = `
        position: fixed;
        bottom: 8rem;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        gap: 0.75rem;
        z-index: 999;
        background: white;
        padding: 0.75rem;
        border-radius: 0.75rem;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    `;

    // Create Move Up button
    const btnMoveUp = document.createElement('button');
    btnMoveUp.textContent = t('moveUp');
    btnMoveUp.className = 'btn btn-secondary';
    btnMoveUp.disabled = !canMoveUp;
    btnMoveUp.style.minWidth = '120px';
    btnMoveUp.onclick = () => {
        moveItemUp(itemIndex);
    };

    // Create Move Down button
    const btnMoveDown = document.createElement('button');
    btnMoveDown.textContent = t('moveDown');
    btnMoveDown.className = 'btn btn-secondary';
    btnMoveDown.disabled = !canMoveDown;
    btnMoveDown.style.minWidth = '120px';
    btnMoveDown.onclick = () => {
        moveItemDown(itemIndex);
    };

    buttonsContainer.appendChild(btnMoveUp);
    buttonsContainer.appendChild(btnMoveDown);

    document.body.appendChild(buttonsContainer);
}

function hideMoveButtons() {
    const existingButtons = document.getElementById('move-buttons-container');
    if (existingButtons) {
        existingButtons.remove();
    }
}

function moveItemUp(itemIndex) {
    const item = appState.items[itemIndex];
    if (!item || item.removed) return;

    // Get all items in the same shelf/row (excluding removed items)
    const sameRowItems = appState.items.filter(i =>
        i.shelf === item.shelf &&
        i.row === item.row &&
        !i.removed
    );
    sameRowItems.sort((a, b) => a.position - b.position);

    // Find this item's position in the filtered list
    const positionInRow = sameRowItems.findIndex(i => i.id === item.id);

    // Save history
    saveHistoryState();

    if (positionInRow > 0) {
        // Move within same row - swap with item above
        const itemAbove = sameRowItems[positionInRow - 1];
        const tempPosition = item.position;
        item.position = itemAbove.position;
        itemAbove.position = tempPosition;
    } else if (item.row > 1) {
        // First item in row, move to end of previous row
        const previousRow = item.row - 1;

        // Get items in previous row
        const previousRowItems = appState.items.filter(i =>
            i.shelf === item.shelf &&
            i.row === previousRow &&
            !i.removed
        );
        previousRowItems.sort((a, b) => a.position - b.position);

        // Find max position in previous row
        const maxPosition = previousRowItems.length > 0
            ? Math.max(...previousRowItems.map(i => i.position))
            : 0;

        // Move item to end of previous row
        item.row = previousRow;
        item.position = maxPosition + 1;

        // Renumber current row items
        sameRowItems.filter(i => i.id !== item.id).forEach((i, idx) => {
            i.position = idx + 1;
        });
    } else {
        // Can't move up (row 1, position 1)
        return;
    }

    // Re-render
    renderItemsList();
    updateActionButtons();

    // Update move buttons with new index
    const newIndex = appState.items.findIndex(i => i.id === item.id);
    if (newIndex !== -1) {
        appState.selectedItemIndex = newIndex;
        showMoveButtons(newIndex);
    }
}

function moveItemDown(itemIndex) {
    const item = appState.items[itemIndex];
    if (!item || item.removed) return;

    // Get all items in the same shelf/row (excluding removed items)
    const sameRowItems = appState.items.filter(i =>
        i.shelf === item.shelf &&
        i.row === item.row &&
        !i.removed
    );
    sameRowItems.sort((a, b) => a.position - b.position);

    // Find this item's position in the filtered list
    const positionInRow = sameRowItems.findIndex(i => i.id === item.id);

    // Save history
    saveHistoryState();

    if (positionInRow < sameRowItems.length - 1) {
        // Move within same row - swap with item below
        const itemBelow = sameRowItems[positionInRow + 1];
        const tempPosition = item.position;
        item.position = itemBelow.position;
        itemBelow.position = tempPosition;
    } else {
        // Last item in row, move to position 1 of next row
        const nextRow = item.row + 1;

        // Get items in next row
        const nextRowItems = appState.items.filter(i =>
            i.shelf === item.shelf &&
            i.row === nextRow &&
            !i.removed
        );

        // Make room at position 1 in next row
        nextRowItems.forEach(i => {
            i.position++;
        });

        // Move item to position 1 of next row
        item.row = nextRow;
        item.position = 1;

        // Renumber current row items
        sameRowItems.filter(i => i.id !== item.id).forEach((i, idx) => {
            i.position = idx + 1;
        });
    }

    // Re-render
    renderItemsList();
    updateActionButtons();

    // Update move buttons with new index
    const newIndex = appState.items.findIndex(i => i.id === item.id);
    if (newIndex !== -1) {
        appState.selectedItemIndex = newIndex;
        showMoveButtons(newIndex);
    }
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
