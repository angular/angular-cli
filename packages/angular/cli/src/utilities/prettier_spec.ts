/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { batchFilesByArgumentLength } from './prettier';

describe('batchFilesByArgumentLength', () => {
  it('returns no batches when there are no files', () => {
    expect(batchFilesByArgumentLength([], 10, 100)).toEqual([]);
  });

  it('keeps files that fit the budget in a single batch', () => {
    const files = ['a.ts', 'b.ts', 'c.ts'];

    expect(batchFilesByArgumentLength(files, 0, 1000)).toEqual([files]);
  });

  it('splits files into multiple batches when the budget is exceeded', () => {
    // Each file contributes `length + 1` => 5; a budget of 12 fits two files per batch.
    expect(batchFilesByArgumentLength(['aaaa', 'bbbb', 'cccc', 'dddd'], 0, 12)).toEqual([
      ['aaaa', 'bbbb'],
      ['cccc', 'dddd'],
    ]);
  });

  it('reserves the base argument length in every batch', () => {
    // base 8, each file => 5: 8 + 5 fits, 8 + 5 + 5 > 15 so the second file starts a new batch.
    expect(batchFilesByArgumentLength(['aaaa', 'bbbb'], 8, 15)).toEqual([['aaaa'], ['bbbb']]);
  });

  it('reserves extra length for files that contain spaces (quoted when spawned)', () => {
    // 'a a' contains a space => length + 3 = 6; the others => length + 1 = 2. Budget 10:
    // 6 + 2 + 2 fits, adding the fourth file (12) exceeds it.
    expect(batchFilesByArgumentLength(['a a', 'b', 'c', 'd'], 0, 10)).toEqual([
      ['a a', 'b', 'c'],
      ['d'],
    ]);
  });

  it('never drops a file that is longer than the budget on its own', () => {
    const files = ['short', 'a-very-long-single-file-name-well-over-budget', 'tiny'];

    const batches = batchFilesByArgumentLength(files, 0, 10);

    expect(batches.flat()).toEqual(files);
    expect(batches).toContain(['a-very-long-single-file-name-well-over-budget']);
  });

  it('keeps multi-file batches within the budget for a large file set', () => {
    const files = Array.from({ length: 5000 }, (_, index) => `path/to/file-${index}.component.ts`);
    const baseLength = 40;
    const maxLength = 2000;

    for (const batch of batchFilesByArgumentLength(files, baseLength, maxLength)) {
      const length = batch.reduce((total, file) => total + file.length + 1, baseLength);

      // A batch may exceed the budget only when it is a single unavoidable oversized file.
      if (batch.length > 1) {
        expect(length).toBeLessThanOrEqual(maxLength);
      }
    }
  });
});
