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
    document.getElementById('legend-position').textContent = t('legendPosition');
    document.getElementById('legend-stock').textContent = t('legendStock');

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
