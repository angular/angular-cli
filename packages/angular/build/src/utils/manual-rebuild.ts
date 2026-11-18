/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { setTimeout as delay } from 'node:timers/promises';
import { ChangedFiles } from './watcher';

/**
 * The outcome of a manually requested rebuild.
 * - `success`: a rebuild was performed and completed without errors.
 * - `failure`: a rebuild was performed and completed with errors.
 * - `no-changes`: no file changes were pending so no rebuild was performed.
 * - `cancelled`: the build was stopped before the request could be fulfilled.
 */
export type ManualRebuildStatus = 'success' | 'failure' | 'no-changes' | 'cancelled';

export interface ManualRebuildResult {
  status: ManualRebuildStatus;
}

/**
 * The default amount of time, in milliseconds, that file changes must be quiet before
 * a requested rebuild starts. This allows file system events for edits completed right
 * before the request to be received and coalesced by the file watcher.
 */
const DEFAULT_SETTLE_TIME = 300;

/**
 * Controls when rebuilds are performed while in watch mode.
 *
 * When provided to the build action, file changes detected by the watcher are accumulated
 * but do not trigger a rebuild. Instead, a single incremental rebuild containing all
 * accumulated changes is performed whenever {@link requestRebuild} is called.
 */
export class ManualRebuildController {
  readonly #requests: ((result: ManualRebuildResult) => void)[] = [];
  #listener: (() => void) | undefined;
  #closed = false;

  /**
   * Requests a rebuild containing all file changes detected since the previous rebuild.
   * @returns A promise that resolves once the requested rebuild has completed.
   */
  requestRebuild(): Promise<ManualRebuildResult> {
    if (this.#closed) {
      return Promise.resolve({ status: 'cancelled' });
    }

    return new Promise((resolve) => {
      this.#requests.push(resolve);
      this.#listener?.();
    });
  }

  /** Whether there are rebuild requests waiting to be processed. */
  get hasPendingRequests(): boolean {
    return this.#requests.length > 0;
  }

  /** @internal Registers a listener that is called whenever a rebuild is requested. */
  onRequest(listener: (() => void) | undefined): void {
    this.#listener = listener;
  }

  /**
   * @internal Removes and returns all currently pending requests. Requests made after this call
   * will be fulfilled by a subsequent rebuild.
   */
  takeRequests(): ((result: ManualRebuildResult) => void)[] {
    return this.#requests.splice(0);
  }

  /** @internal Cancels all pending requests and rejects any future requests. */
  close(): void {
    this.#closed = true;
    this.#listener = undefined;
    for (const resolve of this.takeRequests()) {
      resolve({ status: 'cancelled' });
    }
  }
}

/**
 * Merges a set of changes into an existing set of accumulated changes while keeping the
 * accumulated result consistent (e.g., a file that was added and later removed is only
 * reported as removed).
 */
export function mergeChangedFiles(target: ChangedFiles, source: ChangedFiles): void {
  for (const file of source.added) {
    if (target.removed.delete(file)) {
      // Removed and then re-created; treat as a modification of the original file.
      target.modified.add(file);
    } else if (!target.modified.has(file)) {
      target.added.add(file);
    }
  }

  for (const file of source.modified) {
    if (!target.added.has(file)) {
      target.modified.add(file);
    }
  }

  for (const file of source.removed) {
    target.added.delete(file);
    target.modified.delete(file);
    target.removed.add(file);
  }
}

export interface ManualRebuild {
  changes: ChangedFiles;
  requests: ((result: ManualRebuildResult) => void)[];
}

/**
 * Accumulates file changes from a watcher and yields them only when a rebuild has been
 * requested via the provided controller. Requests made while no changes are pending are
 * resolved immediately with a `no-changes` status.
 *
 * @param watcher An async iterable of file changes (typically a `BuildWatcher`).
 * @param controller The controller used to request rebuilds.
 * @param options Additional options.
 */
export async function* waitForManualRebuilds(
  watcher: AsyncIterable<ChangedFiles>,
  controller: ManualRebuildController,
  options: {
    settleTime?: number;
    onChangesPending?: (changes: ChangedFiles) => void;
  } = {},
): AsyncIterable<ManualRebuild> {
  const settleTime = options.settleTime ?? DEFAULT_SETTLE_TIME;

  let pending = new ChangedFiles();
  let lastChangeTime = 0;
  let watcherDone = false;

  // A simple signal used to wake up the main loop on new requests or watcher completion.
  let wake: (() => void) | undefined;
  const notify = () => {
    const resolve = wake;
    wake = undefined;
    resolve?.();
  };

  controller.onRequest(notify);

  // Continuously accumulate changes in the background. This completes once the watcher is closed.
  void (async () => {
    try {
      for await (const changes of watcher) {
        const hadPending = pending.all.length > 0;
        mergeChangedFiles(pending, changes);
        lastChangeTime = Date.now();
        if (!hadPending && pending.all.length > 0) {
          options.onChangesPending?.(pending);
        }
      }
    } catch {
      // Watcher errors end the rebuild loop; the owner of the watcher handles cleanup.
    } finally {
      watcherDone = true;
      notify();
    }
  })();

  try {
    while (!watcherDone) {
      if (!controller.hasPendingRequests) {
        await new Promise<void>((resolve) => (wake = resolve));
        continue;
      }

      // Wait until the file watcher has been quiet for the settle time to ensure that
      // edits made right before the request are included in the rebuild.
      let quietFor = 0;
      do {
        await delay(settleTime - quietFor);
        quietFor = Date.now() - lastChangeTime;
      } while (!watcherDone && quietFor < settleTime);

      if (watcherDone) {
        break;
      }

      const requests = controller.takeRequests();
      if (pending.all.length === 0) {
        for (const resolve of requests) {
          resolve({ status: 'no-changes' });
        }
        continue;
      }

      const changes = pending;
      pending = new ChangedFiles();

      yield { changes, requests };
    }
  } finally {
    // The watcher itself is closed by its owner which also completes the background accumulation.
    controller.close();
  }
}
