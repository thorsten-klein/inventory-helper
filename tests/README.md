# Inventory Helper Tests

This directory contains automated tests for the Inventory Helper application.

## Test Structure

- **unit-sorter.spec.js** - Unit tests for sorting and item manipulation utilities
- **category-sorting.test.js** - Unit test for category dropdown alphabetical sorting (case-insensitive)
- **e2e-upload.spec.js** - End-to-end tests for the file upload screen
- **e2e-state.spec.js** - Tests for application state management
- **e2e-navigation.spec.js** - Tests for screen navigation and UI structure
- **e2e-i18n.spec.js** - Tests for internationalization (i18n) functionality
- **e2e-integration.spec.js** - Integration tests with example XLSX file

## Running Tests

### Run all tests
```bash
./test.sh
```

### Run tests with UI mode (interactive)
```bash
npm run test:ui
```

### Run tests in headed mode (visible browser)
```bash
npm run test:headed
```

### Run tests in debug mode
```bash
npm run test:debug
```

### Run specific test file
```bash
npx playwright test tests/unit-sorter.spec.js
```

### Run category sorting test (standalone)
```bash
node tests/category-sorting.test.js
```

## Coverage

Coverage reports are generated using nyc and saved to the `coverage/` directory.
View the HTML report at `coverage/index.html` after running tests.

## Prerequisites

Install dependencies first:
```bash
npm install
```

Install Playwright browsers:
```bash
npx playwright install chromium
```

## Test Configuration

Tests are configured via `playwright.config.js`. The configuration includes:
- Automatic web server startup on port 8000
- Screenshot capture on test failure
- Trace recording on first retry
- Chromium browser testing

## Writing New Tests

Follow the existing test structure:
1. Import required Playwright test utilities
2. Use `test.describe()` to group related tests
3. Use `test.beforeEach()` for common setup
4. Write clear, descriptive test names
5. Use appropriate assertions with `expect()`

Example:
```javascript
const { test, expect } = require('@playwright/test');

test.describe('My Feature', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should do something', async ({ page }) => {
    await expect(page.locator('#my-element')).toBeVisible();
  });
});
```
