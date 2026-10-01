/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

const MIMALLOC_PURGE_DELAY = 'MIMALLOC_PURGE_DELAY';

let rolldownPromise: Promise<typeof import('rolldown')> | undefined;

/**
 * Dynamically loads the `rolldown` module while configuring its embedded
 * mimalloc v3 allocator to immediately purge freed arena memory.
 *
 * Rolldown's native binding statically links mimalloc v3, which defaults to a
 * 4-second arena purge delay (`MIMALLOC_PURGE_DELAY=1000` * `MIMALLOC_ARENA_PURGE_MULT=4`)
 * and only triggers purges cooperatively during subsequent allocations. In single-run
 * CLI builds where Rolldown is not invoked again after bundling completes, non-zero
 * purge delays prevent freed arena pages from being decommitted back to the OS,
 * leading to high peak RSS during post-bundle stages.
 *
 * Because mimalloc reads and caches environment options synchronously when the native
 * `.node` addon is first loaded (`mi_process_init` -> `_mi_options_init`), temporarily
 * setting `MIMALLOC_PURGE_DELAY=0` during the initial `import('rolldown')` call
 * configures Rolldown's allocator without leaving the environment variable set for
 * subsequent code or child processes.
 *
 * @returns A promise that resolves to the `rolldown` module namespace.
 */
export function loadRolldown(): Promise<typeof import('rolldown')> {
  if (!rolldownPromise) {
    const hasCustomPurgeDelay = Object.hasOwn(process.env, MIMALLOC_PURGE_DELAY);
    if (!hasCustomPurgeDelay) {
      process.env[MIMALLOC_PURGE_DELAY] = '0';
    }

    rolldownPromise = import('rolldown').finally(() => {
      if (!hasCustomPurgeDelay) {
        delete process.env[MIMALLOC_PURGE_DELAY];
      }
    });
  }

  return rolldownPromise;
}
