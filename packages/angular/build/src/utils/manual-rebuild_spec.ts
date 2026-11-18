/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import {
  ManualRebuild,
  ManualRebuildController,
  mergeChangedFiles,
  waitForManualRebuilds,
} from './manual-rebuild';
import { ChangedFiles } from './watcher';

function createChanges(changes: Partial<Record<'added' | 'modified' | 'removed', string[]>>) {
  const result = new ChangedFiles();
  changes.added?.forEach((file) => result.added.add(file));
  changes.modified?.forEach((file) => result.modified.add(file));
  changes.removed?.forEach((file) => result.removed.add(file));

  return result;
}

/** A minimal controllable async iterable of file changes. */
class FakeWatcher implements AsyncIterableIterator<ChangedFiles> {
  #queue: ChangedFiles[] = [];
  #waiting: ((result: IteratorResult<ChangedFiles>) => void) | undefined;
  #closed = false;

  [Symbol.asyncIterator]() {
    return this;
  }

  emit(changes: ChangedFiles): void {
    if (this.#waiting) {
      const resolve = this.#waiting;
      this.#waiting = undefined;
      resolve({ value: changes });
    } else {
      this.#queue.push(changes);
    }
  }

  close(): void {
    this.#closed = true;
    this.#waiting?.({ done: true, value: undefined });
    this.#waiting = undefined;
  }

  next(): Promise<IteratorResult<ChangedFiles>> {
    const value = this.#queue.shift();
    if (value) {
      return Promise.resolve({ value });
    }
    if (this.#closed) {
      return Promise.resolve({ done: true, value: undefined });
    }

    return new Promise((resolve) => (this.#waiting = resolve));
  }
}

function tick(ms = 0): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('mergeChangedFiles', () => {
  it('combines distinct changes', () => {
    const target = createChanges({ added: ['a'] });
    mergeChangedFiles(target, createChanges({ modified: ['b'], removed: ['c'] }));

    expect([...target.added]).toEqual(['a']);
    expect([...target.modified]).toEqual(['b']);
    expect([...target.removed]).toEqual(['c']);
  });

  it('reports a file that was added and then removed only as removed', () => {
    const target = createChanges({ added: ['a'] });
    mergeChangedFiles(target, createChanges({ removed: ['a'] }));

    expect(target.added.size).toBe(0);
    expect([...target.removed]).toEqual(['a']);
  });

  it('reports a file that was removed and then added as modified', () => {
    const target = createChanges({ removed: ['a'] });
    mergeChangedFiles(target, createChanges({ added: ['a'] }));

    expect(target.removed.size).toBe(0);
    expect(target.added.size).toBe(0);
    expect([...target.modified]).toEqual(['a']);
  });

  it('keeps a file that was added and then modified as added', () => {
    const target = createChanges({ added: ['a'] });
    mergeChangedFiles(target, createChanges({ modified: ['a'] }));

    expect([...target.added]).toEqual(['a']);
    expect(target.modified.size).toBe(0);
  });
});

describe('waitForManualRebuilds', () => {
  let watcher: FakeWatcher;
  let controller: ManualRebuildController;
  let iterator: AsyncIterator<ManualRebuild>;

  beforeEach(() => {
    watcher = new FakeWatcher();
    controller = new ManualRebuildController();
    iterator = waitForManualRebuilds(watcher, controller, { settleTime: 10 })[
      Symbol.asyncIterator
    ]();
  });

  afterEach(async () => {
    watcher.close();
    await iterator.return?.();
  });

  it('does not yield changes until a rebuild is requested', async () => {
    let yielded = false;
    const next = iterator.next().then((result) => {
      yielded = true;

      return result;
    });

    watcher.emit(createChanges({ modified: ['a'] }));
    watcher.emit(createChanges({ modified: ['b'] }));
    await tick(50);
    expect(yielded).toBeFalse();

    const request = controller.requestRebuild();
    const { value } = await next;

    expect([...(value as ManualRebuild).changes.modified]).toEqual(['a', 'b']);
    expect((value as ManualRebuild).requests.length).toBe(1);

    // Requests are resolved by the consumer once the rebuild completes
    (value as ManualRebuild).requests.forEach((resolve) => resolve({ status: 'success' }));
    await expectAsync(request).toBeResolvedTo({ status: 'success' });
  });

  it('resolves requests with no-changes when there are no pending changes', async () => {
    void iterator.next();
    await expectAsync(controller.requestRebuild()).toBeResolvedTo({ status: 'no-changes' });
  });

  it('includes changes that arrive shortly after a request', async () => {
    const next = iterator.next();

    const request = controller.requestRebuild();
    watcher.emit(createChanges({ added: ['late'] }));

    const { value } = await next;
    expect([...(value as ManualRebuild).changes.added]).toEqual(['late']);
    (value as ManualRebuild).requests.forEach((resolve) => resolve({ status: 'success' }));
    await expectAsync(request).toBeResolvedTo({ status: 'success' });
  });

  it('cancels pending requests when the watcher closes', async () => {
    const next = iterator.next();
    watcher.emit(createChanges({ modified: ['a'] }));
    await tick();

    // Close before the settle time elapses
    const request = controller.requestRebuild();
    watcher.close();

    await expectAsync(next).toBeResolvedTo({ done: true, value: undefined });
    await expectAsync(request).toBeResolvedTo({ status: 'cancelled' });
    await expectAsync(controller.requestRebuild()).toBeResolvedTo({ status: 'cancelled' });
  });
});
