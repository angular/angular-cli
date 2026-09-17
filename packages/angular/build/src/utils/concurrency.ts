/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

/**
 * Executes an asynchronous function for each item in an array concurrently up to a specified limit.
 *
 * If any task fails, processing of subsequent items stops and the first encountered error is re-thrown
 * after all currently in-flight tasks have settled.
 *
 * @param items Array of items to process.
 * @param limit Maximum number of concurrent tasks in flight.
 * @param fn Async task function.
 */
export async function runConcurrent<T>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<void>,
): Promise<void> {
  if (items.length === 0) {
    return;
  }

  let index = 0;
  let firstError: unknown;

  const concurrency = Math.min(Math.max(1, Math.floor(limit) || 1), items.length);
  const workers = Array.from({ length: concurrency }, async () => {
    while (!firstError && index < items.length) {
      const i = index++;
      try {
        await fn(items[i], i);
      } catch (error) {
        firstError ??= error;
      }
    }
  });

  await Promise.allSettled(workers);

  if (firstError) {
    throw firstError;
  }
}

/**
 * Maps an array asynchronously with a sliding worker pool up to a specified concurrency limit.
 *
 * If any task fails, processing of subsequent items stops and the first encountered error is re-thrown
 * after all currently in-flight tasks have settled.
 *
 * @param items Array of items to map.
 * @param limit Maximum number of concurrent tasks in flight.
 * @param fn Async mapper function.
 * @returns Array of mapped results in the original item order.
 */
export async function mapConcurrent<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (items.length === 0) {
    return [];
  }

  const results: R[] = new Array(items.length);
  let index = 0;
  let firstError: unknown;

  const concurrency = Math.min(Math.max(1, Math.floor(limit) || 1), items.length);
  const workers = Array.from({ length: concurrency }, async () => {
    while (!firstError && index < items.length) {
      const i = index++;
      try {
        results[i] = await fn(items[i], i);
      } catch (error) {
        firstError ??= error;
      }
    }
  });

  await Promise.allSettled(workers);

  if (firstError) {
    throw firstError;
  }

  return results;
}
