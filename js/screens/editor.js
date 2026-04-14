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
    const btnEditItem = document.getElementById('btn-edit-item');
    const btnStartReview = document.getElementById('btn-start-review');

    // Set category name
    categoryName.textContent = appState.selectedCategory;

    // Render items
    renderItemsList();

    // Add item button
    btnAddItem.addEventListener('click', () => {
        const selectedItem = getSelectedItem();
        const newItem = {
            id: `item-new-${Date.now()}`,
            category: appState.selectedCategory,
            ean: '',
            shelf: selectedItem ? selectedItem.shelf : '',
            row: selectedItem ? selectedItem.row : 1,
            position: selectedItem ? selectedItem.position + 1 : 1,
            article: '',
            price: 0,
            stock: 0
        };

        // Show edit modal for new item
        showEditModal(newItem, true);
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
            alert('No items to review');
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
}

function renderItemsList() {
    const itemsList = document.getElementById('items-list');
    itemsList.innerHTML = '';

    const groups = groupItemsByShelf(appState.items);
    const shelves = Object.keys(groups).sort(compareAlphanumeric);

    shelves.forEach(shelf => {
        // Add shelf header
        const shelfHeader = document.createElement('div');
        shelfHeader.className = 'shelf-header';
        shelfHeader.textContent = `Shelf ${shelf}`;
        itemsList.appendChild(shelfHeader);

        // Add items for this shelf
        const shelfItems = sortItems(groups[shelf]);
        shelfItems.forEach(item => {
            const itemIndex = appState.items.findIndex(i => i.id === item.id);
            const itemCard = createItemCard(item, itemIndex);
            itemsList.appendChild(itemCard);
        });
    });
}

function createItemCard(item, index) {
    const card = document.createElement('div');
    card.className = 'item-card';
    if (index === appState.selectedItemIndex) {
        card.classList.add('selected');
    }

    card.innerHTML = `
        <div class="item-header">
            <div class="item-field">
                <div class="item-label">EAN</div>
                <div class="item-value">${item.ean || '-'}</div>
            </div>
            <div class="item-field">
                <div class="item-label">Shelf</div>
                <div class="item-value">${item.shelf || '-'}</div>
            </div>
            <div class="item-field">
                <div class="item-label">Row</div>
                <div class="item-value">${item.row || '-'}</div>
            </div>
            <div class="item-field">
                <div class="item-label">Pos</div>
                <div class="item-value">${item.position || '-'}</div>
            </div>
        </div>
        <div class="item-article">
            <div class="item-article-label">Article Number</div>
            ${item.article || '-'}
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
    const btnRowMinus = document.getElementById('btn-row-minus');
    const btnMoveUp = document.getElementById('btn-move-up');
    const btnMoveDown = document.getElementById('btn-move-down');

    if (appState.selectedItemIndex === null) {
        actionButtons.classList.add('hidden');
        return;
    }

    actionButtons.classList.remove('hidden');

    // Update button states
    btnRowMinus.disabled = !canDecreaseRow(appState.items, appState.selectedItemIndex);
    btnMoveUp.disabled = !canMoveUp(appState.items, appState.selectedItemIndex);
    btnMoveDown.disabled = !canMoveDown(appState.items, appState.selectedItemIndex);
}

function showEditModal(item, isNew) {
    const modal = document.getElementById('edit-modal');
    const eanInput = document.getElementById('edit-ean');
    const shelfInput = document.getElementById('edit-shelf');
    const btnSave = document.getElementById('btn-save-edit');
    const btnCancel = document.getElementById('btn-cancel-edit');

    eanInput.value = item.ean;
    shelfInput.value = item.shelf;

    modal.classList.remove('hidden');

    // Remove old event listeners
    const newBtnSave = btnSave.cloneNode(true);
    const newBtnCancel = btnCancel.cloneNode(true);
    btnSave.parentNode.replaceChild(newBtnSave, btnSave);
    btnCancel.parentNode.replaceChild(newBtnCancel, btnCancel);

    // Save button
    newBtnSave.addEventListener('click', () => {
        const newEan = eanInput.value.trim();
        const newShelf = shelfInput.value.trim();

        if (!newEan || !newShelf) {
            alert('EAN and Shelf are required');
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
