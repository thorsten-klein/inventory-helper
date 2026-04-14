// Export Utilities

function exportToXLSX(data, filename, onlyChanges = false) {
    // Filter data if only changes are needed
    const exportData = onlyChanges
        ? data.filter(item => item.stockDiff !== 0 || item.positionChanged)
        : data;

    // Prepare worksheet data
    const wsData = [
        ['Article Nr', 'EAN', 'Shelf', 'Row', 'Pos', 'Stock', 'Diff']
    ];

    exportData.forEach(item => {
        // Remove leading zeros from article number
        const articleDisplay = item.article ? String(item.article).replace(/^0+/, '') || '0' : '';

        wsData.push([
            articleDisplay,
            item.ean,
            item.shelf,
            item.row,
            item.position,
            item.stock,
            item.stockDiff
        ]);
    });

    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Set column widths
    ws['!cols'] = [
        { wch: 15 }, // Article Nr
        { wch: 15 }, // EAN
        { wch: 12 }, // Shelf
        { wch: 8 },  // Row
        { wch: 8 },  // Pos
        { wch: 10 }, // Stock
        { wch: 10 }  // Diff
    ];

    // Define border style
    const border = {
        top: { style: 'thin', color: { rgb: '000000' } },
        bottom: { style: 'thin', color: { rgb: '000000' } },
        left: { style: 'thin', color: { rgb: '000000' } },
        right: { style: 'thin', color: { rgb: '000000' } }
    };

    // Apply styling to all cells
    const range = XLSX.utils.decode_range(ws['!ref']);

    // Style header row (light grey background, bold, borders)
    for (let C = range.s.c; C <= range.e.c; C++) {
        const address = XLSX.utils.encode_col(C) + "1";
        if (!ws[address]) continue;
        ws[address].s = {
            font: { bold: true, color: { rgb: '000000' } },
            fill: { fgColor: { rgb: 'D3D3D3' } },
            alignment: { horizontal: 'center', vertical: 'center' },
            border: border
        };
    }

    // Apply borders and backgrounds to rows with changes
    for (let R = 1; R <= exportData.length; R++) {
        const item = exportData[R - 1];
        const hasStockChange = item && item.stockDiff !== 0;
        const hasPositionChange = item && item.positionChanged;

        for (let C = range.s.c; C <= range.e.c; C++) {
            const address = XLSX.utils.encode_col(C) + (R + 1);
            if (!ws[address]) continue;

            ws[address].s = {
                border: border,
                alignment: { horizontal: 'left', vertical: 'center' }
            };

            // Add light red background for rows with stock differences
            if (hasStockChange) {
                ws[address].s.fill = { fgColor: { rgb: 'FFE5E5' } };
            }
            // Add bright yellow background for rows with position changes
            else if (hasPositionChange) {
                ws[address].s.fill = { fgColor: { rgb: 'FFFF99' } };
            }
        }
    }

    // Create workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inventory Report');

    // Generate and download file
    XLSX.writeFile(wb, filename);
}

function exportToXLSXAsBlob(data, filename, onlyChanges = false) {
    // Filter data if only changes are needed
    const exportData = onlyChanges
        ? data.filter(item => item.stockDiff !== 0 || item.positionChanged)
        : data;

    // Prepare worksheet data
    const wsData = [
        ['Article Nr', 'EAN', 'Shelf', 'Row', 'Pos', 'Stock', 'Diff']
    ];

    exportData.forEach(item => {
        // Remove leading zeros from article number
        const articleDisplay = item.article ? String(item.article).replace(/^0+/, '') || '0' : '';

        wsData.push([
            articleDisplay,
            item.ean,
            item.shelf,
            item.row,
            item.position,
            item.stock,
            item.stockDiff
        ]);
    });

    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Set column widths
    ws['!cols'] = [
        { wch: 15 }, // Article Nr
        { wch: 15 }, // EAN
        { wch: 12 }, // Shelf
        { wch: 8 },  // Row
        { wch: 8 },  // Pos
        { wch: 10 }, // Stock
        { wch: 10 }  // Diff
    ];

    // Define border style
    const border = {
        top: { style: 'thin', color: { rgb: '000000' } },
        bottom: { style: 'thin', color: { rgb: '000000' } },
        left: { style: 'thin', color: { rgb: '000000' } },
        right: { style: 'thin', color: { rgb: '000000' } }
    };

    // Apply styling to all cells
    const range = XLSX.utils.decode_range(ws['!ref']);

    // Style header row
    for (let C = range.s.c; C <= range.e.c; C++) {
        const address = XLSX.utils.encode_col(C) + "1";
        if (!ws[address]) continue;
        ws[address].s = {
            font: { bold: true, color: { rgb: '000000' } },
            fill: { fgColor: { rgb: 'D3D3D3' } },
            alignment: { horizontal: 'center', vertical: 'center' },
            border: border
        };
    }

    // Apply borders and backgrounds to rows with changes
    for (let R = 1; R <= exportData.length; R++) {
        const item = exportData[R - 1];
        const hasStockChange = item && item.stockDiff !== 0;
        const hasPositionChange = item && item.positionChanged;

        for (let C = range.s.c; C <= range.e.c; C++) {
            const address = XLSX.utils.encode_col(C) + (R + 1);
            if (!ws[address]) continue;

            ws[address].s = {
                border: border,
                alignment: { horizontal: 'left', vertical: 'center' }
            };

            if (hasStockChange) {
                ws[address].s.fill = { fgColor: { rgb: 'FFE5E5' } };
            } else if (hasPositionChange) {
                ws[address].s.fill = { fgColor: { rgb: 'FFFF99' } };
            }
        }
    }

    // Create workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inventory Report');

    // Generate blob instead of downloading
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    return new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

function generateReportData(items) {
    return items.map(item => {
        const stockInfo = getStockCount(item.id) || {
            counted: item.stock,
            original: item.stock,
            diff: 0
        };

        // Check if position has changed
        const originalShelf = item.originalShelf || item.shelf;
        const positionChanged = item.originalRow !== item.row ||
                                item.originalPosition !== item.position ||
                                originalShelf !== item.shelf;

        return {
            ean: item.ean,
            row: item.row,
            article: item.article || '',
            stock: stockInfo.counted,
            originalStock: stockInfo.original,
            stockDiff: stockInfo.diff,
            shelf: item.shelf,
            position: item.position,
            originalRow: item.originalRow,
            originalPosition: item.originalPosition,
            originalShelf: originalShelf,
            positionChanged: positionChanged
        };
    });
}

function generateFilename(category, onlyChanges = false) {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    const datetime = `${year}-${month}-${day}_${hours}${minutes}${seconds}`;
    const safeCategoryName = category.replace(/[^a-z0-9]/gi, '_');

    if (onlyChanges) {
        return `${safeCategoryName}-inventory-diff-${datetime}.xlsx`;
    } else {
        return `${safeCategoryName}-inventory-${datetime}.xlsx`;
    }
}
