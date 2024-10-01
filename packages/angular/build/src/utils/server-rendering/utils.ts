/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { createRequestHandler } from '@angular/ssr';
import type { createNodeRequestHandler } from '@angular/ssr/node';

export function isSsrNodeRequestHandler(
  value: unknown,
): value is ReturnType<typeof createNodeRequestHandler> {
  return typeof value === 'function' && '__ng_node_request_handler__' in value;
}
export function isSsrRequestHandler(
  value: unknown,
): value is ReturnType<typeof createRequestHandler> {
  return typeof value === 'function' && '__ng_request_handler__' in value;
}
