const { test, expect } = require('@playwright/test');
const { setupApp } = require('./helpers');

test.describe('Sorter Utility Functions', () => {
  test.beforeEach(async ({ page, context }) => {
    await setupApp(page, context);
  });

  test('compareAlphanumeric should sort numbers correctly', async ({ page }) => {
    const result = await page.evaluate(() => {
      if (typeof compareAlphanumeric === 'undefined') return null;
      return [
        compareAlphanumeric('1', '2'),
        compareAlphanumeric('10', '2'),
        compareAlphanumeric('A', 'B'),
        compareAlphanumeric('A1', 'A2'),
        compareAlphanumeric('A10', 'A2'),
      ];
    });

    expect(result).not.toBeNull();
    expect(result[0]).toBeLessThan(0); // '1' < '2'
    expect(result[1]).toBeGreaterThan(0); // '10' > '2' (numeric)
    expect(result[2]).toBeLessThan(0); // 'A' < 'B'
    expect(result[3]).toBeLessThan(0); // 'A1' < 'A2'
    expect(result[4]).toBeGreaterThan(0); // 'A10' > 'A2' (numeric in string)
  });

  test('sortItems should sort by shelf, row, and position', async ({ page }) => {
    const result = await page.evaluate(() => {
      if (typeof sortItems === 'undefined') return null;
      const items = [
        { shelf: 'B', row: 2, position: 1, ean: '004' },
        { shelf: 'A', row: 1, position: 2, ean: '002' },
        { shelf: 'A', row: 1, position: 1, ean: '001' },
        { shelf: 'B', row: 1, position: 1, ean: '003' },
      ];

      const sorted = sortItems([...items]);
      return sorted.map(item => item.ean);
    });

    expect(result).not.toBeNull();
    expect(result).toEqual(['001', '002', '003', '004']);
  });

  test('groupItemsByShelf should group items correctly', async ({ page }) => {
    const result = await page.evaluate(() => {
      if (typeof groupItemsByShelf === 'undefined') return null;
      const items = [
        { shelf: 'A', ean: '001' },
        { shelf: 'B', ean: '002' },
        { shelf: 'A', ean: '003' },
      ];

      const groups = groupItemsByShelf(items);
      return {
        aCount: groups['A'].length,
        bCount: groups['B'].length,
      };
    });

    expect(result).not.toBeNull();
    expect(result.aCount).toBe(2);
    expect(result.bCount).toBe(1);
  });

  test('moveItemPosition should swap adjacent items', async ({ page }) => {
    const result = await page.evaluate(() => {
      if (typeof moveItemPosition === 'undefined') return null;
      const items = [
        { id: 1, shelf: 'A', row: 1, position: 1, ean: '001', locked: false },
        { id: 2, shelf: 'A', row: 1, position: 2, ean: '002', locked: false },
        { id: 3, shelf: 'A', row: 1, position: 3, ean: '003', locked: false },
      ];

      const moved = moveItemPosition([...items], 0, 'down');
      return moved.map(item => item.ean);
    });

    expect(result).not.toBeNull();
    expect(result).toEqual(['002', '001', '003']);
  });

  test('moveItemPosition should not move locked items', async ({ page }) => {
    const result = await page.evaluate(() => {
      if (typeof moveItemPosition === 'undefined') return null;
      const items = [
        { id: 1, shelf: 'A', row: 1, position: 1, ean: '001', locked: true },
        { id: 2, shelf: 'A', row: 1, position: 2, ean: '002', locked: false },
      ];

      const moved = moveItemPosition([...items], 0, 'down');
      return moved.map(item => item.ean);
    });

    expect(result).not.toBeNull();
    // Should not move because item is locked
    expect(result).toEqual(['001', '002']);
  });

  test('canMoveUp should return false for first item', async ({ page }) => {
    const result = await page.evaluate(() => {
      if (typeof canMoveUp === 'undefined') return null;
      const items = [
        { shelf: 'A', row: 1, position: 1, locked: false },
      ];
      return canMoveUp(items, 0);
    });

    expect(result).toBe(false);
  });

  test('canMoveDown should return false for last item', async ({ page }) => {
    const result = await page.evaluate(() => {
      if (typeof canMoveDown === 'undefined') return null;
      const items = [
        { shelf: 'A', row: 1, position: 1, locked: false },
      ];
      return canMoveDown(items, 0);
    });

    expect(result).toBe(false);
  });

  test('canDecreaseRow should return false when row is 1', async ({ page }) => {
    const result = await page.evaluate(() => {
      if (typeof canDecreaseRow === 'undefined') return null;
      const items = [
        { shelf: 'A', row: 1, position: 1, locked: false },
      ];
      return canDecreaseRow(items, 0);
    });

    expect(result).toBe(false);
  });

  test('normalizePositions should renumber positions consecutively', async ({ page }) => {
    const result = await page.evaluate(() => {
      if (typeof normalizePositions === 'undefined') return null;
      const items = [
        { shelf: 'A', row: 1, position: 5, ean: '001', removed: false },
        { shelf: 'A', row: 1, position: 10, ean: '002', removed: false },
        { shelf: 'A', row: 1, position: 15, ean: '003', removed: false },
      ];

      const normalized = normalizePositions([...items]);
      return normalized.map(item => ({ ean: item.ean, position: item.position }));
    });

    expect(result).not.toBeNull();
    expect(result).toEqual([
      { ean: '001', position: 1 },
      { ean: '002', position: 2 },
      { ean: '003', position: 3 },
    ]);
  });

  test('normalizePositions should not renumber removed items', async ({ page }) => {
    const result = await page.evaluate(() => {
      if (typeof normalizePositions === 'undefined') return null;
      const items = [
        { shelf: 'A', row: 1, position: 1, ean: '001', removed: false },
        { shelf: 'A', row: 1, position: 5, ean: '002', removed: true },
        { shelf: 'A', row: 1, position: 3, ean: '003', removed: false },
      ];

      const normalized = normalizePositions([...items]);
      return normalized.map(item => ({ ean: item.ean, position: item.position, removed: item.removed }));
    });

    expect(result).not.toBeNull();

    // First non-removed should be position 1, second should be position 2
    // Removed item keeps position 5
    const item001 = result.find(item => item.ean === '001');
    const item002 = result.find(item => item.ean === '002');
    const item003 = result.find(item => item.ean === '003');

    expect(item001.position).toBe(1);
    expect(item002.position).toBe(5); // Keeps original position
    expect(item002.removed).toBe(true);
    expect(item003.position).toBe(2);
  });
});
