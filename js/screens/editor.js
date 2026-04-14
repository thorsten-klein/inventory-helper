// List Editor Screen Controller

function renderEditorScreen() {
    const categoryName = document.getElementById('editor-category-name');
    const itemsList = document.getElementById('items-list');
    const actionButtons = document.getElementById('action-buttons');
    const btnAddItem = document.getElementById('btn-add-item');
    const btnRowPlus = document.getElementById('btn-row-plus');
    const btnRowMinus = document.getElementById('btn-row-minus');
    const btnMoveUp = document.getElementById('btn-move-up');
    const btnMoveDown = document.getElementById('btn-move-down');
    const btnBackCategory = document.getElementById('btn-back-category');
    const btnEditItem = document.getElementById('btn-edit-item');
    const btnStartReview = document.getElementById('btn-start-review');

    // Set category name
    categoryName.textContent = appState.selectedCategory;

    // Update button text
    btnRowPlus.textContent = t('rowPlus');
    btnRowMinus.textContent = t('rowMinus');
    btnMoveUp.textContent = t('posMinus');
    btnMoveDown.textContent = t('posPlus');
    btnBackCategory.textContent = t('back');
    btnEditItem.textContent = t('edit');
    btnStartReview.textContent = t('next');

    // Render items
    renderItemsList();

    // Add item button - show type selection modal
    btnAddItem.addEventListener('click', () => {
        showAddTypeModal();
    });

    // Row + button
    btnRowPlus.addEventListener('click', () => {
        if (appState.selectedItemIndex === null) return;

        const item = appState.items[appState.selectedItemIndex];
        appState.items = moveItemToRow(appState.items, appState.selectedItemIndex, item.row + 1);

        // Find new index after sorting
        const newIndex = appState.items.findIndex(i => i.id === item.id);
        appState.selectedItemIndex = newIndex;

        renderItemsList();
        updateActionButtons();
        scrollToSelectedItem();
    });

    // Row - button
    btnRowMinus.addEventListener('click', () => {
        if (appState.selectedItemIndex === null) return;

        const item = appState.items[appState.selectedItemIndex];
        if (item.row <= 1) return;

        appState.items = moveItemToRow(appState.items, appState.selectedItemIndex, item.row - 1);

        // Find new index after sorting
        const newIndex = appState.items.findIndex(i => i.id === item.id);
        appState.selectedItemIndex = newIndex;

        renderItemsList();
        updateActionButtons();
        scrollToSelectedItem();
    });

    // Move Up button
    btnMoveUp.addEventListener('click', () => {
        if (appState.selectedItemIndex === null) return;

        const item = appState.items[appState.selectedItemIndex];
        appState.items = moveItemPosition(appState.items, appState.selectedItemIndex, 'up');

        // Find new index after sorting
        const newIndex = appState.items.findIndex(i => i.id === item.id);
        appState.selectedItemIndex = newIndex;

        renderItemsList();
        updateActionButtons();
        scrollToSelectedItem();
    });

    // Move Down button
    btnMoveDown.addEventListener('click', () => {
        if (appState.selectedItemIndex === null) return;

        const item = appState.items[appState.selectedItemIndex];
        appState.items = moveItemPosition(appState.items, appState.selectedItemIndex, 'down');

        // Find new index after sorting
        const newIndex = appState.items.findIndex(i => i.id === item.id);
        appState.selectedItemIndex = newIndex;

        renderItemsList();
        updateActionButtons();
        scrollToSelectedItem();
    });

    // Back button
    btnBackCategory.addEventListener('click', () => {
        showScreen('category');
        initCategoryScreen();
    });

    // Edit button
    btnEditItem.addEventListener('click', () => {
        const item = getSelectedItem();
        if (!item) return;

        showEditModal(item, false);
    });

    // Start Review button
    btnStartReview.addEventListener('click', () => {
        if (appState.items.length === 0) {
            alert(t('noItemsToReview'));
            return;
        }

        // Initialize stock counts
        appState.items.forEach(item => {
            setStockCount(item.id, item.stock, item.stock);
        });

        appState.currentReviewIndex = 0;
        showScreen('review');
        renderReviewScreen();
    });

    // Initialize action buttons state
    updateActionButtons();
}

function renderItemsList() {
    const itemsList = document.getElementById('items-list');
    itemsList.innerHTML = '';

    const groups = groupItemsByShelf(appState.items);

    // Get all shelves (including custom shelves with no items)
    const allShelves = getUniqueShelves();

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
            shelfItems.forEach(item => {
                const itemIndex = appState.items.findIndex(i => i.id === item.id);
                const itemCard = createItemCard(item, itemIndex);
                itemsList.appendChild(itemCard);
            });
        }
        // If no items, shelf header is shown with no items under it
    });
}

function createItemCard(item, index) {
    const card = document.createElement('div');
    card.className = 'item-card';
    if (index === appState.selectedItemIndex) {
        card.classList.add('selected');
    }

    // Remove leading zeros from article number
    const articleDisplay = item.article ? String(item.article).replace(/^0+/, '') || '0' : '-';

    // Check if item has been moved
    const rowChanged = item.originalRow && item.originalRow !== item.row;
    const posChanged = item.originalPosition && item.originalPosition !== item.position;

    const rowDisplay = rowChanged
        ? `${t('row')}: <strong>${item.row}</strong> <span class="original-pos">(${item.originalRow})</span>`
        : `${t('row')}: <strong>${item.row || '-'}</strong>`;

    const posDisplay = posChanged
        ? `${t('pos')}: <strong>${item.position}</strong> <span class="original-pos">(${item.originalPosition})</span>`
        : `${t('pos')}: <strong>${item.position || '-'}</strong>`;

    card.innerHTML = `
        <div class="item-row">
            <div class="item-left">
                <span class="item-article"><strong>${articleDisplay}</strong></span>
                <span class="item-ean">${t('ean')}: ${item.ean || '-'}</span>
            </div>
            <div class="item-location">
                <span>${t('shelf')}: <strong>${item.shelf || '-'}</strong></span>
                <span>${rowDisplay}</span>
                <span>${posDisplay}</span>
            </div>
        </div>
    `;

    card.addEventListener('click', () => {
        if (appState.selectedItemIndex === index) {
            deselectItem();
        } else {
            selectItem(index);
        }
        renderItemsList();
        updateActionButtons();
    });

    return card;
}

function updateActionButtons() {
    const actionButtons = document.getElementById('action-buttons');
    const btnRowPlus = document.getElementById('btn-row-plus');
    const btnRowMinus = document.getElementById('btn-row-minus');
    const btnMoveUp = document.getElementById('btn-move-up');
    const btnMoveDown = document.getElementById('btn-move-down');
    const btnEditItem = document.getElementById('btn-edit-item');

    // Always show action buttons
    actionButtons.classList.remove('hidden');

    // If no item is selected, disable all buttons
    if (appState.selectedItemIndex === null) {
        btnRowPlus.disabled = true;
        btnRowMinus.disabled = true;
        btnMoveUp.disabled = true;
        btnMoveDown.disabled = true;
        btnEditItem.disabled = true;
        return;
    }

    // Item is selected, enable/disable based on valid actions
    btnRowPlus.disabled = false; // Row + is always available when item selected
    btnRowMinus.disabled = !canDecreaseRow(appState.items, appState.selectedItemIndex);
    btnMoveUp.disabled = !canMoveUp(appState.items, appState.selectedItemIndex);
    btnMoveDown.disabled = !canMoveDown(appState.items, appState.selectedItemIndex);
    btnEditItem.disabled = false; // Edit is always available when item selected
}

function showEditModal(item, isNew) {
    const modal = document.getElementById('edit-modal');
    const modalTitle = document.getElementById('edit-modal-title');
    const eanInput = document.getElementById('edit-ean');
    const shelfSelect = document.getElementById('edit-shelf');
    const btnSave = document.getElementById('btn-save-edit');
    const btnCancel = document.getElementById('btn-cancel-edit');
    const eanLabel = document.getElementById('edit-ean-label');
    const shelfLabel = document.getElementById('edit-shelf-label');

    // Set modal title
    modalTitle.textContent = isNew ? t('addItem') : t('editItem');

    // Update labels
    eanLabel.textContent = t('eanRequired');
    shelfLabel.textContent = t('shelfRequired');

    eanInput.value = item.ean;

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

    modal.classList.remove('hidden');

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

        if (!newEan || !newShelf) {
            alert(t('eanShelfRequired'));
            return;
        }

        if (isNew) {
            // Add new item
            const newItem = { ...item, ean: newEan, shelf: newShelf };
            addItem(newItem);
            appState.items = sortItems(appState.items);
        } else {
            // Update existing item
            updateItem(appState.selectedItemIndex, { ean: newEan, shelf: newShelf });
            appState.items = sortItems(appState.items);
        }

        modal.classList.add('hidden');
        renderItemsList();
    });

    // Cancel button
    newBtnCancel.addEventListener('click', () => {
        modal.classList.add('hidden');
    });

    // Close on background click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.add('hidden');
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

    modal.classList.remove('hidden');

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
        modal.classList.add('hidden');
        showAddShelfModal();
    });

    // Add Item button
    newBtnAddItem.addEventListener('click', () => {
        modal.classList.add('hidden');

        const selectedItem = getSelectedItem();
        const row = selectedItem ? selectedItem.row : 1;
        const position = selectedItem ? selectedItem.position + 1 : 1;

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
            price: 0,
            stock: 0
        };

        showEditModal(newItem, true);
    });

    // Cancel button
    newBtnCancel.addEventListener('click', () => {
        modal.classList.add('hidden');
    });

    // Close on background click
    const closeOnBackground = (e) => {
        if (e.target === modal) {
            modal.classList.add('hidden');
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
    modal.classList.remove('hidden');

    // Remove old event listeners
    const newBtnSave = btnSave.cloneNode(true);
    const newBtnCancel = btnCancel.cloneNode(true);
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

        modal.classList.add('hidden');

        // Re-render to show the new shelf header
        renderItemsList();
    });

    // Cancel button
    newBtnCancel.addEventListener('click', () => {
        modal.classList.add('hidden');
    });

    // Close on background click
    const closeOnBackground = (e) => {
        if (e.target === modal) {
            modal.classList.add('hidden');
            modal.removeEventListener('click', closeOnBackground);
        }
    };
    modal.addEventListener('click', closeOnBackground);
}
