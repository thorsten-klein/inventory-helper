const { test, expect } = require('@playwright/test');
const { setupApp } = require('./helpers');

test.describe('EAN-13 Validation', () => {
  test.beforeEach(async ({ page, context }) => {
    await setupApp(page, context);
  });

  test('should validate correct EAN-13 codes', async ({ page }) => {
    const result = await page.evaluate(() => {
      if (typeof isValidEAN13 === 'undefined') return null;
      return [
        isValidEAN13('4006381333931'), // Valid EAN-13
        isValidEAN13('5901234123457'), // Valid EAN-13
        isValidEAN13('9780201379624'), // Valid EAN-13 (book ISBN)
        isValidEAN13('0123456789012'), // Valid EAN-13
        isValidEAN13('8712345678906'), // Valid EAN-13
      ];
    });

    expect(result).not.toBeNull();
    expect(result[0]).toBe(true); // 4006381333931
    expect(result[1]).toBe(true); // 5901234123457
    expect(result[2]).toBe(true); // 9780201379624
    expect(result[3]).toBe(true); // 0123456789012
    expect(result[4]).toBe(true); // 8712345678906
  });

  test('should reject EAN-13 codes with incorrect checksums', async ({ page }) => {
    const result = await page.evaluate(() => {
      if (typeof isValidEAN13 === 'undefined') return null;
      return [
        isValidEAN13('4006381333930'), // Wrong checksum (should be 1)
        isValidEAN13('5901234123456'), // Wrong checksum (should be 7)
        isValidEAN13('9780201379623'), // Wrong checksum (should be 4)
        isValidEAN13('0123456789011'), // Wrong checksum (should be 2)
        isValidEAN13('8712345678905'), // Wrong checksum (should be 6)
      ];
    });

    expect(result).not.toBeNull();
    expect(result[0]).toBe(false); // 4006381333930
    expect(result[1]).toBe(false); // 5901234123456
    expect(result[2]).toBe(false); // 9780201379623
    expect(result[3]).toBe(false); // 0123456789011
    expect(result[4]).toBe(false); // 8712345678905
  });

  test('should reject codes that are not 13 digits', async ({ page }) => {
    const result = await page.evaluate(() => {
      if (typeof isValidEAN13 === 'undefined') return null;
      return [
        isValidEAN13('123456789012'),   // 12 digits (too short)
        isValidEAN13('12345678901234'), // 14 digits (too long)
        isValidEAN13('123'),            // Way too short
        isValidEAN13(''),               // Empty string
        isValidEAN13('1234567'),        // 7 digits
      ];
    });

    expect(result).not.toBeNull();
    expect(result[0]).toBe(false); // 12 digits
    expect(result[1]).toBe(false); // 14 digits
    expect(result[2]).toBe(false); // 3 digits
    expect(result[3]).toBe(false); // empty
    expect(result[4]).toBe(false); // 7 digits
  });

  test('should reject codes with non-numeric characters', async ({ page }) => {
    const result = await page.evaluate(() => {
      if (typeof isValidEAN13 === 'undefined') return null;
      return [
        isValidEAN13('400638133393A'),  // Letter at end
        isValidEAN13('A123456789012'),  // Letter at start
        isValidEAN13('4006381 33931'),  // Space in middle
        isValidEAN13('4006381-33931'),  // Dash in middle
        isValidEAN13('abc1234567890'),  // Multiple letters
      ];
    });

    expect(result).not.toBeNull();
    expect(result[0]).toBe(false); // Letter at end
    expect(result[1]).toBe(false); // Letter at start
    expect(result[2]).toBe(false); // Space in middle
    expect(result[3]).toBe(false); // Dash in middle
    expect(result[4]).toBe(false); // Multiple letters
  });

  test('should validate EAN-13 checksum algorithm correctly', async ({ page }) => {
    // Testing the checksum calculation step-by-step
    const result = await page.evaluate(() => {
      if (typeof isValidEAN13 === 'undefined') return null;

      // Example: 4006381333931
      // Calculation:
      // Position:  1  2  3  4  5  6  7  8  9  10 11 12 13
      // Digits:    4  0  0  6  3  8  1  3  3  3  9  3  1
      // Multiply:  1  3  1  3  1  3  1  3  1  3  1  3  (check)
      // Result:    4  0  0  18 3  24 1  9  3  9  9  9  = 89
      // Check: (10 - (89 % 10)) % 10 = (10 - 9) % 10 = 1 ✓

      return isValidEAN13('4006381333931');
    });

    expect(result).toBe(true);
  });

  test('should handle edge case EAN-13 codes', async ({ page }) => {
    const result = await page.evaluate(() => {
      if (typeof isValidEAN13 === 'undefined') return null;
      return [
        isValidEAN13('0000000000000'), // All zeros (valid with checksum 0)
        isValidEAN13('9999999999994'), // Mostly nines (valid, checksum is 4)
        isValidEAN13('1111111111116'), // All ones except checksum (valid)
      ];
    });

    expect(result).not.toBeNull();
    expect(result[0]).toBe(true);  // 0000000000000
    expect(result[1]).toBe(true);  // 9999999999994
    expect(result[2]).toBe(true);  // 1111111111116
  });

  test('should reject null, undefined, and invalid types', async ({ page }) => {
    const result = await page.evaluate(() => {
      if (typeof isValidEAN13 === 'undefined') return null;
      return [
        isValidEAN13(null),
        isValidEAN13(undefined),
        isValidEAN13(4006381333931), // Number instead of string
        isValidEAN13({}),
        isValidEAN13([]),
      ];
    });

    expect(result).not.toBeNull();
    // All should return false for invalid input types
    expect(result.every(r => r === false)).toBe(true);
  });

  test('should validate real-world EAN-13 examples', async ({ page }) => {
    const result = await page.evaluate(() => {
      if (typeof isValidEAN13 === 'undefined') return null;
      return [
        // Real EAN-13 codes from common products
        isValidEAN13('5000112576009'), // Coca Cola
        isValidEAN13('7622210449283'), // Toblerone
        isValidEAN13('4001686309902'), // Haribo
        isValidEAN13('8711000361481'), // Nivea
        isValidEAN13('4005800029493'), // Persil
      ];
    });

    expect(result).not.toBeNull();
    expect(result[0]).toBe(true); // Coca Cola
    expect(result[1]).toBe(true); // Toblerone
    expect(result[2]).toBe(true); // Haribo
    expect(result[3]).toBe(true); // Nivea
    expect(result[4]).toBe(true); // Persil
  });
});
