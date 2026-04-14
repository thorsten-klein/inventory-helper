// Category Selection Screen Controller

function initCategoryScreen() {
    const categorySelect = document.getElementById('category-select');
    const btnStartEditing = document.getElementById('btn-start-editing');

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

    // Populate category dropdown
    categorySelect.innerHTML = '<option value="">-- Select a category --</option>';

    console.log('Categories found:', appState.categories);

    appState.categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        categorySelect.appendChild(option);
    });

    console.log('Category dropdown populated with', categorySelect.options.length, 'options');

    // Remove old event listener by cloning the button
    const newBtn = btnStartEditing.cloneNode(true);
    btnStartEditing.parentNode.replaceChild(newBtn, btnStartEditing);

    // Start editing button handler
    newBtn.addEventListener('click', () => {
        const selectedCategory = categorySelect.value;

        if (!selectedCategory) {
            alert('Please select a category');
            return;
        }

        setSelectedCategory(selectedCategory);

        // Filter items by category
        const categoryItems = filterItemsByCategory(
            appState.uploadedData,
            selectedCategory
        );

        console.log('Filtered items:', categoryItems.length);

        // Sort items
        const sortedItems = sortItems(categoryItems);
        setItems(sortedItems);

        // Show editor screen
        showScreen('editor');
        renderEditorScreen();
    });
}
