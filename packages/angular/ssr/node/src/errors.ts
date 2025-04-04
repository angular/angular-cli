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
 * @remarks
 * This function is a no-op if zone.js is available.
 * For Zone-based apps, similar functionality is provided by Zone.js itself. See the Zone.js implementation here:
 * https://github.com/angular/angular/blob/4a8d0b79001ec09bcd6f2d6b15117aa6aac1932c/packages/zone.js/lib/node/node.ts#L94%7C
 *
 * @internal
 */
export function attachNodeGlobalErrorHandlers(): void {
  if (typeof Zone !== 'undefined') {
    return;
  }

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
