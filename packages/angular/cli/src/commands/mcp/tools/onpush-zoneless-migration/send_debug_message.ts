/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol';
import { ServerNotification, ServerRequest } from '@modelcontextprotocol/sdk/types';

export function sendDebugMessage(
  message: string,
  { sendNotification }: RequestHandlerExtra<ServerRequest, ServerNotification>,
): void {
  void sendNotification({
    method: 'notifications/message',
    params: {
      level: 'debug',
      data: message,
    },
  });
}
