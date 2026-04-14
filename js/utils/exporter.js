// Export Utilities

function exportToXLSX(data, filename, onlyChanges = false) {
    // Filter data if only changes are needed
    const exportData = onlyChanges
        ? data.filter(item => item.stockDiff !== 0)
        : data;

    // Prepare worksheet data
    const wsData = [
        ['EAN', 'Row', 'Article Nr', 'Stock', 'Stock Diff']
    ];

    exportData.forEach(item => {
        wsData.push([
            item.ean,
            item.row,
            item.article,
            item.stock,
            item.stockDiff
        ]);
    });

    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Set column widths
    ws['!cols'] = [
        { wch: 15 }, // EAN
        { wch: 8 },  // Row
        { wch: 15 }, // Article Nr
        { wch: 10 }, // Stock
        { wch: 12 }  // Stock Diff
    ];

    // Apply styling to header row
    const range = XLSX.utils.decode_range(ws['!ref']);
    for (let C = range.s.c; C <= range.e.c; C++) {
        const address = XLSX.utils.encode_col(C) + "1";
        if (!ws[address]) continue;
        ws[address].s = {
            font: { bold: true },
            fill: { fgColor: { rgb: "2563eb" } }
        };
    }

    // Apply light red background to rows with differences
    for (let R = 1; R <= exportData.length; R++) {
        const item = exportData[R - 1];
        if (item && item.stockDiff !== 0) {
            for (let C = range.s.c; C <= range.e.c; C++) {
                const address = XLSX.utils.encode_col(C) + (R + 1);
                if (!ws[address]) continue;
                ws[address].s = {
                    fill: { fgColor: { rgb: "fee2e2" } }
                };
            }
        }
    }

    // Create workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inventory Report');

    // Generate and download file
    XLSX.writeFile(wb, filename);
}

function generateReportData(items) {
    return items.map(item => {
        const stockInfo = getStockCount(item.id) || {
            counted: item.stock,
            original: item.stock,
            diff: 0
        };

        return {
            ean: item.ean,
            row: item.row,
            article: item.article || '',
            stock: stockInfo.counted,
            originalStock: stockInfo.original,
            stockDiff: stockInfo.diff,
            shelf: item.shelf,
            position: item.position
        };
    });
}

function generateFilename(category) {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    const datetime = `${year}-${month}-${day}_${hours}${minutes}${seconds}`;
    const safeCategoryName = category.replace(/[^a-z0-9]/gi, '_');

    return `${safeCategoryName}-${datetime}.xlsx`;
}
