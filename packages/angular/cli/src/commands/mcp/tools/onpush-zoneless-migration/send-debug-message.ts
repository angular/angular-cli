/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { ServerContext } from '@modelcontextprotocol/server';

export function sendDebugMessage(message: string, ctx: ServerContext): void {
  void ctx.mcpReq.log('debug', message);
}
