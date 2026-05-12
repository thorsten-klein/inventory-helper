/**
 * DOM Helper Utilities
 *
 * Centralized DOM manipulation functions to reduce code duplication
 * and provide consistent error handling.
 */

/**
 * Get element by ID with optional error handling
 * @param {string} id - Element ID
 * @param {boolean} throwOnMissing - Whether to throw if element not found (default: false)
 * @returns {HTMLElement|null} The element or null
 */
function getElement(id, throwOnMissing = false) {
    const element = document.getElementById(id);
    if (!element && throwOnMissing) {
        throw new Error(`Element with id '${id}' not found`);
    }
    return element;
}

/**
 * Get multiple elements by IDs
 * @param {string[]} ids - Array of element IDs
 * @returns {Object} Object with element references keyed by ID
 */
function getElements(...ids) {
    const elements = {};
    for (const id of ids) {
        elements[id] = getElement(id);
    }
    return elements;
}

/**
 * Set translated text content for an element
 * @param {string|HTMLElement} elementOrId - Element or element ID
 * @param {string} translationKey - Translation key to use with t()
 */
function setTranslatedText(elementOrId, translationKey) {
    const element = typeof elementOrId === 'string'
        ? getElement(elementOrId)
        : elementOrId;

    if (element && typeof t === 'function') {
        element.textContent = t(translationKey);
    }
}

/**
 * Set translated text for multiple elements
 * @param {Object} mappings - Object mapping element IDs to translation keys
 */
function setTranslatedTexts(mappings) {
    for (const [elementId, translationKey] of Object.entries(mappings)) {
        setTranslatedText(elementId, translationKey);
    }
}

/**
 * Show an element by removing the 'hidden' class
 * @param {string|HTMLElement} elementOrId - Element or element ID
 */
function showElement(elementOrId) {
    const element = typeof elementOrId === 'string'
        ? getElement(elementOrId)
        : elementOrId;

    if (element) {
        element.classList.remove('hidden');
    }
}

/**
 * Hide an element by adding the 'hidden' class
 * @param {string|HTMLElement} elementOrId - Element or element ID
 */
function hideElement(elementOrId) {
    const element = typeof elementOrId === 'string'
        ? getElement(elementOrId)
        : elementOrId;

    if (element) {
        element.classList.add('hidden');
    }
}

/**
 * Toggle element visibility
 * @param {string|HTMLElement} elementOrId - Element or element ID
 * @param {boolean} show - True to show, false to hide
 */
function toggleElement(elementOrId, show) {
    if (show) {
        showElement(elementOrId);
    } else {
        hideElement(elementOrId);
    }
}

/**
 * Check if element has a class
 * @param {string|HTMLElement} elementOrId - Element or element ID
 * @param {string} className - Class name to check
 * @returns {boolean} True if element has the class
 */
function hasClass(elementOrId, className) {
    const element = typeof elementOrId === 'string'
        ? getElement(elementOrId)
        : elementOrId;

    return element ? element.classList.contains(className) : false;
}

/**
 * Add one or more classes to an element
 * @param {string|HTMLElement} elementOrId - Element or element ID
 * @param {...string} classNames - Class names to add
 */
function addClass(elementOrId, ...classNames) {
    const element = typeof elementOrId === 'string'
        ? getElement(elementOrId)
        : elementOrId;

    if (element) {
        element.classList.add(...classNames);
    }
}

/**
 * Remove one or more classes from an element
 * @param {string|HTMLElement} elementOrId - Element or element ID
 * @param {...string} classNames - Class names to remove
 */
function removeClass(elementOrId, ...classNames) {
    const element = typeof elementOrId === 'string'
        ? getElement(elementOrId)
        : elementOrId;

    if (element) {
        element.classList.remove(...classNames);
    }
}

/**
 * Toggle a class on an element
 * @param {string|HTMLElement} elementOrId - Element or element ID
 * @param {string} className - Class name to toggle
 * @param {boolean} force - Force add (true) or remove (false)
 */
function toggleClass(elementOrId, className, force = undefined) {
    const element = typeof elementOrId === 'string'
        ? getElement(elementOrId)
        : elementOrId;

    if (element) {
        element.classList.toggle(className, force);
    }
}

/**
 * Create a button element
 * @param {Object} config - Button configuration
 * @param {string} config.id - Button ID (optional)
 * @param {string} config.text - Button text or translation key
 * @param {string} config.className - CSS classes to add
 * @param {Function} config.onClick - Click handler
 * @param {boolean} config.translate - Whether to translate the text (default: true)
 * @returns {HTMLButtonElement} The created button
 */
function createButton(config) {
    const button = document.createElement('button');

    if (config.id) {
        button.id = config.id;
    }

    if (config.className) {
        button.className = config.className;
    }

    if (config.text) {
        button.textContent = config.translate !== false && typeof t === 'function'
            ? t(config.text)
            : config.text;
    }

    if (config.onClick) {
        button.addEventListener('click', config.onClick);
    }

    if (config.disabled) {
        button.disabled = true;
    }

    return button;
}

/**
 * Update button state (enabled/disabled and optionally text)
 * @param {string|HTMLElement} elementOrId - Button element or ID
 * @param {boolean} enabled - Whether button should be enabled
 * @param {string} text - Optional new text (translation key)
 */
function updateButtonState(elementOrId, enabled, text = null) {
    const button = typeof elementOrId === 'string'
        ? getElement(elementOrId)
        : elementOrId;

    if (button) {
        button.disabled = !enabled;
        if (text) {
            setTranslatedText(button, text);
        }
    }
}

/**
 * Clear all children from an element
 * @param {string|HTMLElement} elementOrId - Element or element ID
 */
function clearChildren(elementOrId) {
    const element = typeof elementOrId === 'string'
        ? getElement(elementOrId)
        : elementOrId;

    if (element) {
        while (element.firstChild) {
            element.removeChild(element.firstChild);
        }
    }
}

/**
 * Set element's innerHTML safely
 * @param {string|HTMLElement} elementOrId - Element or element ID
 * @param {string} html - HTML content to set
 */
function setHTML(elementOrId, html) {
    const element = typeof elementOrId === 'string'
        ? getElement(elementOrId)
        : elementOrId;

    if (element) {
        element.innerHTML = html;
    }
}

/**
 * Create an element with attributes and content
 * @param {string} tag - HTML tag name
 * @param {Object} attributes - Object with attribute key-value pairs
 * @param {string|Node|Node[]} content - Text content or child nodes
 * @returns {HTMLElement} The created element
 */
function createElement(tag, attributes = {}, content = null) {
    const element = document.createElement(tag);

    // Set attributes
    for (const [key, value] of Object.entries(attributes)) {
        if (key === 'className') {
            element.className = value;
        } else if (key === 'style' && typeof value === 'object') {
            Object.assign(element.style, value);
        } else {
            element.setAttribute(key, value);
        }
    }

    // Add content
    if (content !== null) {
        if (typeof content === 'string') {
            element.textContent = content;
        } else if (Array.isArray(content)) {
            content.forEach(child => {
                if (child instanceof Node) {
                    element.appendChild(child);
                }
            });
        } else if (content instanceof Node) {
            element.appendChild(content);
        }
    }

    return element;
}

/**
 * Get form data as an object
 * @param {string|HTMLFormElement} formOrId - Form element or ID
 * @returns {Object} Form data as key-value pairs
 */
function getFormData(formOrId) {
    const form = typeof formOrId === 'string'
        ? getElement(formOrId)
        : formOrId;

    if (!form) return {};

    const formData = new FormData(form);
    const data = {};

    for (const [key, value] of formData.entries()) {
        data[key] = value;
    }

    return data;
}

/**
 * Disable multiple elements
 * @param {...string|HTMLElement} elements - Elements or element IDs
 */
function disableElements(...elements) {
    for (const elementOrId of elements) {
        const element = typeof elementOrId === 'string'
            ? getElement(elementOrId)
            : elementOrId;

        if (element) {
            element.disabled = true;
        }
    }
}

/**
 * Enable multiple elements
 * @param {...string|HTMLElement} elements - Elements or element IDs
 */
function enableElements(...elements) {
    for (const elementOrId of elements) {
        const element = typeof elementOrId === 'string'
            ? getElement(elementOrId)
            : elementOrId;

        if (element) {
            element.disabled = false;
        }
    }
}

/**
 * Check if element is visible (not hidden by display or visibility)
 * @param {string|HTMLElement} elementOrId - Element or element ID
 * @returns {boolean} True if element is visible
 */
function isVisible(elementOrId) {
    const element = typeof elementOrId === 'string'
        ? getElement(elementOrId)
        : elementOrId;

    if (!element) return false;

    const style = window.getComputedStyle(element);
    return style.display !== 'none' && style.visibility !== 'hidden' && !hasClass(element, 'hidden');
}

/**
 * Show item details modal with all raw data from original XLSX
 * @param {Object} item - Item object with _rawRow data
 */
function showItemDetailsModal(item) {
    const modal = document.getElementById('item-details-modal');
    const modalTitle = document.getElementById('item-details-title');
    const tbody = document.getElementById('item-details-tbody');
    const btnClose = document.getElementById('btn-close-item-details');

    // Set title
    modalTitle.textContent = t('itemDetails');
    btnClose.textContent = t('close');

    // Get all columns from raw data
    const headers = appState.rawData[0] || [];
    const rowData = item._rawRow || [];

    tbody.innerHTML = '';

    // Display all columns from the original XLSX
    headers.forEach((header, index) => {
        const value = rowData[index];
        const displayValue = (value !== undefined && value !== null && value !== '')
            ? String(value)
            : '-';

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${header || `Column ${index + 1}`}</td>
            <td>${displayValue}</td>
        `;
        tbody.appendChild(row);
    });

    showModal(modal);

    // Close button
    btnClose.onclick = () => {
        hideModal(modal);
    };

    // Close on background click
    modal.onclick = (e) => {
        if (e.target === modal) {
            hideModal(modal);
        }
    };
}
