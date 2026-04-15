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

    // Cannot move locked items
    if (item.locked) return items;

    // Find the next unlocked item in the direction to swap with
    let targetIndex = direction === 'up' ? itemIndex - 1 : itemIndex + 1;
    let targetItem = null;

    // Search for next unlocked item in the same shelf and row
    while (targetIndex >= 0 && targetIndex < items.length) {
        const candidate = items[targetIndex];

        // Check if in same shelf and row
        if (item.shelf === candidate.shelf && item.row === candidate.row) {
            // If not locked, this is our target
            if (!candidate.locked) {
                targetItem = candidate;
                break;
            }
            // If locked, continue searching
            targetIndex = direction === 'up' ? targetIndex - 1 : targetIndex + 1;
        } else {
            // Different shelf or row, stop searching
            break;
        }
    }

    // If we found an unlocked target item, swap
    if (targetItem) {
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

    // Cannot move locked items
    if (item.locked) return false;

    // Search for at least one unlocked item above in same shelf/row
    for (let i = itemIndex - 1; i >= 0; i--) {
        const candidate = items[i];

        // If different shelf or row, stop searching
        if (candidate.shelf !== item.shelf || candidate.row !== item.row) {
            break;
        }

        // If we found an unlocked item, we can move
        if (!candidate.locked) {
            return true;
        }
    }

    return false;
}

function canMoveDown(items, itemIndex) {
    if (itemIndex < 0 || itemIndex >= items.length - 1) return false;

    const item = items[itemIndex];

    // Cannot move locked items
    if (item.locked) return false;

    // Search for at least one unlocked item below in same shelf/row
    for (let i = itemIndex + 1; i < items.length; i++) {
        const candidate = items[i];

        // If different shelf or row, stop searching
        if (candidate.shelf !== item.shelf || candidate.row !== item.row) {
            break;
        }

        // If we found an unlocked item, we can move
        if (!candidate.locked) {
            return true;
        }
    }

    return false;
}

function canDecreaseRow(items, itemIndex) {
    if (itemIndex < 0 || itemIndex >= items.length) return false;
    const item = items[itemIndex];
    // Cannot move locked items
    if (item.locked) return false;
    return item.row > 1;
}

function moveItemToRowStart(items, itemIndex, newRow) {
    if (itemIndex < 0 || itemIndex >= items.length) return items;

    const item = items[itemIndex];

    // Cannot move locked items
    if (item.locked) return items;
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

    // Cannot move locked items
    if (item.locked) return items;

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
