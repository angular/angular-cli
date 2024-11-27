/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

/**
 * Creates a promise that resolves with the result of the provided `promise` or rejects with an
 * `AbortError` if the `AbortSignal` is triggered before the promise resolves.
 *
 * @param promise - The promise to monitor for completion.
 * @param signal - An `AbortSignal` used to monitor for an abort event. If the signal is aborted,
 *                 the returned promise will reject.
 * @param errorMessagePrefix - A custom message prefix to include in the error message when the operation is aborted.
 * @returns A promise that either resolves with the value of the provided `promise` or rejects with
 *          an `AbortError` if the `AbortSignal` is triggered.
 *
 * @throws {AbortError} If the `AbortSignal` is triggered before the `promise` resolves.
 */
export function promiseWithAbort<T>(
  promise: Promise<T>,
  signal: AbortSignal,
  errorMessagePrefix: string,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const abortHandler = () => {
      reject(
        new DOMException(`${errorMessagePrefix} was aborted.\n${signal.reason}`, 'AbortError'),
      );
    };

    // Check for abort signal
    if (signal.aborted) {
      abortHandler();

      return;
    }

    signal.addEventListener('abort', abortHandler, { once: true });

    promise
      .then(resolve)
      .catch(reject)
      .finally(() => {
        signal.removeEventListener('abort', abortHandler);
      });
  });
}
