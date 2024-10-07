/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

/**
 * Attaches listeners to the Node.js process to capture and handle unhandled rejections and uncaught exceptions.
 * Captured errors are logged to the console. This function logs errors to the console, preventing unhandled errors
 * from crashing the server. It is particularly useful for Zoneless apps, ensuring error handling without relying on Zone.js.
 *
 * @developerPreview
 */
export function attachNodeGlobalErrorHandlers(): void {
  // Ensure that the listeners are registered only once.
  // Otherwise, multiple instances may be registered during edit/refresh.
  const gThis: typeof globalThis & { ngAttachNodeGlobalErrorHandlersCalled?: boolean } = globalThis;
  if (gThis.ngAttachNodeGlobalErrorHandlersCalled) {
    return;
  }

  gThis.ngAttachNodeGlobalErrorHandlersCalled = true;

  process
    // eslint-disable-next-line no-console
    .on('unhandledRejection', (error) => console.error('unhandledRejection', error))
    // eslint-disable-next-line no-console
    .on('uncaughtException', (error) => console.error('uncaughtException', error));
}
