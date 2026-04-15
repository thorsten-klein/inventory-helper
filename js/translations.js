// Translation Dictionary

const translations = {
    en: {
        // Upload Screen
        uploadTitle: "Stock Inventory Review",
        chooseFile: "Choose XLSX File",
        selected: "Selected",
        loadingFile: "Loading file...",
        columnConfig: "Column Configuration",
        infoBoxText: "Looking for some example?",
        infoBoxLink: "Download example.xlsx",
        categories: "Categories",
        ean: "EAN",
        shelf: "Shelf",
        row: "Row",
        position: "Position",
        articleNumber: "Article Number",
        price: "Price",
        stock: "Stock",
        next: "Next",
        language: "Language",

        // Category Screen
        selectCategory: "Select Category",
        chooseCategoryPrompt: "Choose a category to review:",
        selectCategoryPlaceholder: "-- Select a category --",
        startEditing: "Start Editing",

        // Editor Screen
        ordering: "Ordering",
        shelfHeader: "Shelf",
        back: "Back",
        edit: "Edit",
        rowPlus: "Row +",
        rowMinus: "Row -",
        posPlus: "Pos +",
        posMinus: "Pos -",

        // Add Modals
        whatToAdd: "What do you want to add?",
        addShelf: "Add Shelf",
        addItem: "Add Item",
        cancel: "Cancel",
        addNewShelf: "Add New Shelf",
        shelfName: "Shelf Name",
        save: "Save",
        editItem: "Edit Item",
        eanRequired: "EAN *",
        shelfRequired: "Shelf *",
        rowRequired: "Row *",
        positionRequired: "Position *",
        eanShelfRequired: "EAN and Shelf are required",
        enterShelfName: "Please enter a shelf name",
        lock: "Lock",
        unlock: "Unlock",
        locked: "Locked",

        // Full Rescan
        fullRescan: "Full Rescan",
        rescanTitle: "Full Rescan",
        rescanShelf: "Shelf",
        rescanRow: "Row",
        switchCamera: "Switch Camera",
        scannedItems: "Scanned Items",
        rescanEan: "EAN",
        rescanSave: "Save",
        noItemsScanned: "No items scanned yet",
        rescanApplied: "Rescan applied successfully",

        // Review Screen
        inventory: "Inventory",
        item: "Item",
        of: "of",
        previous: "Previous",
        finish: "Finish",
        diff: "Diff",

        // Report Screen
        inventoryReport: "Inventory Report",
        totalItems: "Total Items:",
        itemsChanged: "Items Changed:",
        articleNr: "Article Nr",
        pos: "Pos",
        exportChanges: "Export Changes Only",
        exportAll: "Export All Items",
        legendPosition: "Position changed",
        legendStock: "Stock difference",

        // Messages
        noItemsToReview: "No items to review",
        noValidItems: "No valid items found. Please check that your file has data with both EAN and Category values.",
        noCategories: "No categories found in the data.",
        selectCategoryFirst: "Please select a category",
        errorReadingFile: "Error reading file:",
        errorProcessingFile: "Error processing file:",

        // Item Details Modal
        itemDetails: "Item Details",
        close: "Close",
        details: "Details",

        // Editor Speech Settings
        speechSettings: "Speech Settings",
        enableSpeech: "Enable Speech",
        articleDigits: "Article Number (last digits)",
        eanDigits: "EAN (last digits)",

        // Email
        emailSubject: "Inventory Review:",
        emailBody: "Hello,\n\nAttached you can find my inventory review from \"{category}\" on {timestamp}.\n\nBest regards",

        // Export
        newItem: "new Item",
        differentPosition: "different Position",

        // Barcode Scanner
        scanBarcode: "Scan Barcode",
        eanFound: "EAN found"
    },

    de: {
        // Upload Screen
        uploadTitle: "Bestandsprüfung",
        chooseFile: "XLSX-Datei auswählen",
        selected: "Ausgewählt",
        loadingFile: "Datei wird geladen...",
        columnConfig: "Konfiguration",
        infoBoxText: "Sie suchen ein Beispiel?",
        infoBoxLink: "example.xlsx herunterladen",
        categories: "Kategorien",
        ean: "EAN",
        shelf: "Regal",
        row: "Reihe",
        position: "Position",
        articleNumber: "Artikelnummer",
        price: "Preis",
        stock: "Bestand",
        next: "Weiter",
        language: "Sprache",

        // Category Screen
        selectCategory: "Kategorie auswählen",
        chooseCategoryPrompt: "Wählen Sie eine Kategorie zur Bestandsprüfung:",
        selectCategoryPlaceholder: "-- Kategorie auswählen --",
        startEditing: "Weiter",

        // Editor Screen
        ordering: "Sortierung",
        shelfHeader: "Regal",
        back: "Zurück",
        edit: "Bearbeiten",
        rowPlus: "Reihe +",
        rowMinus: "Reihe -",
        posPlus: "Pos +",
        posMinus: "Pos -",

        // Add Modals
        whatToAdd: "Was möchten Sie hinzufügen?",
        addShelf: "Regal hinzufügen",
        addItem: "Artikel hinzufügen",
        cancel: "Abbrechen",
        addNewShelf: "Neues Regal hinzufügen",
        shelfName: "Regalname",
        save: "Speichern",
        editItem: "Artikel bearbeiten",
        eanRequired: "EAN *",
        shelfRequired: "Regal *",
        rowRequired: "Reihe *",
        positionRequired: "Position *",
        eanShelfRequired: "EAN und Regal sind Pflichtfelder.",
        enterShelfName: "Bitte geben Sie einen Regalnamen ein",
        lock: "Fixieren",
        unlock: "Fixierung aufheben",
        locked: "Fixiert",

        // Full Rescan
        fullRescan: "Komplett-Scan",
        rescanTitle: "Komplett-Scan",
        rescanShelf: "Regal",
        rescanRow: "Reihe",
        switchCamera: "Kamera wechseln",
        scannedItems: "Gescannte Artikel",
        rescanEan: "EAN",
        rescanSave: "Speichern",
        noItemsScanned: "Noch keine Artikel gescannt",
        rescanApplied: "Scan erfolgreich übernommen",

        // Review Screen
        inventory: "Bestandskontrolle",
        item: "Artikel",
        of: "von",
        previous: "Zurück",
        finish: "Fertig",
        diff: "Diff",

        // Report Screen
        inventoryReport: "Ergebnis der Bestandsprüfung",
        totalItems: "Gesamt:",
        itemsChanged: "Geändert:",
        articleNr: "Artikel-Nr",
        pos: "Pos",
        exportChanges: "Änderungen exportieren",
        exportAll: "Alles exportieren",
        legendPosition: "Position geändert",
        legendStock: "Bestandsabweichung",

        // Messages
        noItemsToReview: "Keine Artikel vorhanden.",
        noValidItems: "Keine gültigen Artikel gefunden. Bitte überprüfen Sie, ob Ihre Datei Daten mit EAN- und Kategoriewerten enthält.",
        noCategories: "Keine Kategorien in den Daten gefunden.",
        selectCategoryFirst: "Bitte wählen Sie eine Kategorie",
        errorReadingFile: "Fehler beim Lesen der Datei:",
        errorProcessingFile: "Fehler beim Verarbeiten der Datei:",

        // Item Details Modal
        itemDetails: "Artikelinfos",
        close: "Schließen",
        details: "Details",

        // Editor Speech Settings
        speechSettings: "Spracheinstellungen",
        enableSpeech: "Sprache aktivieren",
        articleDigits: "Artikelnummer (letzte Ziffern)",
        eanDigits: "EAN (letzte Ziffern)",

        // Email
        emailSubject: "Bestandsprüfung:",
        emailBody: "Hallo,\n\nanbei meine Bestandsprüfung von \"{category}\" vom {timestamp}.\n\nMit freundlichen Grüßen",

        // Export
        newItem: "neuer Artikel",
        differentPosition: "Position geändert",

        // Barcode Scanner
        scanBarcode: "Barcode scannen",
        eanFound: "EAN gefunden"
    }
};
