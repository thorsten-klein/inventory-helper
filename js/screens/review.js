// Review Screen Controller

let touchStartX = 0;
let touchEndX = 0;
let speechEnabled = false;

function renderReviewScreen() {
    const categoryName = document.getElementById('review-category-name');
    const eanEl = document.getElementById('review-ean');
    const articleEl = document.getElementById('review-article');
    const stockEl = document.getElementById('review-stock');
    const priceEl = document.getElementById('review-price');
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

    // Get current item
    const currentItem = appState.items[appState.currentReviewIndex];
    const stockInfo = getStockCount(currentItem.id);

    // Remove leading zeros from article number
    const articleDisplay = currentItem.article ? String(currentItem.article).replace(/^0+/, '') || '0' : '-';

    // Display item details
    categoryName.textContent = appState.selectedCategory;

    // Show EAN with small label and big bold value
    eanEl.innerHTML = `<span class="ean-label">${t('ean')}:</span> <strong>${currentItem.ean || '-'}</strong>`;

    // Show Article Number with small label and big bold value
    articleEl.innerHTML = `<span class="article-label">${t('articleNumber')}:</span> <strong>${articleDisplay}</strong>`;

    stockEl.textContent = stockInfo.counted;
    priceEl.textContent = currentItem.price ? `${t('price')}: ${currentItem.price.toFixed(2)} €` : `${t('price')}: -`;
    locationEl.textContent = `${t('shelf')}: ${currentItem.shelf} | ${t('row')}: ${currentItem.row} | ${t('pos')}: ${currentItem.position}`;

    // Update stock diff display
    updateStockDiff(stockInfo.diff);

    // Update progress
    progressText.textContent = `${t('item')} ${appState.currentReviewIndex + 1} ${t('of')} ${appState.items.length}`;

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
    btnNext.disabled = appState.currentReviewIndex >= appState.items.length - 1;
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
                const prevItem = appState.items[appState.currentReviewIndex];
                const prevStockInfo = getStockCount(prevItem.id);
                speakStock(prevStockInfo.counted);
            }
        }
    };

    // Next button
    btnNext.onclick = () => {
        if (appState.currentReviewIndex < appState.items.length - 1) {
            appState.currentReviewIndex++;
            renderReviewScreen();
            // Speak stock number after rendering if speech is enabled
            if (speechEnabled) {
                const nextItem = appState.items[appState.currentReviewIndex];
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
        showScreen('report');
        renderReportScreen();
    };

    // Item info button
    btnItemInfo.onclick = () => {
        showItemDetailsModal(currentItem);
    };

    // Add swipe support
    setupSwipeHandlers();
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

    modal.classList.remove('hidden');

    // Close button
    btnClose.onclick = () => {
        modal.classList.add('hidden');
    };

    // Close on background click
    modal.onclick = (e) => {
        if (e.target === modal) {
            modal.classList.add('hidden');
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
        if (appState.currentReviewIndex < appState.items.length - 1) {
            appState.currentReviewIndex++;
            renderReviewScreen();
            // Speak stock number if speech is enabled
            if (speechEnabled) {
                const currentItem = appState.items[appState.currentReviewIndex];
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
                const currentItem = appState.items[appState.currentReviewIndex];
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
