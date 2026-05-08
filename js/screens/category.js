// Category Selection Screen Controller

function initCategoryScreen() {
    const categorySelect = document.getElementById('category-select');
    const btnStartEditing = document.getElementById('btn-start-editing');
    const btnBackUpload = document.getElementById('btn-back-upload');
    const btnShowDuplicates = document.getElementById('btn-show-duplicates');
    const btnSearchArticle = document.getElementById('btn-search-article');
    const btnShowDifference = document.getElementById('btn-show-difference');

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
    btnShowDuplicates.querySelector('span').textContent = t('showDuplicates');
    btnSearchArticle.querySelector('span').textContent = t('searchArticle');
    if (btnShowDifference) {
        btnShowDifference.querySelector('span').textContent = t('showDifference');
    }

    // Populate category dropdown
    categorySelect.innerHTML = `<option value="">${t('selectCategoryPlaceholder')}</option>`;

    // Add "New category" option as second item
    const newCategoryOption = document.createElement('option');
    newCategoryOption.value = '__NEW_CATEGORY__';
    newCategoryOption.textContent = t('newCategory');
    categorySelect.appendChild(newCategoryOption);

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
    const newBtnSearchArticle = btnSearchArticle.cloneNode(true);
    const newBtnShowDifference = btnShowDifference ? btnShowDifference.cloneNode(true) : null;
    newBtnStart.textContent = t('next');
    newBtnBack.textContent = t('back');
    newBtnShowDuplicates.querySelector('span').textContent = t('showDuplicates');
    newBtnSearchArticle.querySelector('span').textContent = t('searchArticle');
    if (newBtnShowDifference) {
        newBtnShowDifference.querySelector('span').textContent = t('showDifference');
    }
    btnStartEditing.parentNode.replaceChild(newBtnStart, btnStartEditing);
    btnBackUpload.parentNode.replaceChild(newBtnBack, btnBackUpload);
    btnShowDuplicates.parentNode.replaceChild(newBtnShowDuplicates, btnShowDuplicates);
    btnSearchArticle.parentNode.replaceChild(newBtnSearchArticle, btnSearchArticle);
    if (newBtnShowDifference && btnShowDifference) {
        btnShowDifference.parentNode.replaceChild(newBtnShowDifference, btnShowDifference);
    }

    // Back button handler
    newBtnBack.addEventListener('click', () => {
        // Only reset upload screen button states if there's no uploaded data
        if (!appState.uploadedData || appState.uploadedData.length === 0) {
            const btnNextCategory = document.getElementById('btn-next-category');
            const btnContinueWithoutData = document.getElementById('btn-continue-without-data');
            const configSection = document.getElementById('config-section');

            if (btnNextCategory) btnNextCategory.classList.add('hidden');
            if (btnContinueWithoutData) btnContinueWithoutData.classList.remove('hidden');
            if (configSection) configSection.classList.add('hidden');
        }

        showScreen('upload');
    });

    // Show duplicates button handler
    newBtnShowDuplicates.addEventListener('click', () => {
        showDuplicatesModal();
    });

    // Search article button handler
    newBtnSearchArticle.addEventListener('click', () => {
        showSearchModal();
    });

    // Show difference button handler
    if (newBtnShowDifference) {
        newBtnShowDifference.addEventListener('click', () => {
            showDifferenceModal();
        });
    }

    // Start editing button handler
    newBtnStart.addEventListener('click', () => {
        const selectedCategory = categorySelect.value;

        if (!selectedCategory) {
            alert(t('selectCategoryFirst'));
            return;
        }

        // Check if new category was selected
        if (selectedCategory === '__NEW_CATEGORY__') {
            const categoryName = prompt(t('enterCategoryName'));

            if (!categoryName || !categoryName.trim()) {
                // User cancelled or entered empty name
                return;
            }

            const trimmedCategoryName = categoryName.trim();

            // Set the new category
            setSelectedCategory(trimmedCategoryName);

            // Clear custom shelves for new category
            appState.customShelves = [];

            // Start with empty items for new category
            setItems([]);

            // Show editor screen
            showScreen('editor');
            renderEditorScreen();
        } else {
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
        }
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
    const btnScan = document.getElementById('btn-search-scan');
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

    // Scan button handler
    if (btnScan) {
        btnScan.onclick = async () => {
            // Set the target input for the barcode scanner
            barcodeScannerTargetInput = searchInput;
            try {
                await startEanBarcodeScanning();
            } catch (error) {
                console.error('Error starting barcode scanner:', error);
                alert('Unable to access camera. Please check camera permissions.');
                barcodeScannerTargetInput = null;
            }
        };
    }

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

function showDifferenceModal() {
    const modal = document.getElementById('difference-modal');
    const modalTitle = document.getElementById('difference-modal-title');
    const categorySelect = document.getElementById('difference-category');
    const categoryLabel = document.getElementById('difference-category-label');
    const inputTextarea = document.getElementById('difference-input');
    const inputLabel = document.getElementById('difference-input-label');
    const btnCancel = document.getElementById('btn-cancel-difference');
    const btnContinue = document.getElementById('btn-continue-difference');
    const resultsSection = document.getElementById('difference-results-section');

    // Set translations
    modalTitle.textContent = t('differenceTitle');
    categoryLabel.textContent = t('differenceCategoryLabel');
    inputLabel.textContent = t('differenceInputLabel');
    inputTextarea.placeholder = t('differenceInputPlaceholder');
    btnCancel.textContent = t('cancel');
    btnContinue.textContent = t('next');

    // Populate category dropdown
    categorySelect.innerHTML = '<option value="">Select a category...</option>';
    appState.categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        categorySelect.appendChild(option);
    });

    // Clear input and hide results
    inputTextarea.value = '';
    resultsSection.classList.add('hidden');

    showModal(modal);

    // Cancel button handler
    btnCancel.onclick = () => {
        hideModal(modal);
    };

    // Continue button handler
    btnContinue.onclick = () => {
        performDifferenceAnalysis();
    };

    // Close on background click
    modal.onclick = (e) => {
        if (e.target === modal) {
            hideModal(modal);
        }
    };

    // Focus on category select
    setTimeout(() => categorySelect.focus(), 100);
}

function performDifferenceAnalysis() {
    const categorySelect = document.getElementById('difference-category');
    const inputTextarea = document.getElementById('difference-input');
    const resultsSection = document.getElementById('difference-results-section');
    const additionalTbody = document.getElementById('difference-additional-tbody');
    const missingTbody = document.getElementById('difference-missing-tbody');
    const additionalTitle = document.getElementById('difference-additional-title');
    const missingTitle = document.getElementById('difference-missing-title');

    const selectedCategory = categorySelect.value;
    const inputText = inputTextarea.value.trim();

    // Validation
    if (!selectedCategory) {
        alert(t('selectCategoryFirst'));
        return;
    }

    if (!inputText) {
        alert(t('enterItemsFirst'));
        return;
    }

    // Parse input (split by newline, trim, remove empty lines)
    const inputItems = inputText
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);

    if (inputItems.length === 0) {
        alert(t('enterItemsFirst'));
        return;
    }

    // Get items in the selected category
    const categoryItems = filterItemsByCategory(appState.uploadedData, selectedCategory);

    // Create a set of EANs and article numbers from category items
    const categoryEANs = new Set();
    const categoryArticles = new Set();
    const itemByIdentifier = new Map();

    categoryItems.forEach(item => {
        if (item.ean) {
            const eanStr = String(item.ean).trim();
            categoryEANs.add(eanStr);
            itemByIdentifier.set(eanStr, item);
        }
        if (item.article) {
            const articleStr = String(item.article).trim();
            categoryArticles.add(articleStr);
            itemByIdentifier.set(articleStr, item);
        }
    });

    // Find additional items (in input, not in category)
    const additionalItems = [];
    inputItems.forEach(identifier => {
        if (!categoryEANs.has(identifier) && !categoryArticles.has(identifier)) {
            additionalItems.push(identifier);
        }
    });

    // Find missing items (in category, not in input)
    const inputSet = new Set(inputItems);
    const missingItems = [];
    categoryItems.forEach(item => {
        const ean = item.ean ? String(item.ean).trim() : null;
        const article = item.article ? String(item.article).trim() : null;

        const inInput = (ean && inputSet.has(ean)) || (article && inputSet.has(article));

        if (!inInput) {
            missingItems.push(item);
        }
    });

    // Display results
    resultsSection.classList.remove('hidden');
    additionalTitle.textContent = t('differenceAdditionalTitle');
    missingTitle.textContent = t('differenceMissingTitle');

    // Render additional items
    additionalTbody.innerHTML = '';
    if (additionalItems.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `<td style="padding: 1rem; text-align: center; color: #059669;">${t('noAdditionalItems')}</td>`;
        additionalTbody.appendChild(row);
    } else {
        additionalItems.forEach(identifier => {
            const row = document.createElement('tr');
            row.style.cursor = 'pointer';
            row.style.transition = 'background-color 0.2s';

            row.innerHTML = `
                <td style="padding: 0.75rem; border-bottom: 1px solid #e2e8f0;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <div style="font-weight: bold; color: #059669;">${identifier}</div>
                            <div style="color: #64748b; font-size: 0.9em;">Not found in category</div>
                        </div>
                        <button class="btn-magnifier-additional" style="padding: 0.5rem; cursor: pointer; background: none; border: none;">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="11" cy="11" r="8"></circle>
                                <path d="m21 21-4.35-4.35"></path>
                            </svg>
                        </button>
                    </div>
                </td>
            `;

            row.onmouseover = () => {
                row.style.backgroundColor = '#f1f5f9';
            };

            row.onmouseout = () => {
                row.style.backgroundColor = '';
            };

            // Click handler for magnifier icon
            const magnifierBtn = row.querySelector('.btn-magnifier-additional');
            magnifierBtn.onclick = (e) => {
                e.stopPropagation();
                showAdditionalItemDetails(identifier);
            };

            additionalTbody.appendChild(row);
        });
    }

    // Render missing items
    missingTbody.innerHTML = '';
    if (missingItems.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `<td style="padding: 1rem; text-align: center; color: #dc2626;">${t('noMissingItems')}</td>`;
        missingTbody.appendChild(row);
    } else {
        missingItems.forEach(item => {
            const row = document.createElement('tr');
            row.style.cursor = 'pointer';
            row.style.transition = 'background-color 0.2s';

            const articleDisplay = item.article ? String(item.article).replace(/^0+/, '') || '0' : '-';
            const eanDisplay = item.ean || '-';
            const shelfDisplay = item.shelf || '-';
            const rowDisplay = item.row || '-';
            const posDisplay = item.position || '-';

            row.innerHTML = `
                <td style="padding: 0.75rem; border-bottom: 1px solid #e2e8f0;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <div style="font-weight: bold; margin-bottom: 0.25rem; color: #dc2626;">EAN: ${eanDisplay}</div>
                            <div style="color: #64748b; font-size: 0.9em;">
                                Article: ${articleDisplay} | Shelf: ${shelfDisplay} | Row: ${rowDisplay} | Pos: ${posDisplay}
                            </div>
                        </div>
                        <button class="btn-magnifier" style="padding: 0.5rem; cursor: pointer; background: none; border: none;">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="11" cy="11" r="8"></circle>
                                <path d="m21 21-4.35-4.35"></path>
                            </svg>
                        </button>
                    </div>
                </td>
            `;

            row.onmouseover = () => {
                row.style.backgroundColor = '#f1f5f9';
            };

            row.onmouseout = () => {
                row.style.backgroundColor = '';
            };

            // Click handler for magnifier icon
            const magnifierBtn = row.querySelector('.btn-magnifier');
            magnifierBtn.onclick = (e) => {
                e.stopPropagation();
                showItemDetailsModal(item);
            };

            missingTbody.appendChild(row);
        });
    }
}

function showAdditionalItemDetails(identifier) {
    // Try to find the item in the uploaded data (search across all categories)
    let foundItem = null;

    if (appState.uploadedData && Array.isArray(appState.uploadedData)) {
        foundItem = appState.uploadedData.find(item => {
            const ean = item.ean ? String(item.ean).trim() : null;
            const article = item.article ? String(item.article).trim() : null;

            return (ean === identifier) || (article === identifier);
        });
    }

    if (foundItem) {
        // Item found in Excel data - show full details
        showItemDetailsModal(foundItem);
    } else {
        // Item not found in Excel data - show minimal details with "-" for missing fields
        const modal = document.getElementById('item-details-modal');
        const modalTitle = document.getElementById('item-details-title');
        const tbody = document.getElementById('item-details-tbody');
        const btnClose = document.getElementById('btn-close-item-details');

        // Set title
        modalTitle.textContent = t('itemDetails');
        btnClose.textContent = t('close');

        // Determine if identifier is EAN (13 digits) or article number
        const isEAN = /^\d{13}$/.test(identifier);

        // Get headers from raw data if available
        const headers = appState.rawData && appState.rawData[0] ? appState.rawData[0] : [];

        tbody.innerHTML = '';

        if (headers.length > 0) {
            // Show all Excel columns with "-" except for the identifier
            headers.forEach((header, index) => {
                let displayValue = '-';

                // Try to match the identifier to a column based on type
                const headerLower = String(header).toLowerCase();

                if (isEAN && headerLower.includes('ean')) {
                    // 13 digits = EAN
                    displayValue = identifier;
                } else if (!isEAN && (headerLower.includes('article') || headerLower.includes('artikel'))) {
                    // Not 13 digits = article number
                    displayValue = identifier;
                }

                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${header || `Column ${index + 1}`}</td>
                    <td>${displayValue}</td>
                `;
                tbody.appendChild(row);
            });
        } else {
            // No headers available, show minimal info with correct label
            const labelRow = document.createElement('tr');
            const label = isEAN ? 'EAN' : 'Article Number';
            labelRow.innerHTML = `
                <td>${label}</td>
                <td>${identifier}</td>
            `;
            tbody.appendChild(labelRow);

            const noteRow = document.createElement('tr');
            noteRow.innerHTML = `
                <td colspan="2" style="font-style: italic; color: #64748b; padding-top: 1rem;">No additional details available - item not found in uploaded data</td>
            `;
            tbody.appendChild(noteRow);
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
}

