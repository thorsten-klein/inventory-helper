// Global State Management

const appState = {
    // Uploaded data
    uploadedData: null,
    rawData: null,

    // Column mapping
    columnMapping: {
        category: 'F',
        ean: 'C',
        shelf: 'G',
        row: 'D',
        position: 'E',
        article: 'I',
        stock: 'S'
    },

    // Available columns from file
    availableColumns: [],

    // Selected category
    selectedCategory: null,
    categories: [],

    // Items for current category
    items: [],
    originalItems: [],

    // Editor state
    selectedItemIndex: null,

    // Review state
    currentReviewIndex: 0,
    stockCounts: {},

    // Report data
    reportData: [],

    // Custom shelves (shelves created by user without items)
    customShelves: [],

    // Current language
    currentLanguage: 'en',

    // Editor speech settings
    editorSpeech: {
        enabled: false,
        articleDigits: 3,
        eanDigits: 0
    }
};

// State helper functions
function resetState() {
    appState.uploadedData = null;
    appState.rawData = null;
    appState.availableColumns = [];
    appState.selectedCategory = null;
    appState.categories = [];
    appState.items = [];
    appState.originalItems = [];
    appState.selectedItemIndex = null;
    appState.currentReviewIndex = 0;
    appState.stockCounts = {};
    appState.reportData = [];
    appState.customShelves = [];
}

function setColumnMapping(mapping) {
    appState.columnMapping = { ...appState.columnMapping, ...mapping };
}

function setCategories(categories) {
    appState.categories = categories;
}

function setSelectedCategory(category) {
    appState.selectedCategory = category;
}

function setItems(items) {
    appState.items = items;
    appState.originalItems = JSON.parse(JSON.stringify(items));

    // Store original positions for each item
    items.forEach(item => {
        item.originalShelf = item.shelf;
        item.originalRow = item.row;
        item.originalPosition = item.position;
    });
}

function selectItem(index) {
    appState.selectedItemIndex = index;

    // Speak item details if speech is enabled
    if (appState.editorSpeech.enabled && typeof speakItemDetails === 'function') {
        speakItemDetails(appState.items[index]);
    }
}

function deselectItem() {
    appState.selectedItemIndex = null;
}

function getSelectedItem() {
    if (appState.selectedItemIndex === null) return null;
    return appState.items[appState.selectedItemIndex];
}

function updateItem(index, updates) {
    if (index >= 0 && index < appState.items.length) {
        appState.items[index] = { ...appState.items[index], ...updates };
    }
}

function addItem(item) {
    const index = appState.selectedItemIndex !== null
        ? appState.selectedItemIndex + 1
        : appState.items.length;
    appState.items.splice(index, 0, item);
    return index;
}

function deleteItem(index) {
    if (index >= 0 && index < appState.items.length) {
        appState.items.splice(index, 1);
        if (appState.selectedItemIndex === index) {
            appState.selectedItemIndex = null;
        } else if (appState.selectedItemIndex > index) {
            appState.selectedItemIndex--;
        }
    }
}

function setStockCount(itemId, count, originalStock) {
    appState.stockCounts[itemId] = {
        counted: count,
        original: originalStock,
        diff: count - originalStock
    };
}

function getStockCount(itemId) {
    return appState.stockCounts[itemId];
}

function addCustomShelf(shelfName) {
    if (!appState.customShelves.includes(shelfName)) {
        appState.customShelves.push(shelfName);
    }
}
