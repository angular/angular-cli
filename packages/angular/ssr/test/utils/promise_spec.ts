/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { setTimeout } from 'node:timers/promises';
import { promiseWithAbort } from '../../src/utils/promise';

function expectRejectedWithError(promise: Promise<any>) {
  if (typeof expectAsync === 'function') {
    return expectAsync(promise).toBeRejectedWithError();
  } else {
    // @ts-expect-error
    return expect(promise).rejects.toThrowError();
  }
}

function expectResolved(promise: Promise<any>) {
  if (typeof expectAsync === 'function') {
    return expectAsync(promise).toBeResolved();
  } else {
    // @ts-expect-error
    return expect(promise).resolves;
  }
}

describe('promiseWithAbort', () => {
  it('should reject with an AbortError when the signal is aborted', async () => {
    const abortController = new AbortController();
    const promise = promiseWithAbort(setTimeout(500), abortController.signal, 'Test operation');

    console.error('queueMicrotask to abort the signal');
    queueMicrotask(() => {
      abortController.abort('Test reason');
    });

    console.error('expectAsync to be rejected with AbortError');
    await expectRejectedWithError(promise);
  });

  it('should not reject if the signal is not aborted', async () => {
    const promise = promiseWithAbort(
      setTimeout(100),
      AbortSignal.timeout(10_000),
      'Test operation',
    );

    // Wait briefly to ensure no rejection occurs
    await setTimeout(20);

    await expectResolved(promise);
  });
});
