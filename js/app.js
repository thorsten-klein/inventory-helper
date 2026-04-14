// Main Application Controller

function showScreen(screenName) {
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
    } else {
        console.error('Screen not found:', screenName);
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Show upload screen
    showScreen('upload');

    // Initialize upload screen
    initUploadScreen();
});
