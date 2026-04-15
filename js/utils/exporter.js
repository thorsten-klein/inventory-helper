// Export Utilities

function exportToXLSX(data, filename, onlyChanges = false) {
    // Filter data if only changes are needed
    const exportData = onlyChanges
        ? data.filter(item => item.stockDiff !== 0 || item.positionChanged || item.isNew)
        : data;

    // Prepare worksheet data
    const wsData = [
        ['Article Nr', 'EAN', 'Shelf', 'Row', 'Pos', 'Shelf (old)', 'Row (old)', 'Pos (old)', 'Stock', 'Diff', 'Info']
    ];

    exportData.forEach(item => {
        // Remove leading zeros from article number
        const articleDisplay = item.article ? String(item.article).replace(/^0+/, '') || '0' : '';

        // Determine old values - only show if position changed and not a new item
        const shelfOld = (item.positionChanged && !item.isNew) ? (item.originalShelf || '') : '';
        const rowOld = (item.positionChanged && !item.isNew) ? (item.originalRow || '') : '';
        const posOld = (item.positionChanged && !item.isNew) ? (item.originalPosition || '') : '';

        // Determine info text
        let info = '';
        if (item.removed) {
            info = t('removed');
        } else if (item.isNew) {
            info = t('newItem');
        } else if (item.positionChanged) {
            info = t('differentPosition');
        }

        wsData.push([
            articleDisplay,
            item.ean,
            item.shelf,
            item.row,
            item.position,
            shelfOld,
            rowOld,
            posOld,
            item.stock,
            item.stockDiff,
            info
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
        { wch: 12 }, // Shelf (old)
        { wch: 10 }, // Row (old)
        { wch: 10 }, // Pos (old)
        { wch: 10 }, // Stock
        { wch: 10 }, // Diff
        { wch: 20 }  // Info
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

    // Style header row (darker grey background, bold, borders, centered)
    for (let C = range.s.c; C <= range.e.c; C++) {
        const address = XLSX.utils.encode_col(C) + "1";
        if (!ws[address]) continue;
        ws[address].s = {
            font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 12 },
            fill: { fgColor: { rgb: '4472C4' } },
            alignment: { horizontal: 'center', vertical: 'center' },
            border: border
        };
    }

    // Apply borders and backgrounds to data rows
    for (let R = 1; R <= exportData.length; R++) {
        const item = exportData[R - 1];
        const isRemoved = item && item.removed;
        const hasStockChange = item && item.stockDiff !== 0;
        const hasPositionChange = item && (item.positionChanged || item.isNew);

        for (let C = range.s.c; C <= range.e.c; C++) {
            const address = XLSX.utils.encode_col(C) + (R + 1);
            if (!ws[address]) continue;

            ws[address].s = {
                border: border,
                alignment: { horizontal: 'left', vertical: 'center' }
            };

            // Add light blue background for removed items
            if (isRemoved) {
                ws[address].s.fill = { fgColor: { rgb: 'DBEAFE' } };
            }
            // Add light red background for rows with stock differences
            else if (hasStockChange) {
                ws[address].s.fill = { fgColor: { rgb: 'FFE5E5' } };
            }
            // Add bright yellow background for rows with position changes or new items
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
        ? data.filter(item => item.stockDiff !== 0 || item.positionChanged || item.isNew)
        : data;

    // Prepare worksheet data
    const wsData = [
        ['Article Nr', 'EAN', 'Shelf', 'Row', 'Pos', 'Shelf (old)', 'Row (old)', 'Pos (old)', 'Stock', 'Diff', 'Info']
    ];

    exportData.forEach(item => {
        // Remove leading zeros from article number
        const articleDisplay = item.article ? String(item.article).replace(/^0+/, '') || '0' : '';

        // Determine old values - only show if position changed and not a new item
        const shelfOld = (item.positionChanged && !item.isNew) ? (item.originalShelf || '') : '';
        const rowOld = (item.positionChanged && !item.isNew) ? (item.originalRow || '') : '';
        const posOld = (item.positionChanged && !item.isNew) ? (item.originalPosition || '') : '';

        // Determine info text
        let info = '';
        if (item.removed) {
            info = t('removed');
        } else if (item.isNew) {
            info = t('newItem');
        } else if (item.positionChanged) {
            info = t('differentPosition');
        }

        wsData.push([
            articleDisplay,
            item.ean,
            item.shelf,
            item.row,
            item.position,
            shelfOld,
            rowOld,
            posOld,
            item.stock,
            item.stockDiff,
            info
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
        { wch: 12 }, // Shelf (old)
        { wch: 10 }, // Row (old)
        { wch: 10 }, // Pos (old)
        { wch: 10 }, // Stock
        { wch: 10 }, // Diff
        { wch: 20 }  // Info
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

    // Style header row (darker grey background, bold, borders, centered)
    for (let C = range.s.c; C <= range.e.c; C++) {
        const address = XLSX.utils.encode_col(C) + "1";
        if (!ws[address]) continue;
        ws[address].s = {
            font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 12 },
            fill: { fgColor: { rgb: '4472C4' } },
            alignment: { horizontal: 'center', vertical: 'center' },
            border: border
        };
    }

    // Apply borders and backgrounds to data rows
    for (let R = 1; R <= exportData.length; R++) {
        const item = exportData[R - 1];
        const isRemoved = item && item.removed;
        const hasStockChange = item && item.stockDiff !== 0;
        const hasPositionChange = item && (item.positionChanged || item.isNew);

        for (let C = range.s.c; C <= range.e.c; C++) {
            const address = XLSX.utils.encode_col(C) + (R + 1);
            if (!ws[address]) continue;

            ws[address].s = {
                border: border,
                alignment: { horizontal: 'left', vertical: 'center' }
            };

            // Add light blue background for removed items
            if (isRemoved) {
                ws[address].s.fill = { fgColor: { rgb: 'DBEAFE' } };
            }
            else if (hasStockChange) {
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

        // Check if this is a new item (ID starts with "item-new-")
        const isNew = item.id && item.id.startsWith('item-new-');

        // Check if position has changed
        const originalShelf = item.originalShelf || item.shelf;
        const positionChanged = !isNew && (
            item.originalRow !== item.row ||
            item.originalPosition !== item.position ||
            originalShelf !== item.shelf
        );

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
            positionChanged: positionChanged,
            isNew: isNew
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
