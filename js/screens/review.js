// Review Screen Controller

let touchStartX = 0;
let touchEndX = 0;

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

    // Get current item
    const currentItem = appState.items[appState.currentReviewIndex];
    const stockInfo = getStockCount(currentItem.id);

    // Remove leading zeros from article number
    const articleDisplay = currentItem.article ? String(currentItem.article).replace(/^0+/, '') || '0' : '-';

    // Display item details
    categoryName.textContent = appState.selectedCategory;

    // Show EAN with small label and big bold value
    eanEl.innerHTML = `<span class="ean-label">EAN:</span> <strong>${currentItem.ean || '-'}</strong>`;

    // Show Article Number with small label and big bold value
    articleEl.innerHTML = `<span class="article-label">Article Number:</span> <strong>${articleDisplay}</strong>`;

    stockEl.textContent = stockInfo.counted;
    priceEl.textContent = currentItem.price ? `Price: ${currentItem.price.toFixed(2)} €` : 'Price: -';
    locationEl.textContent = `Shelf: ${currentItem.shelf} | Row: ${currentItem.row} | Pos: ${currentItem.position}`;

    // Update stock diff display
    updateStockDiff(stockInfo.diff);

    // Update progress
    progressText.textContent = `Item ${appState.currentReviewIndex + 1} of ${appState.items.length}`;

    // Update button states
    btnPrev.disabled = appState.currentReviewIndex === 0;
    btnNext.disabled = appState.currentReviewIndex >= appState.items.length - 1;
    btnStockMinus.disabled = stockInfo.counted <= 0;

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
        }
    };

    // Next button
    btnNext.onclick = () => {
        if (appState.currentReviewIndex < appState.items.length - 1) {
            appState.currentReviewIndex++;
            renderReviewScreen();
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

    // Add swipe support
    setupSwipeHandlers();
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
        }
    } else {
        // Swipe right - Previous
        if (appState.currentReviewIndex > 0) {
            appState.currentReviewIndex--;
            renderReviewScreen();
        }
    }
}

function updateStockDiff(diff) {
    const stockDiffEl = document.getElementById('stock-diff');

    if (diff > 0) {
        stockDiffEl.textContent = `Diff: +${diff}`;
        stockDiffEl.className = 'stock-diff positive';
    } else if (diff < 0) {
        stockDiffEl.textContent = `Diff: ${diff}`;
        stockDiffEl.className = 'stock-diff negative';
    } else {
        stockDiffEl.textContent = 'Diff: 0';
        stockDiffEl.className = 'stock-diff neutral';
    }
}
