// XLSX Parser Utilities

function parseXLSXFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });

                // Get first sheet
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];

                // Convert to JSON
                const jsonData = XLSX.utils.sheet_to_json(worksheet, {
                    header: 1,
                    defval: '',
                    blankrows: false
                });

                // Store raw data
                appState.rawData = jsonData;

                // Get available columns (A, B, C, ... Z, AA, AB, etc.)
                const maxCols = jsonData[0] ? jsonData[0].length : 26;
                const columns = [];
                for (let i = 0; i < maxCols; i++) {
                    columns.push(columnNumberToLetter(i));
                }
                appState.availableColumns = columns;

                resolve({
                    data: jsonData,
                    columns: columns
                });
            } catch (error) {
                reject(error);
            }
        };

        reader.onerror = (error) => {
            reject(error);
        };

        reader.readAsArrayBuffer(file);
    });
}

function columnLetterToNumber(letter) {
    let column = 0;
    const length = letter.length;
    for (let i = 0; i < length; i++) {
        column += (letter.charCodeAt(i) - 64) * Math.pow(26, length - i - 1);
    }
    return column - 1;
}

function columnNumberToLetter(number) {
    let letter = '';
    let num = number;
    while (num >= 0) {
        letter = String.fromCharCode((num % 26) + 65) + letter;
        num = Math.floor(num / 26) - 1;
    }
    return letter;
}

function extractDataWithMapping(rawData, mapping) {
    const items = [];

    // Get headers from first row
    const headers = rawData[0] || [];

    // Skip header row (row 0)
    for (let i = 1; i < rawData.length; i++) {
        const row = rawData[i];

        const item = {
            id: `item-${i}`,
            category: getCellValue(row, mapping.category),
            ean: getCellValue(row, mapping.ean),
            shelf: getCellValue(row, mapping.shelf),
            row: parseNumber(getCellValue(row, mapping.row)),
            position: parseNumber(getCellValue(row, mapping.position)),
            article: getCellValue(row, mapping.article),
            price: parseFloat(getCellValue(row, mapping.price)) || 0,
            stock: parseNumber(getCellValue(row, mapping.stock)),
            // Store raw row data for details view
            _rawRow: row,
            _rowIndex: i
        };

        // Only add items with at least EAN and category
        if (item.ean && item.category) {
            items.push(item);
        }
    }

    return items;
}

function getCellValue(row, columnLetter) {
    const columnIndex = columnLetterToNumber(columnLetter);
    const value = row[columnIndex];
    return value !== undefined && value !== null ? String(value).trim() : '';
}

function parseNumber(value) {
    const num = parseInt(value);
    return isNaN(num) ? 0 : num;
}

function extractUniqueCategories(items) {
    const categories = new Set();
    items.forEach(item => {
        if (item.category) {
            categories.add(item.category);
        }
    });
    return Array.from(categories).sort();
}

function filterItemsByCategory(items, category) {
    return items.filter(item => item.category === category);
}
