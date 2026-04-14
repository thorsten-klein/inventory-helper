// Internationalization Helpers

// Get translation for a key
function t(key) {
    const lang = appState.currentLanguage || 'en';
    const translation = translations[lang] && translations[lang][key];

    // Fallback to English if translation not found
    if (!translation && lang !== 'en') {
        return translations['en'][key] || key;
    }

    return translation || key;
}

// Set current language
function setLanguage(lang) {
    appState.currentLanguage = lang;
    localStorage.setItem('preferredLanguage', lang);
}

// Get preferred language from localStorage or browser
function getPreferredLanguage() {
    // Check localStorage first
    const saved = localStorage.getItem('preferredLanguage');
    if (saved && (saved === 'en' || saved === 'de')) {
        return saved;
    }

    // Check browser language
    const browserLang = navigator.language || navigator.userLanguage;
    if (browserLang.startsWith('de')) {
        return 'de';
    }

    // Default to English
    return 'en';
}

// Initialize language on app start
function initLanguage() {
    const preferredLang = getPreferredLanguage();
    appState.currentLanguage = preferredLang;
}
