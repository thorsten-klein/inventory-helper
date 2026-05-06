/**
 * Unit tests for undo/redo functionality
 * These tests directly test the undo/redo logic without needing a full e2e setup
 */

describe('Undo/Redo History State', () => {
    let historyState;
    let appState;

    beforeEach(() => {
        // Reset history state
        historyState = {
            history: [],
            currentIndex: -1,
            maxHistory: 50
        };

        // Mock app state
        appState = {
            items: [
                { id: '1', ean: '111', locked: false, removed: false },
                { id: '2', ean: '222', locked: false, removed: false },
                { id: '3', ean: '333', locked: false, removed: false }
            ]
        };
    });

    function saveHistoryState(isInitial = false) {
        // Create a deep copy of the current items state
        const snapshot = JSON.parse(JSON.stringify(appState.items));

        if (isInitial) {
            // Initialize history with the first state
            historyState.history = [snapshot];
            historyState.currentIndex = 0;
        } else {
            // Remove any future history if we're not at the end
            if (historyState.currentIndex < historyState.history.length - 1) {
                historyState.history = historyState.history.slice(0, historyState.currentIndex + 1);
            }

            // Add new snapshot
            historyState.history.push(snapshot);
            historyState.currentIndex++;

            // Limit history size
            if (historyState.history.length > historyState.maxHistory) {
                historyState.history.shift();
                historyState.currentIndex--;
            }
        }
    }

    function performUndoAction() {
        if (historyState.currentIndex > 0) {
            historyState.currentIndex--;
            const snapshot = historyState.history[historyState.currentIndex];
            appState.items = JSON.parse(JSON.stringify(snapshot));
        }
    }

    function performRedoAction() {
        if (historyState.currentIndex < historyState.history.length - 1) {
            historyState.currentIndex++;
            const snapshot = historyState.history[historyState.currentIndex];
            appState.items = JSON.parse(JSON.stringify(snapshot));
        }
    }

    test('should initialize history with current state', () => {
        saveHistoryState(true);

        expect(historyState.history.length).toBe(1);
        expect(historyState.currentIndex).toBe(0);
        expect(historyState.history[0]).toEqual(appState.items);
    });

    test('should save state on change', () => {
        saveHistoryState(true);

        // Make a change
        appState.items[0].locked = true;
        saveHistoryState();

        expect(historyState.history.length).toBe(2);
        expect(historyState.currentIndex).toBe(1);
    });

    test('should undo change', () => {
        saveHistoryState(true);

        // Make a change
        appState.items[0].locked = true;
        saveHistoryState();

        // Undo
        performUndoAction();

        expect(historyState.currentIndex).toBe(0);
        expect(appState.items[0].locked).toBe(false);
    });

    test('should redo change', () => {
        saveHistoryState(true);

        // Make a change
        appState.items[0].locked = true;
        saveHistoryState();

        // Undo
        performUndoAction();

        // Redo
        performRedoAction();

        expect(historyState.currentIndex).toBe(1);
        expect(appState.items[0].locked).toBe(true);
    });

    test('should clear redo history when new change is made after undo', () => {
        saveHistoryState(true);

        // Make changes
        appState.items[0].locked = true;
        saveHistoryState();

        appState.items[1].locked = true;
        saveHistoryState();

        expect(historyState.history.length).toBe(3);

        // Undo twice
        performUndoAction();
        performUndoAction();

        expect(historyState.currentIndex).toBe(0);

        // Make new change
        appState.items[2].locked = true;
        saveHistoryState();

        // Redo history should be cleared
        expect(historyState.history.length).toBe(2);
        expect(historyState.currentIndex).toBe(1);
    });

    test('should handle multiple undos', () => {
        saveHistoryState(true);

        // Make multiple changes
        appState.items[0].locked = true;
        saveHistoryState();

        appState.items[1].locked = true;
        saveHistoryState();

        appState.items[2].locked = true;
        saveHistoryState();

        // Undo all changes
        performUndoAction(); // Undo item 2
        expect(appState.items[2].locked).toBe(false);

        performUndoAction(); // Undo item 1
        expect(appState.items[1].locked).toBe(false);

        performUndoAction(); // Undo item 0
        expect(appState.items[0].locked).toBe(false);
    });
});
