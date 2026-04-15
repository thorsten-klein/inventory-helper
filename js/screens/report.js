// Report Screen Controller

function renderReportScreen() {
    const reportTitle = document.getElementById('report-title');
    const reportCategory = document.getElementById('report-category');
    const summaryTotalLabel = document.getElementById('summary-total-label');
    const summaryChangedLabel = document.getElementById('summary-changed-label');
    const summaryTotal = document.getElementById('summary-total');
    const summaryChanged = document.getElementById('summary-changed');
    const reportTbody = document.getElementById('report-tbody');
    const btnExportChanges = document.getElementById('btn-export-changes');
    const btnExportAll = document.getElementById('btn-export-all');
    const btnShareChanges = document.getElementById('btn-share-changes');
    const btnShareAll = document.getElementById('btn-share-all');
    const btnEmailChanges = document.getElementById('btn-email-changes');
    const btnEmailAll = document.getElementById('btn-email-all');
    const btnBackReview = document.getElementById('btn-back-review');

    // Update UI text
    reportTitle.textContent = t('inventoryReport');
    reportCategory.textContent = appState.selectedCategory;
    summaryTotalLabel.textContent = t('totalItems');
    summaryChangedLabel.textContent = t('itemsChanged');
    btnExportChanges.textContent = t('exportChanges');
    btnExportAll.textContent = t('exportAll');
    btnBackReview.textContent = t('back');

    // Update legend
    document.getElementById('legend-correct').textContent = t('legendCorrect');
    document.getElementById('legend-new').textContent = t('legendNew');
    document.getElementById('legend-position').textContent = t('legendPosition');
    document.getElementById('legend-stock').textContent = t('legendStock');
    document.getElementById('legend-removed').textContent = t('legendRemoved');

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

    // Sort items: non-removed first, removed at the end
    const sortedData = [...appState.reportData].sort((a, b) => {
        if (a.removed && !b.removed) return 1;
        if (!a.removed && b.removed) return -1;
        return 0;
    });

    sortedData.forEach(item => {
        const row = document.createElement('tr');

        // Apply color class based on priority:
        // 1. Removed → red
        // 2. New → dark green
        // 3. Stock diff → blue
        // 4. Position changed (without stock diff) → yellow
        // 5. No changes → light green (default)
        if (item.removed) {
            row.classList.add('is-removed');
        } else if (item.isNew) {
            row.classList.add('is-new');
        } else if (item.stockDiff !== 0) {
            row.classList.add('has-diff');
        } else if (item.positionChanged) {
            row.classList.add('has-position-change');
        }
        // else: default light green background from CSS

        // Remove leading zeros from article number
        const articleDisplay = item.article ? String(item.article).replace(/^0+/, '') || '0' : '-';

        // Display location - show old value in parentheses if changed
        let shelfDisplay, rowDisplay, posDisplay, stockDisplay;

        if (item.removed) {
            shelfDisplay = '-';
            rowDisplay = '-';
            posDisplay = '-';
        } else if (item.positionChanged && !item.isNew) {
            // Show new value with old value in parentheses for changed positions
            shelfDisplay = item.originalShelf !== item.shelf ? `${item.shelf} (${item.originalShelf})` : item.shelf;
            rowDisplay = item.originalRow !== item.row ? `${item.row} (${item.originalRow})` : item.row;
            posDisplay = item.originalPosition !== item.position ? `${item.position} (${item.originalPosition})` : item.position;
        } else {
            shelfDisplay = item.shelf;
            rowDisplay = item.row;
            posDisplay = item.position;
        }

        // Display stock - show old value in parentheses if there's a diff
        if (item.stockDiff !== 0 && item.originalStock !== undefined) {
            stockDisplay = `${item.stock} (${item.originalStock})`;
        } else {
            stockDisplay = item.stock;
        }

        row.innerHTML = `
            <td>${articleDisplay}</td>
            <td>${item.ean}</td>
            <td>${shelfDisplay}</td>
            <td>${rowDisplay}</td>
            <td>${posDisplay}</td>
            <td>${stockDisplay}</td>
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

    // Share buttons (Web Share API)
    btnShareChanges.onclick = async () => {
        const filename = generateFilename(appState.selectedCategory, true);
        await shareReport(appState.reportData, filename, appState.selectedCategory, true);
    };

    btnShareAll.onclick = async () => {
        const filename = generateFilename(appState.selectedCategory, false);
        await shareReport(appState.reportData, filename, appState.selectedCategory, false);
    };

    // Email buttons
    btnEmailChanges.onclick = () => {
        const filename = generateFilename(appState.selectedCategory, true);
        exportToXLSX(appState.reportData, filename, true);
        openEmailWithReport(appState.selectedCategory, filename);
    };

    btnEmailAll.onclick = () => {
        const filename = generateFilename(appState.selectedCategory, false);
        exportToXLSX(appState.reportData, filename, false);
        openEmailWithReport(appState.selectedCategory, filename);
    };

    // Back button
    btnBackReview.onclick = () => {
        showScreen('review');
        renderReviewScreen();
    };
}

async function shareReport(data, filename, category, onlyChanges) {
    if (!navigator.canShare) {
        alert('Web Share API is not supported in your browser. Please use the export or email button instead.');
        return;
    }

    try {
        // Generate the file as a blob
        const blob = exportToXLSXAsBlob(data, filename, onlyChanges);
        const file = new File([blob], filename, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

        const now = new Date();
        const timestamp = now.toLocaleString(appState.currentLanguage === 'de' ? 'de-DE' : 'en-US');

        const shareData = {
            title: `${t('emailSubject')} ${category}`,
            text: t('emailBody')
                .replace('{category}', category)
                .replace('{timestamp}', timestamp),
            files: [file]
        };

        // Check if files can be shared
        if (navigator.canShare && navigator.canShare(shareData)) {
            await navigator.share(shareData);
        } else {
            alert('Sharing files is not supported. The file will be downloaded instead.');
            exportToXLSX(data, filename, onlyChanges);
        }
    } catch (error) {
        // User cancelled or error occurred
        if (error.name !== 'AbortError') {
            console.error('Error sharing:', error);
            alert('Error sharing file. The file will be downloaded instead.');
            exportToXLSX(data, filename, onlyChanges);
        }
    }
}

function openEmailWithReport(category, filename) {
    const now = new Date();
    const timestamp = now.toLocaleString(appState.currentLanguage === 'de' ? 'de-DE' : 'en-US');

    const subject = `${t('emailSubject')} ${category}`;
    const body = t('emailBody')
        .replace('{category}', category)
        .replace('{timestamp}', timestamp);

    const mailtoLink = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    // Use window.open() for better compatibility with Gmail and other webmail clients
    window.open(mailtoLink, '_blank');
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
