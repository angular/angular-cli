/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { mapConcurrent, runConcurrent } from './concurrency';

describe('concurrency utilities', () => {
  describe('runConcurrent', () => {
    it('should process all items in an array', async () => {
      const items = [1, 2, 3, 4, 5];
      const processed: number[] = [];

      await runConcurrent(items, 2, async (item) => {
        processed.push(item);
      });

      expect(processed.sort((a, b) => a - b)).toEqual(items);
    });

    it('should respect the concurrency limit', async () => {
      const items = [10, 20, 30, 40, 50, 60];
      const limit = 2;
      let active = 0;
      let maxActive = 0;

      await runConcurrent(items, limit, async () => {
        active++;
        maxActive = Math.max(maxActive, active);
        await new Promise((resolve) => setTimeout(resolve, 10));
        active--;
      });

      expect(maxActive).toBeLessThanOrEqual(limit);
    });

    it('should handle non-integer and NaN limits', async () => {
      const items = [1, 2, 3];
      const processed: number[] = [];

      await runConcurrent(items, 2.7, async (item) => {
        processed.push(item);
      });
      expect(processed).toEqual(items);

      const processedNaN: number[] = [];
      await runConcurrent(items, NaN, async (item) => {
        processedNaN.push(item);
      });
      expect(processedNaN).toEqual(items);
    });

    it('should handle an empty array', async () => {
      let called = false;
      await runConcurrent([], 3, async () => {
        called = true;
      });

      expect(called).toBe(false);
    });

    it('should pass item and index to callback', async () => {
      const items = ['a', 'b', 'c'];
      const passed: { item: string; index: number }[] = [];

      await runConcurrent(items, 2, async (item, index) => {
        passed.push({ item, index });
      });

      expect(passed.sort((a, b) => a.index - b.index)).toEqual([
        { item: 'a', index: 0 },
        { item: 'b', index: 1 },
        { item: 'c', index: 2 },
      ]);
    });

    it('should stop processing new items and rethrow the first error', async () => {
      const items = [1, 2, 3, 4, 5, 6];
      const executed: number[] = [];

      await expectAsync(
        runConcurrent(items, 1, async (item) => {
          executed.push(item);
          if (item === 2) {
            throw new Error('Task failed');
          }
        }),
      ).toBeRejectedWithError('Task failed');

      // Subsequent items should not have been executed
      expect(executed).toEqual([1, 2]);
    });

    it('should wait for in-flight tasks to settle when an error occurs', async () => {
      const items = [1, 2, 3, 4];
      let task2Finished = false;

      await expectAsync(
        runConcurrent(items, 2, async (item) => {
          if (item === 1) {
            throw new Error('Task 1 failed');
          }
          if (item === 2) {
            await new Promise((resolve) => setTimeout(resolve, 20));
            task2Finished = true;
          }
        }),
      ).toBeRejectedWithError('Task 1 failed');

      expect(task2Finished).toBe(true);
    });
  });

  describe('mapConcurrent', () => {
    it('should map items and return results in original order', async () => {
      const items = [1, 2, 3, 4, 5];

      const results = await mapConcurrent(items, 2, async (item) => {
        // Add varying delay so tasks finish out of order
        await new Promise((resolve) => setTimeout(resolve, (5 - item) * 5));

        return item * 2;
      });

      expect(results).toEqual([2, 4, 6, 8, 10]);
    });

    it('should respect the concurrency limit', async () => {
      const items = [1, 2, 3, 4, 5];
      const limit = 2;
      let active = 0;
      let maxActive = 0;

      await mapConcurrent(items, limit, async (item) => {
        active++;
        maxActive = Math.max(maxActive, active);
        await new Promise((resolve) => setTimeout(resolve, 10));
        active--;

        return item;
      });

      expect(maxActive).toBeLessThanOrEqual(limit);
    });

    it('should handle non-integer and NaN limits', async () => {
      const items = [1, 2, 3];

      const results = await mapConcurrent(items, 2.7, async (item) => item * 2);
      expect(results).toEqual([2, 4, 6]);

      const resultsNaN = await mapConcurrent(items, NaN, async (item) => item * 2);
      expect(resultsNaN).toEqual([2, 4, 6]);
    });

    it('should handle an empty array', async () => {
      const results = await mapConcurrent([], 3, async (item) => item);

      expect(results).toEqual([]);
    });

    it('should pass item and index to mapper function', async () => {
      const items = ['x', 'y', 'z'];

      const results = await mapConcurrent(items, 2, async (item, index) => `${item}:${index}`);

      expect(results).toEqual(['x:0', 'y:1', 'z:2']);
    });

    it('should stop processing new items and rethrow the first error', async () => {
      const items = [1, 2, 3, 4, 5, 6];
      const executed: number[] = [];

      await expectAsync(
        mapConcurrent(items, 1, async (item) => {
          executed.push(item);
          if (item === 2) {
            throw new Error('Map failed');
          }

          return item;
        }),
      ).toBeRejectedWithError('Map failed');

      expect(executed).toEqual([1, 2]);
    });

    it('should wait for in-flight tasks to settle when an error occurs', async () => {
      const items = [1, 2, 3, 4];
      let task2Finished = false;

      await expectAsync(
        mapConcurrent(items, 2, async (item) => {
          if (item === 1) {
            throw new Error('Map 1 failed');
          }
          if (item === 2) {
            await new Promise((resolve) => setTimeout(resolve, 20));
            task2Finished = true;
          }

          return item;
        }),
      ).toBeRejectedWithError('Map 1 failed');

      expect(task2Finished).toBe(true);
    });
  });
});
