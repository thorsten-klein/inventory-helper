// Review Screen Controller

let touchStartX = 0;
let touchEndX = 0;
let speechEnabled = false;

function renderReviewScreen() {
    const categoryName = document.getElementById('review-category-name');
    const eanEl = document.getElementById('review-ean');
    const articleEl = document.getElementById('review-article');
    const stockEl = document.getElementById('review-stock');
    const locationEl = document.getElementById('review-location');
    const stockDiffEl = document.getElementById('stock-diff');
    const progressText = document.getElementById('review-progress-text');
    const btnStockPlus = document.getElementById('btn-stock-plus');
    const btnStockMinus = document.getElementById('btn-stock-minus');
    const btnBack = document.getElementById('btn-review-back');
    const btnPrev = document.getElementById('btn-review-prev');
    const btnNext = document.getElementById('btn-review-next');
    const btnFinish = document.getElementById('btn-review-finish');
    const btnItemInfo = document.getElementById('btn-item-info');
    const btnToggleSpeech = document.getElementById('btn-toggle-speech');

    // Get current item from reviewItems (filtered list without removed items)
    const currentItem = appState.reviewItems[appState.currentReviewIndex];
    const stockInfo = getStockCount(currentItem.id);

    // Remove leading zeros from article number
    const articleDisplay = currentItem.article ? String(currentItem.article).replace(/^0+/, '') || '0' : '-';

    // Display item details with screen label
    categoryName.textContent = `${t('inventory')}: ${appState.selectedCategory}`;

    // Show EAN with small label and big bold value
    eanEl.innerHTML = `<span class="ean-label">${t('ean')}:</span> <strong>${currentItem.ean || '-'}</strong>`;

    // Show Article Number with small label and big bold value
    articleEl.innerHTML = `<span class="article-label">${t('articleNumber')}:</span> <strong>${articleDisplay}</strong>`;

    stockEl.textContent = stockInfo.counted;

    // Display location - show "-" with original value for removed items
    if (currentItem.removed) {
        locationEl.textContent = `${t('shelf')}: - (${currentItem.shelf}) | ${t('row')}: - (${currentItem.row}) | ${t('pos')}: - (${currentItem.position})`;
    } else {
        locationEl.textContent = `${t('shelf')}: ${currentItem.shelf} | ${t('row')}: ${currentItem.row} | ${t('pos')}: ${currentItem.position}`;
    }

    // Make location clickable to jump to items
    locationEl.classList.add('clickable');
    locationEl.onclick = () => {
        showJumpToItemModal();
    };

    // Update stock diff display
    updateStockDiff(stockInfo.diff);

    // Update progress
    progressText.textContent = `${t('item')} ${appState.currentReviewIndex + 1} ${t('of')} ${appState.reviewItems.length}`;

    // Update button text
    btnBack.textContent = t('back');
    btnPrev.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="15 18 9 12 15 6"></polyline>
    </svg>`;
    btnNext.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="9 18 15 12 9 6"></polyline>
    </svg>`;
    btnFinish.textContent = t('finish');
    document.getElementById('btn-details-text').textContent = t('details');

    // Update button states
    btnPrev.disabled = appState.currentReviewIndex === 0;
    btnNext.disabled = appState.currentReviewIndex >= appState.reviewItems.length - 1;
    btnStockMinus.disabled = stockInfo.counted <= 0;

    // Update speaker button state
    if (speechEnabled) {
        btnToggleSpeech.classList.add('active');
    } else {
        btnToggleSpeech.classList.remove('active');
    }

    // Toggle speech button
    btnToggleSpeech.onclick = () => {
        speechEnabled = !speechEnabled;
        btnToggleSpeech.classList.toggle('active', speechEnabled);

        // Speak current stock if enabling
        if (speechEnabled) {
            speakStock(stockInfo.counted);
        }
    };

    // Back button
    btnBack.onclick = () => {
        // Save the current item ID so we can return to it after editing
        appState.currentReviewItemId = currentItem.id;
        showScreen('editor');
        renderEditorScreen();
    };

    // Stock + button
    btnStockPlus.onclick = () => {
        const newCount = stockInfo.counted + 1;
        setStockCount(currentItem.id, newCount, stockInfo.original);
        renderReviewScreen();
    };

    // Stock - button
    btnStockMinus.onclick = () => {
        if (stockInfo.counted > 0) {
            const newCount = stockInfo.counted - 1;
            setStockCount(currentItem.id, newCount, stockInfo.original);
            renderReviewScreen();
        }
    };

    // Previous button
    btnPrev.onclick = () => {
        if (appState.currentReviewIndex > 0) {
            appState.currentReviewIndex--;
            renderReviewScreen();
            // Speak stock number after rendering if speech is enabled
            if (speechEnabled) {
                const prevItem = appState.reviewItems[appState.currentReviewIndex];
                const prevStockInfo = getStockCount(prevItem.id);
                speakStock(prevStockInfo.counted);
            }
        }
    };

    // Next button
    btnNext.onclick = () => {
        if (appState.currentReviewIndex < appState.reviewItems.length - 1) {
            appState.currentReviewIndex++;
            renderReviewScreen();
            // Speak stock number after rendering if speech is enabled
            if (speechEnabled) {
                const nextItem = appState.reviewItems[appState.currentReviewIndex];
                const nextStockInfo = getStockCount(nextItem.id);
                speakStock(nextStockInfo.counted);
            }
        }
    };

    // Finish button
    btnFinish.onclick = () => {
        // Generate report and show report screen
        const reportData = generateReportData(appState.items);
        appState.reportData = reportData;

        // Reset review state
        appState.reviewInProgress = false;
        appState.currentReviewIndex = 0;
        appState.currentReviewItemId = null;
        appState.reviewItems = [];

        showScreen('report');
        renderReportScreen();
    };

    // Item info button
    btnItemInfo.onclick = () => {
        showItemDetailsModal(currentItem);
    };

    // Add swipe support
    setupSwipeHandlers();

    // Add keyboard navigation
    setupKeyboardHandlers();
}

function showItemDetailsModal(item) {
    const modal = document.getElementById('item-details-modal');
    const modalTitle = document.getElementById('item-details-title');
    const tbody = document.getElementById('item-details-tbody');
    const btnClose = document.getElementById('btn-close-item-details');

    // Set title
    modalTitle.textContent = t('itemDetails');
    btnClose.textContent = t('close');

    // Get all columns from raw data
    const headers = appState.rawData[0] || [];
    const rowData = item._rawRow || [];

    tbody.innerHTML = '';

    // Display all columns from the original XLSX
    headers.forEach((header, index) => {
        const value = rowData[index];
        const displayValue = (value !== undefined && value !== null && value !== '')
            ? String(value)
            : '-';

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${header || `Column ${index + 1}`}</td>
            <td>${displayValue}</td>
        `;
        tbody.appendChild(row);
    });

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

function setupSwipeHandlers() {
    const reviewContainer = document.querySelector('.review-container');

    // Remove old listeners if any
    reviewContainer.ontouchstart = null;
    reviewContainer.ontouchend = null;

    reviewContainer.ontouchstart = (e) => {
        touchStartX = e.changedTouches[0].screenX;
    };

    reviewContainer.ontouchend = (e) => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    };
}

function handleSwipe() {
    const swipeThreshold = 50; // minimum distance to be considered a swipe
    const diff = touchStartX - touchEndX;

    if (Math.abs(diff) < swipeThreshold) return;

    if (diff > 0) {
        // Swipe left - Next
        if (appState.currentReviewIndex < appState.reviewItems.length - 1) {
            appState.currentReviewIndex++;
            renderReviewScreen();
            // Speak stock number if speech is enabled
            if (speechEnabled) {
                const currentItem = appState.reviewItems[appState.currentReviewIndex];
                const stockInfo = getStockCount(currentItem.id);
                speakStock(stockInfo.counted);
            }
        }
    } else {
        // Swipe right - Previous
        if (appState.currentReviewIndex > 0) {
            appState.currentReviewIndex--;
            renderReviewScreen();
            // Speak stock number if speech is enabled
            if (speechEnabled) {
                const currentItem = appState.reviewItems[appState.currentReviewIndex];
                const stockInfo = getStockCount(currentItem.id);
                speakStock(stockInfo.counted);
            }
        }
    }
}

function setupKeyboardHandlers() {
    // Remove old listener if any
    document.removeEventListener('keydown', handleReviewKeydown);

    // Add new listener
    document.addEventListener('keydown', handleReviewKeydown);
}

function handleReviewKeydown(e) {
    // Only handle arrow keys when on review screen
    const currentScreen = document.querySelector('.screen:not(.hidden)');
    if (!currentScreen || currentScreen.id !== 'review-screen') {
        return;
    }

    // Don't handle if user is typing in an input field
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
    }

    const currentItem = appState.reviewItems[appState.currentReviewIndex];
    const stockInfo = getStockCount(currentItem.id);

    if (e.key === 'ArrowUp') {
        // Increase stock count
        e.preventDefault();
        const newCount = stockInfo.counted + 1;
        setStockCount(currentItem.id, newCount, stockInfo.original);
        renderReviewScreen();
        // Speak stock number if speech is enabled
        if (speechEnabled) {
            speakStock(newCount);
        }
    } else if (e.key === 'ArrowDown') {
        // Decrease stock count
        e.preventDefault();
        if (stockInfo.counted > 0) {
            const newCount = stockInfo.counted - 1;
            setStockCount(currentItem.id, newCount, stockInfo.original);
            renderReviewScreen();
            // Speak stock number if speech is enabled
            if (speechEnabled) {
                speakStock(newCount);
            }
        }
    } else if (e.key === 'ArrowRight') {
        // Next item
        e.preventDefault();
        if (appState.currentReviewIndex < appState.reviewItems.length - 1) {
            appState.currentReviewIndex++;
            renderReviewScreen();
            // Speak stock number if speech is enabled
            if (speechEnabled) {
                const currentItem = appState.reviewItems[appState.currentReviewIndex];
                const stockInfo = getStockCount(currentItem.id);
                speakStock(stockInfo.counted);
            }
        }
    } else if (e.key === 'ArrowLeft') {
        // Previous item
        e.preventDefault();
        if (appState.currentReviewIndex > 0) {
            appState.currentReviewIndex--;
            renderReviewScreen();
            // Speak stock number if speech is enabled
            if (speechEnabled) {
                const currentItem = appState.reviewItems[appState.currentReviewIndex];
                const stockInfo = getStockCount(currentItem.id);
                speakStock(stockInfo.counted);
            }
        }
    }
}

function updateStockDiff(diff) {
    const stockDiffEl = document.getElementById('stock-diff');

    if (diff > 0) {
        stockDiffEl.textContent = `${t('diff')}: +${diff}`;
        stockDiffEl.className = 'stock-diff positive';
    } else if (diff < 0) {
        stockDiffEl.textContent = `${t('diff')}: ${diff}`;
        stockDiffEl.className = 'stock-diff negative';
    } else {
        stockDiffEl.textContent = `${t('diff')}: 0`;
        stockDiffEl.className = 'stock-diff neutral';
    }
}

function speakStock(count) {
    // Check if speech synthesis is available
    if ('speechSynthesis' in window) {
        // Cancel any ongoing speech
        window.speechSynthesis.cancel();

        // Create utterance
        const utterance = new SpeechSynthesisUtterance(String(count));

        // Set language based on current app language
        const currentLang = appState.currentLanguage || 'en';
        utterance.lang = currentLang === 'de' ? 'de-DE' : 'en-US';

        // Set voice properties
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        // Speak
        window.speechSynthesis.speak(utterance);
    }
}

let jumpModalTouchStartX = 0;
let jumpModalTouchEndX = 0;
let activeTabIndex = 0;
let shelfTabs = [];

function showJumpToItemModal() {
    const modal = document.getElementById('jump-to-item-modal');
    const modalTitle = document.getElementById('jump-to-item-title');
    const tabsContainer = document.getElementById('jump-tabs-container');
    const tabsContent = document.getElementById('jump-tabs-content');
    const btnClose = document.getElementById('btn-close-jump-to-item');

    // Set titles
    modalTitle.textContent = t('jumpToItem');
    btnClose.textContent = t('close');

    tabsContainer.innerHTML = '';
    tabsContent.innerHTML = '';

    // Group items by shelf
    const itemsByShelf = {};
    appState.reviewItems.forEach((item, index) => {
        if (!itemsByShelf[item.shelf]) {
            itemsByShelf[item.shelf] = [];
        }
        itemsByShelf[item.shelf].push({ ...item, originalIndex: index });
    });

    // Get sorted shelf names
    shelfTabs = Object.keys(itemsByShelf).sort((a, b) => {
        // Try to sort numerically if possible
        const numA = parseFloat(a);
        const numB = parseFloat(b);
        if (!isNaN(numA) && !isNaN(numB)) {
            return numA - numB;
        }
        return a.localeCompare(b);
    });

    // Find which shelf contains the current item
    const currentItem = appState.reviewItems[appState.currentReviewIndex];
    const currentShelfIndex = shelfTabs.indexOf(currentItem.shelf);
    activeTabIndex = currentShelfIndex >= 0 ? currentShelfIndex : 0;

    // Create tabs for each shelf
    shelfTabs.forEach((shelf, shelfIndex) => {
        const tab = document.createElement('button');
        tab.className = 'jump-tab';
        tab.textContent = `${t('shelf')}: ${shelf}`;
        if (shelfIndex === activeTabIndex) {
            tab.classList.add('active');
        }
        tab.onclick = () => switchToTab(shelfIndex);
        tabsContainer.appendChild(tab);

        // Create tab pane
        const pane = document.createElement('div');
        pane.className = 'jump-tab-pane';
        pane.id = `jump-tab-pane-${shelfIndex}`;
        if (shelfIndex === activeTabIndex) {
            pane.classList.add('active');
        }

        const table = document.createElement('table');
        table.className = 'jump-tab-table';

        // Add table header
        table.innerHTML = `
            <thead>
                <tr>
                    <th>${t('location')}</th>
                    <th>Info</th>
                </tr>
            </thead>
            <tbody></tbody>
        `;

        const tbody = table.querySelector('tbody');

        // Group items by row within this shelf
        const items = itemsByShelf[shelf];

        // Sort items by row and position
        items.sort((a, b) => {
            const rowDiff = Number(a.row) - Number(b.row);
            if (rowDiff !== 0) return rowDiff;
            return Number(a.position) - Number(b.position);
        });

        let lastRow = null;

        items.forEach((item) => {
            // Add row separator when row changes
            if (item.row !== lastRow) {
                const rowSeparator = document.createElement('tr');
                rowSeparator.style.backgroundColor = '#fafafa';
                rowSeparator.style.fontWeight = 'bold';
                rowSeparator.innerHTML = `
                    <td colspan="3" style="padding: 0.4rem 0.75rem; border-top: 1px solid #ccc; border-bottom: 1px solid #ccc; font-size: 0.9rem;">
                        ${t('row')}: ${item.row}
                    </td>
                `;
                tbody.appendChild(rowSeparator);
                lastRow = item.row;
            }

            const articleDisplay = item.article ? String(item.article).replace(/^0+/, '') || '0' : '-';
            const locationText = item.removed
                ? `- (${item.shelf}|${item.row}|${item.position})`
                : `${item.shelf}|${item.row}|${item.position}`;

            const row = document.createElement('tr');
            row.style.cursor = 'pointer';
            row.style.borderBottom = '1px solid #e0e0e0';

            // Highlight current item
            if (item.originalIndex === appState.currentReviewIndex) {
                row.style.backgroundColor = '#e3f2fd';
            }

            // Hover effect
            row.onmouseenter = () => {
                if (item.originalIndex !== appState.currentReviewIndex) {
                    row.style.backgroundColor = '#f5f5f5';
                }
            };
            row.onmouseleave = () => {
                if (item.originalIndex !== appState.currentReviewIndex) {
                    row.style.backgroundColor = '';
                }
            };

            row.innerHTML = `
                <td style="padding: 0.75rem;">
                    <strong style="font-size: 1.2rem; font-weight: bold;">${locationText}</strong>
                </td>
                <td style="padding: 0.75rem;">
                    <div style="display: flex; flex-direction: column; gap: 0.25rem;">
                        <strong style="font-weight: bold;">${articleDisplay}</strong>
                        <span style="font-size: 0.875rem;">${item.ean || '-'}</span>
                    </div>
                </td>
            `;

            // Click to jump to item
            row.onclick = () => {
                appState.currentReviewIndex = item.originalIndex;
                hideModal(modal);
                renderReviewScreen();
                // Speak stock if enabled
                if (speechEnabled) {
                    const stockInfo = getStockCount(item.id);
                    speakStock(stockInfo.counted);
                }
            };

            tbody.appendChild(row);
        });

        pane.appendChild(table);
        tabsContent.appendChild(pane);
    });

    // Setup swipe handlers for tabs
    setupJumpModalSwipeHandlers(tabsContent);

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

function switchToTab(tabIndex) {
    if (tabIndex < 0 || tabIndex >= shelfTabs.length) {
        return;
    }

    activeTabIndex = tabIndex;

    // Update tab buttons
    const tabs = document.querySelectorAll('.jump-tab');
    tabs.forEach((tab, index) => {
        if (index === tabIndex) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });

    // Update tab panes
    const panes = document.querySelectorAll('.jump-tab-pane');
    panes.forEach((pane, index) => {
        if (index === tabIndex) {
            pane.classList.add('active');
        } else {
            pane.classList.remove('active');
        }
    });

    // Scroll active tab into view
    const activeTab = tabs[tabIndex];
    if (activeTab) {
        activeTab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
}

function setupJumpModalSwipeHandlers(element) {
    element.ontouchstart = (e) => {
        jumpModalTouchStartX = e.changedTouches[0].screenX;
    };

    element.ontouchend = (e) => {
        jumpModalTouchEndX = e.changedTouches[0].screenX;
        handleJumpModalSwipe();
    };
}

function handleJumpModalSwipe() {
    const swipeThreshold = 50;
    const diff = jumpModalTouchStartX - jumpModalTouchEndX;

    if (Math.abs(diff) < swipeThreshold) return;

    if (diff > 0) {
        // Swipe left - Next tab
        switchToTab(activeTabIndex + 1);
    } else {
        // Swipe right - Previous tab
        switchToTab(activeTabIndex - 1);
    }
}
