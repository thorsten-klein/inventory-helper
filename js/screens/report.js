// Report Screen Controller

function renderReportScreen() {
    const summaryTotal = document.getElementById('summary-total');
    const summaryChanged = document.getElementById('summary-changed');
    const reportTbody = document.getElementById('report-tbody');
    const btnExportChanges = document.getElementById('btn-export-changes');
    const btnExportAll = document.getElementById('btn-export-all');

    // Calculate summary
    const totalItems = appState.reportData.length;
    const changedItems = appState.reportData.filter(item => item.stockDiff !== 0).length;

    summaryTotal.textContent = totalItems;
    summaryChanged.textContent = changedItems;

    // Render report table
    reportTbody.innerHTML = '';

    appState.reportData.forEach(item => {
        const row = document.createElement('tr');

        if (item.stockDiff !== 0) {
            row.classList.add('has-diff');
        }

        row.innerHTML = `
            <td>${item.ean}</td>
            <td>${item.row}</td>
            <td>${item.article || '-'}</td>
            <td>${item.stock}</td>
            <td class="diff-value ${getDiffClass(item.stockDiff)}">${formatDiff(item.stockDiff)}</td>
        `;

        reportTbody.appendChild(row);
    });

    // Export buttons
    btnExportChanges.onclick = () => {
        const filename = generateFilename(appState.selectedCategory);
        exportToXLSX(appState.reportData, filename, true);
    };

    btnExportAll.onclick = () => {
        const filename = generateFilename(appState.selectedCategory);
        exportToXLSX(appState.reportData, filename, false);
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
