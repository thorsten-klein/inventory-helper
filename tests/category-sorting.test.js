/**
 * Test for category dropdown alphabetical sorting (case-insensitive)
 *
 * Bug: Category dropdown should sort alphabetically ignoring case
 * Example: "apple", "Banana", "cherry" should be sorted as:
 * "apple", "Banana", "cherry" (not "Banana", "apple", "cherry")
 */

// FIXED: extractUniqueCategories function with case-insensitive sorting
function extractUniqueCategories(items) {
    const categories = new Set();
    items.forEach(item => {
        if (item.category) {
            categories.add(item.category);
        }
    });
    // Sort case-insensitively by comparing lowercase versions
    return Array.from(categories).sort((a, b) => {
        const lowerA = a.toLowerCase();
        const lowerB = b.toLowerCase();
        if (lowerA < lowerB) return -1;
        if (lowerA > lowerB) return 1;
        return 0;
    });
}

// Test data with mixed case categories including the real-world case
const testItems = [
    { category: 'Zebra' },
    { category: 'apple' },
    { category: 'Banana' },
    { category: 'cherry' },
    { category: 'Apricot' },
    { category: 'ZUCCHINI' },
    { category: 'eMobility' },
    { category: 'banana' }, // duplicate, should be ignored
];

// console.log('Testing category sorting...\n');

// Extract categories using current (buggy) implementation
const categories = extractUniqueCategories(testItems);

// console.log('Current output (case-sensitive):');
// console.log(categories);
// console.log('');

// Expected output (case-insensitive alphabetical)
// Note: Set keeps both "Banana" and "banana" as they are different strings
// but they sort together alphabetically (case-insensitive)
// eMobility should come BEFORE Zebra and ZUCCHINI (e < z)
const expected = ['apple', 'Apricot', 'Banana', 'banana', 'cherry', 'eMobility', 'Zebra', 'ZUCCHINI'];

// console.log('Expected output (case-insensitive):');
// console.log(expected);
// console.log('');

// Check if sorting is correct
let testPassed = true;
let errors = [];

if (categories.length !== expected.length) {
    testPassed = false;
    errors.push(`Length mismatch: got ${categories.length}, expected ${expected.length}`);
}

for (let i = 0; i < Math.min(categories.length, expected.length); i++) {
    if (categories[i] !== expected[i]) {
        testPassed = false;
        errors.push(`Position ${i}: got "${categories[i]}", expected "${expected[i]}"`);
    }
}

if (testPassed) {
    // console.log('✓ TEST PASSED: Categories are sorted correctly (case-insensitive)');
} else {
    // console.log('✗ TEST FAILED: Categories are NOT sorted correctly');
    // console.log('\nErrors:');
    // errors.forEach(error => console.log('  - ' + error));
}

// console.log('\n---');
// console.log('Fix applied: Categories are now sorted case-insensitively');
// console.log('by comparing lowercase versions of the strings.');
