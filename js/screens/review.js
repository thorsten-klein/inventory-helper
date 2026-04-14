// Review Screen Controller

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
    const btnPrev = document.getElementById('btn-review-prev');
    const btnNext = document.getElementById('btn-review-next');

    // Get current item
    const currentItem = appState.items[appState.currentReviewIndex];
    const stockInfo = getStockCount(currentItem.id);

    // Display item details
    categoryName.textContent = appState.selectedCategory;
    eanEl.textContent = currentItem.ean || '-';
    articleEl.textContent = currentItem.article || '-';
    stockEl.textContent = stockInfo.counted;
    priceEl.textContent = currentItem.price ? `$${currentItem.price.toFixed(2)}` : '-';
    locationEl.textContent = `${currentItem.shelf} | ${currentItem.row} | ${currentItem.position}`;

    // Update stock diff display
    updateStockDiff(stockInfo.diff);

    // Update progress
    progressText.textContent = `Item ${appState.currentReviewIndex + 1} of ${appState.items.length}`;

    // Update button states
    btnPrev.disabled = appState.currentReviewIndex === 0;
    btnStockMinus.disabled = stockInfo.counted <= 0;

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
        } else {
            // Generate report and show report screen
            const reportData = generateReportData(appState.items);
            appState.reportData = reportData;
            showScreen('report');
            renderReportScreen();
        }
    };
}

function updateStockDiff(diff) {
    const stockDiffEl = document.getElementById('stock-diff');

    if (diff > 0) {
        stockDiffEl.textContent = `+${diff}`;
        stockDiffEl.className = 'stock-diff positive';
    } else if (diff < 0) {
        stockDiffEl.textContent = `${diff}`;
        stockDiffEl.className = 'stock-diff negative';
    } else {
        stockDiffEl.textContent = 'No change';
        stockDiffEl.className = 'stock-diff neutral';
    }
}
