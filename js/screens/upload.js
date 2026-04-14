// Upload Screen Controller

function initUploadScreen() {
    const fileInput = document.getElementById('file-input');
    const fileName = document.getElementById('file-name');
    const configSection = document.getElementById('config-section');
    const btnNextCategory = document.getElementById('btn-next-category');

    // File input change handler
    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        fileName.textContent = `Selected: ${file.name}`;

        try {
            const result = await parseXLSXFile(file);
            appState.uploadedData = result.data;

            // Populate column selectors with headers
            const headers = result.data[0] || [];
            populateColumnSelectors(result.columns, headers);

            // Show configuration section
            configSection.classList.remove('hidden');
        } catch (error) {
            alert('Error reading file: ' + error.message);
        }
    });

    // Next button handler
    btnNextCategory.addEventListener('click', () => {
        try {
            console.log('Next button clicked');

            // Get column mappings
            const mapping = {
                category: document.getElementById('col-category').value,
                ean: document.getElementById('col-ean').value,
                shelf: document.getElementById('col-shelf').value,
                row: document.getElementById('col-row').value,
                position: document.getElementById('col-position').value,
                article: document.getElementById('col-article').value,
                price: document.getElementById('col-price').value,
                stock: document.getElementById('col-stock').value
            };

            console.log('Column mapping:', mapping);

            setColumnMapping(mapping);

            // Extract all data
            const allItems = extractDataWithMapping(appState.rawData, mapping);
            console.log('Extracted items:', allItems.length);

            if (allItems.length === 0) {
                alert('No valid items found. Please check that your file has data with both EAN and Category values.');
                return;
            }

            // Get unique categories
            const categories = extractUniqueCategories(allItems);
            console.log('Unique categories:', categories);

            if (categories.length === 0) {
                alert('No categories found in the data.');
                return;
            }

            setCategories(categories);

            // Store all uploaded items
            appState.uploadedData = allItems;

            // Show category screen
            showScreen('category');
            initCategoryScreen();
        } catch (error) {
            console.error('Error processing file:', error);
            alert('Error processing file: ' + error.message);
        }
    });
}

function populateColumnSelectors(columns, headers) {
    const selectors = [
        { id: 'col-category', default: 'F' },
        { id: 'col-ean', default: 'C' },
        { id: 'col-shelf', default: 'G' },
        { id: 'col-row', default: 'D' },
        { id: 'col-position', default: 'E' },
        { id: 'col-article', default: 'I' },
        { id: 'col-price', default: 'L' },
        { id: 'col-stock', default: 'S' }
    ];

    selectors.forEach(({ id, default: defaultValue }) => {
        const select = document.getElementById(id);
        select.innerHTML = '';

        columns.forEach((col, index) => {
            const option = document.createElement('option');
            option.value = col;

            // Get header text for this column
            const headerText = headers[index] ? String(headers[index]).trim() : '';

            // Display format: "A: Header Text" or just "A" if no header
            option.textContent = headerText ? `${col}: ${headerText}` : col;

            if (col === defaultValue) {
                option.selected = true;
            }
            select.appendChild(option);
        });
    });
}
