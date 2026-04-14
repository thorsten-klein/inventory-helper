// Upload Screen Controller

function initUploadScreen() {
    const fileInput = document.getElementById('file-input');
    const fileName = document.getElementById('file-name');
    const configSection = document.getElementById('config-section');
    const btnNextCategory = document.getElementById('btn-next-category');
    const langEnBtn = document.getElementById('lang-en');
    const langDeBtn = document.getElementById('lang-de');

    // Initialize language
    initLanguage();
    updateLanguageButtons();
    updateUploadScreenLanguage();

    // Language change handlers
    langEnBtn.addEventListener('click', () => {
        setLanguage('en');
        updateLanguageButtons();
        updateUploadScreenLanguage();
    });

    langDeBtn.addEventListener('click', () => {
        setLanguage('de');
        updateLanguageButtons();
        updateUploadScreenLanguage();
    });

    // File input change handler
    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const loadingProgress = document.getElementById('loading-progress');
        const loadingText = document.getElementById('loading-text');
        const progressFill = document.getElementById('progress-fill');

        fileName.textContent = `${t('selected')}: ${file.name}`;

        // Show loading progress
        loadingProgress.classList.remove('hidden');
        loadingText.textContent = t('loadingFile');
        progressFill.style.width = '0%';

        // Simulate progress animation
        let progress = 0;
        const progressInterval = setInterval(() => {
            progress += Math.random() * 30;
            if (progress > 90) progress = 90;
            progressFill.style.width = progress + '%';
        }, 100);

        try {
            const result = await parseXLSXFile(file);
            appState.uploadedData = result.data;

            // Complete the progress bar
            clearInterval(progressInterval);
            progressFill.style.width = '100%';

            // Wait a bit to show completion
            await new Promise(resolve => setTimeout(resolve, 300));

            // Populate column selectors with headers
            const headers = result.data[0] || [];
            populateColumnSelectors(result.columns, headers);

            // Hide loading progress and show configuration section
            loadingProgress.classList.add('hidden');
            configSection.classList.remove('hidden');
        } catch (error) {
            clearInterval(progressInterval);
            loadingProgress.classList.add('hidden');
            alert(t('errorReadingFile') + ' ' + error.message);
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
                alert(t('noValidItems'));
                return;
            }

            // Get unique categories
            const categories = extractUniqueCategories(allItems);
            console.log('Unique categories:', categories);

            if (categories.length === 0) {
                alert(t('noCategories'));
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
        { id: 'col-category', default: 'F', label: 'categories' },
        { id: 'col-ean', default: 'C', label: 'ean' },
        { id: 'col-shelf', default: 'G', label: 'shelf' },
        { id: 'col-row', default: 'D', label: 'row' },
        { id: 'col-position', default: 'E', label: 'position' },
        { id: 'col-article', default: 'I', label: 'articleNumber' },
        { id: 'col-price', default: 'L', label: 'price' },
        { id: 'col-stock', default: 'S', label: 'stock' }
    ];

    selectors.forEach(({ id, default: defaultValue, label }) => {
        const select = document.getElementById(id);
        const labelEl = document.querySelector(`label[for="${id}"]`);

        // Update label text
        if (labelEl) {
            labelEl.textContent = t(label);
        }

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

function updateLanguageButtons() {
    const langEnBtn = document.getElementById('lang-en');
    const langDeBtn = document.getElementById('lang-de');

    langEnBtn.classList.toggle('active', appState.currentLanguage === 'en');
    langDeBtn.classList.toggle('active', appState.currentLanguage === 'de');
}

function updateUploadScreenLanguage() {
    // Update title
    document.getElementById('upload-title').textContent = t('uploadTitle');

    // Update file upload button
    const fileUploadLabel = document.getElementById('file-upload-label');
    const svg = fileUploadLabel.querySelector('svg');
    fileUploadLabel.textContent = t('chooseFile');
    if (svg) {
        fileUploadLabel.insertBefore(svg, fileUploadLabel.firstChild);
    }

    // Update config section title
    const configTitle = document.querySelector('.config-section h2');
    if (configTitle) {
        configTitle.textContent = t('columnConfig');
    }

    // Update Next button
    const btnNext = document.getElementById('btn-next-category');
    if (btnNext) {
        btnNext.textContent = t('next');
    }

    // Update column labels
    const labels = {
        'col-category': 'categories',
        'col-ean': 'ean',
        'col-shelf': 'shelf',
        'col-row': 'row',
        'col-position': 'position',
        'col-article': 'articleNumber',
        'col-price': 'price',
        'col-stock': 'stock'
    };

    Object.entries(labels).forEach(([id, key]) => {
        const labelEl = document.querySelector(`label[for="${id}"]`);
        if (labelEl) {
            labelEl.textContent = t(key);
        }
    });
}
