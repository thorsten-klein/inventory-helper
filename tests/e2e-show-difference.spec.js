const { test, expect } = require('@playwright/test');
const {
  setupApp,
  uploadExampleFile,
  navigateToCategory,
  waitForModal,
  waitForModalClose,
} = require('./helpers');

test.describe('Show Difference Feature', () => {
  test.beforeEach(async ({ page, context }) => {
    await setupApp(page, context);
    await uploadExampleFile(page);
    await navigateToCategory(page);
  });

  test('should display Show Difference button on category screen', async ({ page }) => {
    // Verify button is visible
    await expect(page.locator('#btn-show-difference')).toBeVisible();

    // Verify button has correct text
    const buttonText = await page.locator('#btn-show-difference span').textContent();
    expect(buttonText).toBe('Show Difference');

    // Verify button has icon
    const icon = page.locator('#btn-show-difference svg');
    await expect(icon).toBeVisible();
  });

  test('should open difference modal when clicking Show Difference button', async ({ page }) => {
    // Click Show Difference button
    await page.click('#btn-show-difference');

    // Wait for modal to appear
    await waitForModal(page, 'difference-modal');

    // Verify modal is visible
    await expect(page.locator('#difference-modal')).not.toHaveClass(/hidden/);

    // Verify modal has title
    const modalTitle = await page.locator('#difference-modal-title').textContent();
    expect(modalTitle).toBe('Show Difference');
  });

  test('should have all required elements in the modal', async ({ page }) => {
    // Open modal
    await page.click('#btn-show-difference');
    await waitForModal(page, 'difference-modal');

    // Verify category dropdown exists
    await expect(page.locator('#difference-category')).toBeVisible();

    // Verify category dropdown is populated
    const categoryOptions = await page.locator('#difference-category option').count();
    expect(categoryOptions).toBeGreaterThan(1); // At least placeholder + 1 category

    // Verify textarea exists
    await expect(page.locator('#difference-input')).toBeVisible();

    // Verify placeholder text
    const placeholder = await page.locator('#difference-input').getAttribute('placeholder');
    expect(placeholder).toContain('EAN');

    // Verify buttons exist
    await expect(page.locator('#btn-cancel-difference')).toBeVisible();
    await expect(page.locator('#btn-continue-difference')).toBeVisible();

    // Verify results section is initially hidden
    await expect(page.locator('#difference-results-section')).toHaveClass(/hidden/);
  });

  test('should validate that category is selected', async ({ page }) => {
    // Open modal
    await page.click('#btn-show-difference');
    await waitForModal(page, 'difference-modal');

    // Enter some items without selecting category
    await page.fill('#difference-input', '1234567890123\n9876543210987');

    // Click Continue
    page.once('dialog', async dialog => {
      expect(dialog.message()).toContain('select a category');
      await dialog.accept();
    });
    await page.click('#btn-continue-difference');
  });

  test('should validate that items are entered', async ({ page }) => {
    // Open modal
    await page.click('#btn-show-difference');
    await waitForModal(page, 'difference-modal');

    // Select first category
    const categoryOptions = await page.locator('#difference-category option').all();
    let firstCategoryValue = null;
    for (const option of categoryOptions) {
      const value = await option.getAttribute('value');
      if (value && value !== '' && value !== '__NEW_CATEGORY__') {
        firstCategoryValue = value;
        break;
      }
    }
    await page.selectOption('#difference-category', firstCategoryValue);

    // Click Continue without entering items
    page.once('dialog', async dialog => {
      expect(dialog.message()).toContain('enter at least one');
      await dialog.accept();
    });
    await page.click('#btn-continue-difference');
  });

  test('should show difference results when valid input is provided', async ({ page }) => {
    // Open modal
    await page.click('#btn-show-difference');
    await waitForModal(page, 'difference-modal');

    // Select first category
    const categoryOptions = await page.locator('#difference-category option').all();
    let firstCategoryValue = null;
    for (const option of categoryOptions) {
      const value = await option.getAttribute('value');
      if (value && value !== '' && value !== '__NEW_CATEGORY__') {
        firstCategoryValue = value;
        break;
      }
    }
    await page.selectOption('#difference-category', firstCategoryValue);

    // Enter some test EANs (mix of existing and non-existing)
    await page.fill('#difference-input', '9999999999999\n8888888888888\n7777777777777');

    // Click Continue
    await page.click('#btn-continue-difference');

    // Wait for results to appear
    await page.waitForSelector('#difference-results-section:not(.hidden)', { timeout: 5000 });

    // Verify results section is visible
    await expect(page.locator('#difference-results-section')).not.toHaveClass(/hidden/);

    // Verify both result tables are present
    await expect(page.locator('#difference-additional-tbody')).toBeVisible();
    await expect(page.locator('#difference-missing-tbody')).toBeVisible();
  });

  test('should show additional items (items in input not in category)', async ({ page }) => {
    // Open modal
    await page.click('#btn-show-difference');
    await waitForModal(page, 'difference-modal');

    // Select first category
    const categoryOptions = await page.locator('#difference-category option').all();
    let firstCategoryValue = null;
    for (const option of categoryOptions) {
      const value = await option.getAttribute('value');
      if (value && value !== '' && value !== '__NEW_CATEGORY__') {
        firstCategoryValue = value;
        break;
      }
    }
    await page.selectOption('#difference-category', firstCategoryValue);

    // Enter non-existing EANs
    const testEANs = '9999999999999\n8888888888888';
    await page.fill('#difference-input', testEANs);

    // Click Continue
    await page.click('#btn-continue-difference');

    // Wait for results
    await page.waitForSelector('#difference-results-section:not(.hidden)', { timeout: 5000 });

    // Verify additional items are shown
    const additionalRows = await page.locator('#difference-additional-tbody tr').count();
    expect(additionalRows).toBeGreaterThan(0);

    // Verify the test EANs appear in additional items
    const additionalText = await page.locator('#difference-additional-tbody').textContent();
    expect(additionalText).toContain('9999999999999');
    expect(additionalText).toContain('8888888888888');
  });

  test('should show missing items (items in category not in input)', async ({ page }) => {
    // Open modal
    await page.click('#btn-show-difference');
    await waitForModal(page, 'difference-modal');

    // Select first category
    const categoryOptions = await page.locator('#difference-category option').all();
    let firstCategoryValue = null;
    for (const option of categoryOptions) {
      const value = await option.getAttribute('value');
      if (value && value !== '' && value !== '__NEW_CATEGORY__') {
        firstCategoryValue = value;
        break;
      }
    }
    await page.selectOption('#difference-category', firstCategoryValue);

    // Enter only one or two items (so most items will be "missing")
    await page.fill('#difference-input', '9999999999999');

    // Click Continue
    await page.click('#btn-continue-difference');

    // Wait for results
    await page.waitForSelector('#difference-results-section:not(.hidden)', { timeout: 5000 });

    // Verify missing items are shown
    const missingRows = await page.locator('#difference-missing-tbody tr').count();
    expect(missingRows).toBeGreaterThan(0);
  });

  test('should show magnifier icon for missing items', async ({ page }) => {
    // Open modal
    await page.click('#btn-show-difference');
    await waitForModal(page, 'difference-modal');

    // Select first category
    const categoryOptions = await page.locator('#difference-category option').all();
    let firstCategoryValue = null;
    for (const option of categoryOptions) {
      const value = await option.getAttribute('value');
      if (value && value !== '' && value !== '__NEW_CATEGORY__') {
        firstCategoryValue = value;
        break;
      }
    }
    await page.selectOption('#difference-category', firstCategoryValue);

    // Enter a non-existing EAN (so all items in category will be "missing")
    await page.fill('#difference-input', '9999999999999');

    // Click Continue
    await page.click('#btn-continue-difference');

    // Wait for results
    await page.waitForSelector('#difference-results-section:not(.hidden)', { timeout: 5000 });

    // Check if magnifier buttons exist
    const magnifiers = await page.locator('#difference-missing-tbody .btn-magnifier').count();
    expect(magnifiers).toBeGreaterThan(0);
  });

  test('should open item details modal when clicking magnifier icon', async ({ page }) => {
    // Open difference modal
    await page.click('#btn-show-difference');
    await waitForModal(page, 'difference-modal');

    // Select first category
    const categoryOptions = await page.locator('#difference-category option').all();
    let firstCategoryValue = null;
    for (const option of categoryOptions) {
      const value = await option.getAttribute('value');
      if (value && value !== '' && value !== '__NEW_CATEGORY__') {
        firstCategoryValue = value;
        break;
      }
    }
    await page.selectOption('#difference-category', firstCategoryValue);

    // Enter a non-existing EAN
    await page.fill('#difference-input', '9999999999999');

    // Click Continue
    await page.click('#btn-continue-difference');

    // Wait for results
    await page.waitForSelector('#difference-results-section:not(.hidden)', { timeout: 5000 });

    // Click first magnifier icon
    const firstMagnifier = page.locator('#difference-missing-tbody .btn-magnifier').first();
    await firstMagnifier.click();

    // Wait for item details modal to open
    await waitForModal(page, 'item-details-modal');

    // Verify item details modal is visible
    await expect(page.locator('#item-details-modal')).not.toHaveClass(/hidden/);

    // Verify modal has content
    await expect(page.locator('#item-details-tbody')).toBeVisible();
    const rows = await page.locator('#item-details-tbody tr').count();
    expect(rows).toBeGreaterThan(0);
  });

  test('should close modal when clicking Cancel button', async ({ page }) => {
    // Open modal
    await page.click('#btn-show-difference');
    await waitForModal(page, 'difference-modal');

    // Click Cancel
    await page.click('#btn-cancel-difference');

    // Wait a moment for the close action
    await page.waitForTimeout(200);

    // Verify modal is hidden
    await expect(page.locator('#difference-modal')).toHaveClass(/hidden/);
  });

  test('should close modal when clicking background', async ({ page }) => {
    // Open modal
    await page.click('#btn-show-difference');
    await waitForModal(page, 'difference-modal');

    // Click on modal background (not the content)
    await page.locator('#difference-modal').click({ position: { x: 5, y: 5 } });

    // Wait a moment for the close action
    await page.waitForTimeout(200);

    // Verify modal is hidden
    await expect(page.locator('#difference-modal')).toHaveClass(/hidden/);
  });

  test('should handle empty lines and whitespace in input', async ({ page }) => {
    // Open modal
    await page.click('#btn-show-difference');
    await waitForModal(page, 'difference-modal');

    // Select first category
    const categoryOptions = await page.locator('#difference-category option').all();
    let firstCategoryValue = null;
    for (const option of categoryOptions) {
      const value = await option.getAttribute('value');
      if (value && value !== '' && value !== '__NEW_CATEGORY__') {
        firstCategoryValue = value;
        break;
      }
    }
    await page.selectOption('#difference-category', firstCategoryValue);

    // Enter items with empty lines and whitespace
    await page.fill('#difference-input', '\n9999999999999\n  \n  8888888888888  \n\n');

    // Click Continue
    await page.click('#btn-continue-difference');

    // Wait for results
    await page.waitForSelector('#difference-results-section:not(.hidden)', { timeout: 5000 });

    // Verify results section is visible (empty lines should be ignored)
    await expect(page.locator('#difference-results-section')).not.toHaveClass(/hidden/);

    // Verify the trimmed EANs are in the results
    const additionalText = await page.locator('#difference-additional-tbody').textContent();
    expect(additionalText).toContain('9999999999999');
    expect(additionalText).toContain('8888888888888');
  });

  test('should show "no additional items" message when all input items are in category', async ({ page }) => {
    // This test verifies the "no additional items" message appears

    // Open modal
    await page.click('#btn-show-difference');
    await waitForModal(page, 'difference-modal');

    // Select first category
    const categoryOptions = await page.locator('#difference-category option').all();
    let firstCategoryValue = null;
    for (const option of categoryOptions) {
      const value = await option.getAttribute('value');
      if (value && value !== '' && value !== '__NEW_CATEGORY__') {
        firstCategoryValue = value;
        break;
      }
    }
    await page.selectOption('#difference-category', firstCategoryValue);

    // Get an actual EAN from the selected category
    // First select the category and go to editor to see items
    await page.click('#btn-cancel-difference');
    await page.waitForTimeout(200);

    await page.selectOption('#category-select', firstCategoryValue);
    await page.click('#btn-start-editing');
    await page.waitForSelector('#editor-screen:not(.hidden)', { timeout: 5000 });

    // Get EAN from the first item in the editor
    await page.waitForSelector('.item-ean', { timeout: 5000 });
    const eanText = await page.locator('.item-ean').first().textContent();
    // Extract just the EAN number (remove "EAN: " prefix)
    const eanMatch = eanText.match(/EAN:\s*(\d+)/);
    const firstEAN = eanMatch ? eanMatch[1] : null;

    if (firstEAN) {
      // Go back to category screen
      await page.click('#btn-back-category');
      await page.waitForSelector('#category-screen:not(.hidden)', { timeout: 5000 });

      // Open modal again
      await page.click('#btn-show-difference');
      await waitForModal(page, 'difference-modal');

      // Select the same category
      await page.selectOption('#difference-category', firstCategoryValue);

      // Enter the existing EAN
      await page.fill('#difference-input', firstEAN);

      // Click Continue
      await page.click('#btn-continue-difference');

      // Wait for results
      await page.waitForSelector('#difference-results-section:not(.hidden)', { timeout: 5000 });

      // Verify "no additional items" message appears (since we entered an existing EAN)
      const additionalText = await page.locator('#difference-additional-tbody').textContent();
      expect(additionalText).toContain('No additional items found');
    }
  });

  test('should work with both EAN and article numbers', async ({ page }) => {
    // Open modal
    await page.click('#btn-show-difference');
    await waitForModal(page, 'difference-modal');

    // Select first category
    const categoryOptions = await page.locator('#difference-category option').all();
    let firstCategoryValue = null;
    for (const option of categoryOptions) {
      const value = await option.getAttribute('value');
      if (value && value !== '' && value !== '__NEW_CATEGORY__') {
        firstCategoryValue = value;
        break;
      }
    }
    await page.selectOption('#difference-category', firstCategoryValue);

    // Mix of EANs and article numbers
    await page.fill('#difference-input', '9999999999999\nARTICLE123\n8888888888888');

    // Click Continue
    await page.click('#btn-continue-difference');

    // Wait for results
    await page.waitForSelector('#difference-results-section:not(.hidden)', { timeout: 5000 });

    // Should show results without errors
    await expect(page.locator('#difference-results-section')).not.toHaveClass(/hidden/);
  });

  test('should switch language correctly', async ({ page }) => {
    // Language buttons are on upload screen, so go back
    await page.click('#btn-back-upload');
    await page.waitForSelector('#upload-screen:not(.hidden)', { timeout: 5000 });

    // Switch to German
    await page.click('#lang-de');
    await page.waitForTimeout(500); // Wait for language switch

    // Navigate back to category screen
    await navigateToCategory(page);

    // Verify button text changed to German
    const buttonTextDE = await page.locator('#btn-show-difference span').textContent();
    expect(buttonTextDE).toBe('Unterschied anzeigen');

    // Open modal
    await page.click('#btn-show-difference');
    await waitForModal(page, 'difference-modal');

    // Verify modal title is in German
    const modalTitleDE = await page.locator('#difference-modal-title').textContent();
    expect(modalTitleDE).toBe('Unterschied anzeigen');

    // Close modal
    await page.click('#btn-cancel-difference');
    await page.waitForTimeout(200);

    // Go back to upload screen
    await page.click('#btn-back-upload');
    await page.waitForSelector('#upload-screen:not(.hidden)', { timeout: 5000 });

    // Switch back to English
    await page.click('#lang-en');
    await page.waitForTimeout(500);

    // Navigate to category screen again
    await navigateToCategory(page);

    // Verify button text changed back to English
    const buttonTextEN = await page.locator('#btn-show-difference span').textContent();
    expect(buttonTextEN).toBe('Show Difference');
  });

  test('should display item details with all fields from Excel', async ({ page }) => {
    // Open difference modal
    await page.click('#btn-show-difference');
    await waitForModal(page, 'difference-modal');

    // Select first category
    const categoryOptions = await page.locator('#difference-category option').all();
    let firstCategoryValue = null;
    for (const option of categoryOptions) {
      const value = await option.getAttribute('value');
      if (value && value !== '' && value !== '__NEW_CATEGORY__') {
        firstCategoryValue = value;
        break;
      }
    }
    await page.selectOption('#difference-category', firstCategoryValue);

    // Enter a non-existing EAN (all items will be missing)
    await page.fill('#difference-input', '9999999999999');

    // Click Continue
    await page.click('#btn-continue-difference');

    // Wait for results
    await page.waitForSelector('#difference-results-section:not(.hidden)', { timeout: 5000 });

    // Click first magnifier to open details
    await page.locator('#difference-missing-tbody .btn-magnifier').first().click();

    // Wait for details modal
    await waitForModal(page, 'item-details-modal');

    // Verify table has multiple rows (all Excel columns)
    const detailRows = await page.locator('#item-details-tbody tr').count();
    expect(detailRows).toBeGreaterThan(5); // Should have many fields from Excel

    // Verify table has both headers and values
    const firstRow = page.locator('#item-details-tbody tr').first();
    const cells = await firstRow.locator('td').count();
    expect(cells).toBe(2); // Header and value columns
  });

  test('should show magnifier icon for additional items', async ({ page }) => {
    // Open modal
    await page.click('#btn-show-difference');
    await waitForModal(page, 'difference-modal');

    // Select first category
    const categoryOptions = await page.locator('#difference-category option').all();
    let firstCategoryValue = null;
    for (const option of categoryOptions) {
      const value = await option.getAttribute('value');
      if (value && value !== '' && value !== '__NEW_CATEGORY__') {
        firstCategoryValue = value;
        break;
      }
    }
    await page.selectOption('#difference-category', firstCategoryValue);

    // Enter non-existing EANs
    await page.fill('#difference-input', '9999999999999\n8888888888888');

    // Click Continue
    await page.click('#btn-continue-difference');

    // Wait for results
    await page.waitForSelector('#difference-results-section:not(.hidden)', { timeout: 5000 });

    // Check if magnifier buttons exist for additional items
    const magnifiers = await page.locator('#difference-additional-tbody .btn-magnifier-additional').count();
    expect(magnifiers).toBeGreaterThan(0);
  });

  test('should open details modal when clicking magnifier on additional item not in Excel', async ({ page }) => {
    // Open modal
    await page.click('#btn-show-difference');
    await waitForModal(page, 'difference-modal');

    // Select first category
    const categoryOptions = await page.locator('#difference-category option').all();
    let firstCategoryValue = null;
    for (const option of categoryOptions) {
      const value = await option.getAttribute('value');
      if (value && value !== '' && value !== '__NEW_CATEGORY__') {
        firstCategoryValue = value;
        break;
      }
    }
    await page.selectOption('#difference-category', firstCategoryValue);

    // Enter a completely non-existing EAN
    await page.fill('#difference-input', '9999999999999');

    // Click Continue
    await page.click('#btn-continue-difference');

    // Wait for results
    await page.waitForSelector('#difference-results-section:not(.hidden)', { timeout: 5000 });

    // Click magnifier on additional item
    await page.locator('#difference-additional-tbody .btn-magnifier-additional').first().click();

    // Wait for details modal
    await waitForModal(page, 'item-details-modal');

    // Verify modal is visible
    await expect(page.locator('#item-details-modal')).not.toHaveClass(/hidden/);

    // Verify table has content (should show "-" for all fields except identifier)
    const rows = await page.locator('#item-details-tbody tr').count();
    expect(rows).toBeGreaterThan(0);

    // Verify the identifier appears in the table
    const tableText = await page.locator('#item-details-tbody').textContent();
    expect(tableText).toContain('9999999999999');
  });

  test('should show real details when additional item exists in Excel (different category)', async ({ page }) => {
    // This test checks if an item from one category is shown in the details
    // when entered in the difference check for another category

    // Get all categories before opening modal
    const categoryOptions = await page.locator('#category-select option').all();
    const categories = [];
    for (const option of categoryOptions) {
      const value = await option.getAttribute('value');
      if (value && value !== '' && value !== '__NEW_CATEGORY__') {
        categories.push(value);
      }
    }

    if (categories.length >= 2) {
      // Navigate to second category to get an EAN from it
      const secondCategory = categories[1];
      await page.selectOption('#category-select', secondCategory);
      await page.click('#btn-start-editing');
      await page.waitForSelector('#editor-screen:not(.hidden)', { timeout: 5000 });

      // Get EAN from first item
      await page.waitForSelector('.item-ean', { timeout: 5000 });
      const eanText = await page.locator('.item-ean').first().textContent();
      const eanMatch = eanText.match(/EAN:\s*(\d+)/);
      const eanFromSecondCategory = eanMatch ? eanMatch[1] : null;

      if (eanFromSecondCategory) {
        // Go back to category screen
        await page.click('#btn-back-category');
        await page.waitForSelector('#category-screen:not(.hidden)', { timeout: 5000 });

        // Open difference modal
        await page.click('#btn-show-difference');
        await waitForModal(page, 'difference-modal');

        // Select first category (different from where the EAN came from)
        const firstCategory = categories[0];
        await page.selectOption('#difference-category', firstCategory);

        // Enter the EAN from second category
        await page.fill('#difference-input', eanFromSecondCategory);

        // Click Continue
        await page.click('#btn-continue-difference');

        // Wait for results
        await page.waitForSelector('#difference-results-section:not(.hidden)', { timeout: 5000 });

        // The item should appear in "additional items" (not in first category)
        const additionalText = await page.locator('#difference-additional-tbody').textContent();
        expect(additionalText).toContain(eanFromSecondCategory);

        // Click magnifier to view details
        await page.locator('#difference-additional-tbody .btn-magnifier-additional').first().click();

        // Wait for details modal
        await waitForModal(page, 'item-details-modal');

        // Should show real details from Excel (not just dashes)
        const tableText = await page.locator('#item-details-tbody').textContent();
        expect(tableText).toContain(eanFromSecondCategory);

        // Should have multiple rows with actual data
        const rows = await page.locator('#item-details-tbody tr').count();
        expect(rows).toBeGreaterThan(5);
      }
    }
  });
});
