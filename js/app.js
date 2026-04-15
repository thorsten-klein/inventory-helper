// Main Application Controller

// Track if we should suppress the next popstate event
let suppressNextPopstate = false;

function showScreen(screenName, skipHistoryPush = false) {
    console.log('Switching to screen:', screenName);

    // Hide all screens
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
        screen.classList.add('hidden');
    });

    // Show selected screen
    const screen = document.getElementById(`${screenName}-screen`);
    if (screen) {
        screen.classList.remove('hidden');
        screen.classList.add('active');
        console.log('Screen activated:', screenName);

        // Push state to history (unless we're handling a popstate or initial load)
        if (!skipHistoryPush) {
            history.pushState({ screen: screenName }, '', '');
        }
    } else {
        console.error('Screen not found:', screenName);
    }
}

// Handle browser back/forward buttons
window.addEventListener('popstate', (event) => {
    if (suppressNextPopstate) {
        suppressNextPopstate = false;
        return;
    }

    // If no state or going back to upload screen, handle specially
    if (!event.state || event.state.screen === 'upload') {
        // Check if we're currently on upload screen
        const uploadScreen = document.getElementById('upload-screen');
        const isOnUploadScreen = uploadScreen && !uploadScreen.classList.contains('hidden');

        if (isOnUploadScreen) {
            // Show confirmation dialog
            const shouldExit = confirm('Really Exit?');
            if (shouldExit) {
                // User wants to exit - allow browser to go back
                return;
            } else {
                // User wants to stay - push the upload screen back into history
                suppressNextPopstate = true;
                history.pushState({ screen: 'upload' }, '', '');
                return;
            }
        } else {
            // Navigate back to upload screen
            showScreen('upload', true);
        }
    } else {
        // Navigate to the screen in the history state
        const targetScreen = event.state.screen;

        // Show the target screen without pushing to history
        showScreen(targetScreen, true);

        // Re-render the screen if needed
        switch (targetScreen) {
            case 'category':
                initCategoryScreen();
                break;
            case 'editor':
                renderEditorScreen();
                break;
            case 'review':
                renderReviewScreen();
                break;
            case 'report':
                renderReportScreen();
                break;
        }
    }
});

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Set initial history state for upload screen
    history.replaceState({ screen: 'upload' }, '', '');

    // Show upload screen (skip history push since we just replaced it)
    showScreen('upload', true);

    // Initialize upload screen
    initUploadScreen();
});

// Modal utilities
function showModal(modalElement) {
    modalElement.classList.remove('hidden');
    document.body.classList.add('modal-open');
}

function hideModal(modalElement) {
    modalElement.classList.add('hidden');
    document.body.classList.remove('modal-open');
}
