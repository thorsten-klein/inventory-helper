// Category Selection Screen Controller

function initCategoryScreen() {
    const categorySelect = document.getElementById('category-select');
    const btnStartEditing = document.getElementById('btn-start-editing');
    const btnBackUpload = document.getElementById('btn-back-upload');

    console.log('initCategoryScreen called');
    console.log('categorySelect element:', categorySelect);
    console.log('btnStartEditing element:', btnStartEditing);

    if (!categorySelect) {
        console.error('category-select element not found!');
        return;
    }

    if (!btnStartEditing) {
        console.error('btn-start-editing element not found!');
        return;
    }

    // Update UI language
    document.querySelector('#category-screen h1').textContent = t('selectCategory');
    document.querySelector('#category-screen label').textContent = t('chooseCategoryPrompt');
    btnBackUpload.textContent = t('back');
    btnStartEditing.textContent = t('next');

    // Populate category dropdown
    categorySelect.innerHTML = `<option value="">${t('selectCategoryPlaceholder')}</option>`;

    console.log('Categories found:', appState.categories);

    appState.categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        categorySelect.appendChild(option);
    });

    console.log('Category dropdown populated with', categorySelect.options.length, 'options');

    // Remove old event listeners by cloning the buttons
    const newBtnStart = btnStartEditing.cloneNode(true);
    const newBtnBack = btnBackUpload.cloneNode(true);
    newBtnStart.textContent = t('next');
    newBtnBack.textContent = t('back');
    btnStartEditing.parentNode.replaceChild(newBtnStart, btnStartEditing);
    btnBackUpload.parentNode.replaceChild(newBtnBack, btnBackUpload);

    // Back button handler
    newBtnBack.addEventListener('click', () => {
        showScreen('upload');
    });

    // Start editing button handler
    newBtnStart.addEventListener('click', () => {
        const selectedCategory = categorySelect.value;

        if (!selectedCategory) {
            alert(t('selectCategoryFirst'));
            return;
        }

        setSelectedCategory(selectedCategory);

        // Clear custom shelves for new category
        appState.customShelves = [];

        // Filter items by category
        const categoryItems = filterItemsByCategory(
            appState.uploadedData,
            selectedCategory
        );

        console.log('Filtered items:', categoryItems.length);

        // Sort items and normalize positions
        const sortedItems = normalizePositions(sortItems(categoryItems));
        setItems(sortedItems);

        // Show editor screen
        showScreen('editor');
        renderEditorScreen();
    });
}
