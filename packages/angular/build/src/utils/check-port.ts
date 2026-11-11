/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import assert from 'node:assert';
import { createServer } from 'node:net';
import { isTTY } from './tty';

function createInUseError(port: number): Error {
  return new Error(`Port ${port} is already in use. Use '--port' to specify a different port.`);
}

export async function checkPort(port: number, host: string): Promise<number> {
  // A port of 0 requests an OS-assigned ephemeral port. Vite now binds this correctly
  // (https://github.com/vitejs/vite/pull/23158); webpack-dev-server always has.
  if (port === 0) {
    return 0;
  }

  return new Promise<number>((resolve, reject) => {
    const server = createServer();

    server
      .once('error', (err: NodeJS.ErrnoException) => {
        if (err.code !== 'EADDRINUSE') {
          reject(err);

          return;
        }

        if (!isTTY()) {
          reject(createInUseError(port));

          return;
        }

        import('@inquirer/confirm')
          .then(({ default: confirm }) =>
            confirm({
              message: `Port ${port} is already in use.\nWould you like to use a different port?`,
              default: true,
              theme: { prefix: '' },
            }),
          )
          .then(
            (answer) => (answer ? resolve(checkPort(0, host)) : reject(createInUseError(port))),
            () => reject(createInUseError(port)),
          );
      })
      .once('listening', () => {
        // Get the actual address from the listening server instance
        const address = server.address();
        assert(
          address && typeof address !== 'string',
          'Port check server address should always be an object.',
        );

        server.close();
        resolve(address.port);
      })
      .listen(port, host);
  });
}
