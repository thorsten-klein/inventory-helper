// Category Selection Screen Controller

function initCategoryScreen() {
    const categorySelect = document.getElementById('category-select');
    const btnStartEditing = document.getElementById('btn-start-editing');
    const btnBackUpload = document.getElementById('btn-back-upload');
    const btnShowDuplicates = document.getElementById('btn-show-duplicates');
    const btnShowSearch = document.getElementById('btn-show-search');

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
    document.getElementById('additional-functionalities-label').textContent = t('additionalFunctionalities');
    btnBackUpload.textContent = t('back');
    btnStartEditing.textContent = t('next');
    btnShowDuplicates.textContent = t('showDuplicates');
    btnShowSearch.textContent = t('showDetails');

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
    const newBtnShowDuplicates = btnShowDuplicates.cloneNode(true);
    const newBtnShowSearch = btnShowSearch.cloneNode(true);
    newBtnStart.textContent = t('next');
    newBtnBack.textContent = t('back');
    newBtnShowDuplicates.textContent = t('showDuplicates');
    newBtnShowSearch.textContent = t('showDetails');
    btnStartEditing.parentNode.replaceChild(newBtnStart, btnStartEditing);
    btnBackUpload.parentNode.replaceChild(newBtnBack, btnBackUpload);
    btnShowDuplicates.parentNode.replaceChild(newBtnShowDuplicates, btnShowDuplicates);
    btnShowSearch.parentNode.replaceChild(newBtnShowSearch, btnShowSearch);

    // Back button handler
    newBtnBack.addEventListener('click', () => {
        showScreen('upload');
    });

    // Show duplicates button handler
    newBtnShowDuplicates.addEventListener('click', () => {
        showDuplicatesModal();
    });

    // Show search button handler
    newBtnShowSearch.addEventListener('click', () => {
        showSearchModal();
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

function showDuplicatesModal() {
    const modal = document.getElementById('duplicates-modal');
    const modalTitle = document.getElementById('duplicates-modal-title');
    const tbody = document.getElementById('duplicates-tbody');
    const btnClose = document.getElementById('btn-close-duplicates');

    modalTitle.textContent = t('duplicatesTitle');
    btnClose.textContent = t('close');

    // Find duplicates
    const duplicates = findDuplicateEANs(appState.uploadedData);

    tbody.innerHTML = '';

    if (duplicates.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `<td style="padding: 1rem; text-align: center;">${t('noDuplicatesFound')}</td>`;
        tbody.appendChild(row);
    } else {
        // Display duplicates count
        const countRow = document.createElement('tr');
        countRow.innerHTML = `<td style="padding: 1rem; font-weight: bold; background-color: #f0f0f0;">${t('duplicatesFound').replace('{count}', duplicates.length)}</td>`;
        tbody.appendChild(countRow);

        // Display each duplicate group
        duplicates.forEach(duplicate => {
            // EAN header row
            const eanRow = document.createElement('tr');
            const displayItemLabel = duplicate.hasDisplayItem ? ` <span style="background-color: #fbbf24; color: #000; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.85em; margin-left: 0.5rem;">${t('hasDisplayItem')}</span>` : '';
            eanRow.innerHTML = `<td style="padding: 0.75rem; font-weight: bold; background-color: #ffe5e5; border-top: 2px solid #ccc;">EAN: ${duplicate.ean}${displayItemLabel}</td>`;
            tbody.appendChild(eanRow);

            // Occurrences
            duplicate.occurrences.forEach(occurrence => {
                const occRow = document.createElement('tr');
                occRow.innerHTML = `<td style="padding: 0.5rem 0.75rem 0.5rem 2rem; border-left: 3px solid #ff6b6b;">
                    Category: <strong>${occurrence.category}</strong>,
                    Shelf: <strong>${occurrence.shelf}</strong>,
                    Row: <strong>${occurrence.row}</strong>,
                    Pos: <strong>${occurrence.position}</strong>
                </td>`;
                tbody.appendChild(occRow);
            });
        });
    }

    showModal(modal);

    // Close button
    btnClose.onclick = () => {
        hideModal(modal);
    };

    // Close on background click
    modal.onclick = (e) => {
        if (e.target === modal) {
            hideModal(modal);
        }
    };
}

function findDuplicateEANs(items) {
    if (!items || !Array.isArray(items)) return [];

    // Group items by EAN
    const eanGroups = {};
    items.forEach(item => {
        if (!item.ean) return;

        if (!eanGroups[item.ean]) {
            eanGroups[item.ean] = [];
        }
        eanGroups[item.ean].push(item);
    });

    // Find EANs with more than one occurrence
    const duplicates = [];

    Object.keys(eanGroups).forEach(ean => {
        const occurrences = eanGroups[ean];

        if (occurrences.length > 1) {
            // Filter out items that are next to each other (same shelf, same row, neighbor position)
            let nonAdjacentOccurrences = filterNonAdjacentItems(occurrences);

            if (nonAdjacentOccurrences.length > 1) {
                // Check if any occurrence has displayItem > 0
                const hasDisplayItem = nonAdjacentOccurrences.some(item => (item.displayItem || 0) > 0);

                duplicates.push({
                    ean: ean,
                    hasDisplayItem: hasDisplayItem,
                    occurrences: nonAdjacentOccurrences.map(item => ({
                        category: item.category || '-',
                        shelf: item.shelf || '-',
                        row: item.row || '-',
                        position: item.position || '-'
                    }))
                });
            }
        }
    });

    return duplicates;
}

function filterNonAdjacentItems(items) {
    if (items.length <= 1) return items;

    // Group by shelf and row
    const groups = {};
    items.forEach(item => {
        const key = `${item.shelf}|${item.row}`;
        if (!groups[key]) {
            groups[key] = [];
        }
        groups[key].push(item);
    });

    const result = [];

    Object.keys(groups).forEach(key => {
        const group = groups[key];

        if (group.length === 1) {
            // Only one item in this shelf/row, keep it
            result.push(group[0]);
        } else {
            // Sort by position
            const sortedGroup = group.sort((a, b) => (a.position || 0) - (b.position || 0));

            // Keep first item
            result.push(sortedGroup[0]);

            // Check for non-adjacent items
            for (let i = 1; i < sortedGroup.length; i++) {
                const prevPos = sortedGroup[i - 1].position || 0;
                const currPos = sortedGroup[i].position || 0;

                // If not adjacent (difference > 1), keep this item
                if (Math.abs(currPos - prevPos) > 1) {
                    result.push(sortedGroup[i]);
                }
            }
        }
    });

    return result;
}

function showSearchModal() {
    const modal = document.getElementById('search-modal');
    const modalTitle = document.getElementById('search-modal-title');
    const searchInput = document.getElementById('search-input');
    const searchInputLabel = document.getElementById('search-input-label');
    const btnSearch = document.getElementById('btn-search-execute');
    const btnClose = document.getElementById('btn-close-search');
    const resultsSection = document.getElementById('search-results-section');
    const resultsTitle = document.getElementById('search-results-title');
    const tbody = document.getElementById('search-results-tbody');

    modalTitle.textContent = t('searchTitle');
    searchInputLabel.textContent = t('searchPlaceholder');
    searchInput.placeholder = t('searchPlaceholder');
    btnSearch.textContent = t('search');
    btnClose.textContent = t('close');

    // Clear search input and hide results
    searchInput.value = '';
    resultsSection.classList.add('hidden');
    tbody.innerHTML = '';

    showModal(modal);

    // Search button handler
    btnSearch.onclick = () => {
        performSearch(searchInput.value.trim());
    };

    // Enter key handler
    searchInput.onkeypress = (e) => {
        if (e.key === 'Enter') {
            performSearch(searchInput.value.trim());
        }
    };

    // Close button
    btnClose.onclick = () => {
        hideModal(modal);
    };

    // Close on background click
    modal.onclick = (e) => {
        if (e.target === modal) {
            hideModal(modal);
        }
    };

    // Focus on input
    setTimeout(() => searchInput.focus(), 100);
}

function performSearch(pattern) {
    const resultsSection = document.getElementById('search-results-section');
    const resultsTitle = document.getElementById('search-results-title');
    const tbody = document.getElementById('search-results-tbody');

    if (!pattern) {
        alert(t('searchPlaceholder'));
        return;
    }

    // Search through all items
    const results = searchItems(appState.uploadedData, pattern);

    tbody.innerHTML = '';

    if (results.length === 0) {
        resultsSection.classList.remove('hidden');
        const row = document.createElement('tr');
        row.innerHTML = `<td style="padding: 1rem; text-align: center;">${t('noResultsFound')}</td>`;
        tbody.appendChild(row);
    } else {
        resultsSection.classList.remove('hidden');
        resultsTitle.textContent = t('resultsFound').replace('{count}', results.length);

        results.forEach(item => {
            const row = document.createElement('tr');
            row.style.cursor = 'pointer';
            row.style.transition = 'background-color 0.2s';

            const articleDisplay = item.article ? String(item.article).replace(/^0+/, '') || '0' : '-';
            const eanDisplay = item.ean || '-';
            const categoryDisplay = item.category || '-';
            const shelfDisplay = item.shelf || '-';
            const rowDisplay = item.row || '-';
            const posDisplay = item.position || '-';

            row.innerHTML = `
                <td style="padding: 0.75rem; border-bottom: 1px solid #e2e8f0;">
                    <div style="font-weight: bold; margin-bottom: 0.25rem;">EAN: ${eanDisplay}</div>
                    <div style="color: #64748b; font-size: 0.9em;">
                        Article: ${articleDisplay} | Category: ${categoryDisplay}<br>
                        Shelf: ${shelfDisplay} | Row: ${rowDisplay} | Pos: ${posDisplay}
                    </div>
                </td>
            `;

            row.onmouseover = () => {
                row.style.backgroundColor = '#f1f5f9';
            };

            row.onmouseout = () => {
                row.style.backgroundColor = '';
            };

            row.onclick = () => {
                showItemDetailsModal(item);
            };

            tbody.appendChild(row);
        });
    }
}

function searchItems(items, pattern) {
    if (!items || !Array.isArray(items)) return [];

    const lowerPattern = pattern.toLowerCase();
    const results = [];

    items.forEach(item => {
        // Search in all text fields
        const searchFields = [
            item.ean,
            item.article,
            item.category,
            item.shelf,
            item.row,
            item.position,
            item.stock
        ];

        // Also search in raw row data if available
        if (item._rawRow && Array.isArray(item._rawRow)) {
            searchFields.push(...item._rawRow);
        }

        // Check if any field contains the pattern
        const found = searchFields.some(field => {
            if (field === null || field === undefined) return false;
            return String(field).toLowerCase().includes(lowerPattern);
        });

        if (found) {
            results.push(item);
        }
    });

    return results;
}

