// Report Screen Controller

function renderReportScreen() {
    const reportTitle = document.getElementById('report-title');
    const summaryTotalLabel = document.getElementById('summary-total-label');
    const summaryChangedLabel = document.getElementById('summary-changed-label');
    const summaryTotal = document.getElementById('summary-total');
    const summaryChanged = document.getElementById('summary-changed');
    const reportTbody = document.getElementById('report-tbody');
    const btnExportChanges = document.getElementById('btn-export-changes');
    const btnExportAll = document.getElementById('btn-export-all');
    const btnBackReview = document.getElementById('btn-back-review');

    // Update UI text
    reportTitle.textContent = t('inventoryReport');
    summaryTotalLabel.textContent = t('totalItems');
    summaryChangedLabel.textContent = t('itemsChanged');
    btnExportChanges.textContent = t('exportChanges');
    btnExportAll.textContent = t('exportAll');
    btnBackReview.textContent = t('back');

    // Update table headers
    document.getElementById('th-article').textContent = t('articleNr');
    document.getElementById('th-ean').textContent = t('ean');
    document.getElementById('th-shelf').textContent = t('shelf');
    document.getElementById('th-row').textContent = t('row');
    document.getElementById('th-pos').textContent = t('pos');
    document.getElementById('th-stock').textContent = t('stock');
    document.getElementById('th-diff').textContent = t('diff');

    // Calculate summary
    const totalItems = appState.reportData.length;
    const changedItems = appState.reportData.filter(item => item.stockDiff !== 0 || item.positionChanged).length;

    summaryTotal.textContent = totalItems;
    summaryChanged.textContent = changedItems;

    // Render report table
    reportTbody.innerHTML = '';

    appState.reportData.forEach(item => {
        const row = document.createElement('tr');

        if (item.stockDiff !== 0) {
            row.classList.add('has-diff');
        }

        if (item.positionChanged) {
            row.classList.add('has-position-change');
        }

        // Remove leading zeros from article number
        const articleDisplay = item.article ? String(item.article).replace(/^0+/, '') || '0' : '-';

        row.innerHTML = `
            <td>${articleDisplay}</td>
            <td>${item.ean}</td>
            <td>${item.shelf}</td>
            <td>${item.row}</td>
            <td>${item.position}</td>
            <td>${item.stock}</td>
            <td class="diff-value ${getDiffClass(item.stockDiff)}">${formatDiff(item.stockDiff)}</td>
        `;

        reportTbody.appendChild(row);
    });

    // Export buttons
    btnExportChanges.onclick = () => {
        const filename = generateFilename(appState.selectedCategory, true);
        exportToXLSX(appState.reportData, filename, true);
    };

    btnExportAll.onclick = () => {
        const filename = generateFilename(appState.selectedCategory, false);
        exportToXLSX(appState.reportData, filename, false);
    };

    // Back button
    btnBackReview.onclick = () => {
        showScreen('review');
        renderReviewScreen();
    };
}

function getDiffClass(diff) {
    if (diff > 0) return 'positive';
    if (diff < 0) return 'negative';
    return 'neutral';
}

function formatDiff(diff) {
    if (diff > 0) return `+${diff}`;
    if (diff < 0) return `${diff}`;
    return '0';
}
