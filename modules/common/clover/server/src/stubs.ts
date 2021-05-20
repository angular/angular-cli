/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { DOMWindow } from 'jsdom';

function noop(): void {}

export function augmentWindowWithStubs(window: DOMWindow): void {
  window.resizeBy = noop;
  window.resizeTo = noop;
  window.scroll = noop;
  window.scrollBy = noop;
  window.scrollTo = noop;
}
