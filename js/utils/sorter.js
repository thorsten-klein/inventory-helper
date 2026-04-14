// Item Sorting Utilities

function sortItems(items) {
    return items.sort((a, b) => {
        // First sort by shelf
        const shelfCompare = compareAlphanumeric(a.shelf, b.shelf);
        if (shelfCompare !== 0) return shelfCompare;

        // Then by row
        const rowCompare = a.row - b.row;
        if (rowCompare !== 0) return rowCompare;

        // Finally by position
        return a.position - b.position;
    });
}

function compareAlphanumeric(a, b) {
    // Convert to strings for comparison
    const aStr = String(a || '');
    const bStr = String(b || '');

    // Try numeric comparison first
    const aNum = parseFloat(aStr);
    const bNum = parseFloat(bStr);

    if (!isNaN(aNum) && !isNaN(bNum)) {
        return aNum - bNum;
    }

    // Fallback to string comparison
    return aStr.localeCompare(bStr, undefined, { numeric: true, sensitivity: 'base' });
}

function groupItemsByShelf(items) {
    const groups = {};

    items.forEach(item => {
        const shelf = item.shelf || 'Unknown';
        if (!groups[shelf]) {
            groups[shelf] = [];
        }
        groups[shelf].push(item);
    });

    return groups;
}

function moveItemToRow(items, itemIndex, newRow) {
    if (itemIndex < 0 || itemIndex >= items.length) return items;

    const item = items[itemIndex];
    const updatedItem = { ...item, row: newRow };

    // Remove item from current position
    items.splice(itemIndex, 1);

    // Find the last position in the new row with the same shelf
    let insertIndex = items.length;
    for (let i = items.length - 1; i >= 0; i--) {
        if (items[i].shelf === updatedItem.shelf && items[i].row === newRow) {
            insertIndex = i + 1;
            break;
        }
        if (items[i].shelf === updatedItem.shelf && items[i].row < newRow) {
            insertIndex = i + 1;
            break;
        }
    }

    // Update position to be after the last item in that row
    const maxPosition = getMaxPositionInRow(items, updatedItem.shelf, newRow);
    updatedItem.position = maxPosition + 1;

    // Insert at new position
    items.splice(insertIndex, 0, updatedItem);

    return normalizePositions(sortItems(items));
}

function moveItemPosition(items, itemIndex, direction) {
    if (itemIndex < 0 || itemIndex >= items.length) return items;

    const item = items[itemIndex];
    const targetIndex = direction === 'up' ? itemIndex - 1 : itemIndex + 1;

    if (targetIndex < 0 || targetIndex >= items.length) return items;

    const targetItem = items[targetIndex];

    // Only swap if they are in the same shelf and row
    if (item.shelf === targetItem.shelf && item.row === targetItem.row) {
        // Swap positions
        const tempPosition = item.position;
        items[itemIndex].position = targetItem.position;
        items[targetIndex].position = tempPosition;

        // Swap items in array
        [items[itemIndex], items[targetIndex]] = [items[targetIndex], items[itemIndex]];

        return normalizePositions(sortItems(items));
    }

    return items;
}

function getMaxPositionInRow(items, shelf, row) {
    let maxPosition = 0;
    items.forEach(item => {
        if (item.shelf === shelf && item.row === row) {
            maxPosition = Math.max(maxPosition, item.position);
        }
    });
    return maxPosition;
}

function canMoveUp(items, itemIndex) {
    if (itemIndex <= 0) return false;

    const item = items[itemIndex];
    const prevItem = items[itemIndex - 1];

    return item.shelf === prevItem.shelf && item.row === prevItem.row;
}

function canMoveDown(items, itemIndex) {
    if (itemIndex < 0 || itemIndex >= items.length - 1) return false;

    const item = items[itemIndex];
    const nextItem = items[itemIndex + 1];

    return item.shelf === nextItem.shelf && item.row === nextItem.row;
}

function canDecreaseRow(items, itemIndex) {
    if (itemIndex < 0 || itemIndex >= items.length) return false;
    return items[itemIndex].row > 1;
}

function moveItemToRowStart(items, itemIndex, newRow) {
    if (itemIndex < 0 || itemIndex >= items.length) return items;

    const item = items[itemIndex];
    const updatedItem = { ...item, row: newRow, position: 1 };

    // Remove item from current position
    items.splice(itemIndex, 1);

    // Shift all items in the new row to make space at position 1
    items.forEach(otherItem => {
        if (otherItem.shelf === updatedItem.shelf && otherItem.row === newRow) {
            otherItem.position++;
        }
    });

    // Insert the item
    items.push(updatedItem);

    return normalizePositions(sortItems(items));
}

function moveItemToRowEnd(items, itemIndex, newRow) {
    if (itemIndex < 0 || itemIndex >= items.length) return items;

    const item = items[itemIndex];

    // Remove item from current position first to get accurate max position
    items.splice(itemIndex, 1);

    // Find the max position in the target row
    const maxPosition = getMaxPositionInRow(items, item.shelf, newRow);
    const updatedItem = { ...item, row: newRow, position: maxPosition + 1 };

    // Insert the item
    items.push(updatedItem);

    return normalizePositions(sortItems(items));
}

function normalizePositions(items) {
    // Group items by shelf and row
    const groups = {};

    items.forEach(item => {
        const key = `${item.shelf}|${item.row}`;
        if (!groups[key]) {
            groups[key] = [];
        }
        groups[key].push(item);
    });

    // For each group, ensure positions start at 1 and are consecutive
    Object.values(groups).forEach(group => {
        // Sort by current position
        group.sort((a, b) => a.position - b.position);

        // Renumber positions starting from 1
        group.forEach((item, index) => {
            item.position = index + 1;
        });
    });

    return items;
}
