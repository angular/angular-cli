/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { setTimeout } from 'node:timers/promises';
import { promiseWithAbort } from '../../src/utils/promise';

describe('promiseWithAbort', () => {
  it('should reject with an AbortError when the signal is aborted', async () => {
    const abortController = new AbortController();
    const promise = promiseWithAbort(setTimeout(500), abortController.signal, 'Test operation');

    queueMicrotask(() => {
      abortController.abort('Test reason');
    });

    await expectAsync(promise).toBeRejectedWithError();
  });

  it('should not reject if the signal is not aborted', async () => {
    const promise = promiseWithAbort(
      setTimeout(100),
      AbortSignal.timeout(10_000),
      'Test operation',
    );

    // Wait briefly to ensure no rejection occurs
    await setTimeout(20);

    await expectAsync(promise).toBeResolved();
  });
});
