/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import assert from 'node:assert';
import { AddressInfo, createServer } from 'node:net';
import { loadEsmModule } from './load-esm';
import { isTTY } from './tty';

function createInUseError(port: number): Error {
  return new Error(`Port ${port} is already in use. Use '--port' to specify a different port.`);
}

export async function checkPort(port: number, host: string): Promise<number> {
  // Disabled due to Vite not handling port 0 and instead always using the default value (5173)
  // TODO: Enable this again once Vite is fixed
  // if (port === 0) {
  //   return 0;
  // }

  return new Promise<number>((resolve, reject) => {
    const server = createServer();

    server
      .once('error', (err: NodeJS.ErrnoException) => {
        if (err.code !== 'EADDRINUSE') {
          reject(err);

          return;
        }

        if (!isTTY) {
          reject(createInUseError(port));

          return;
        }

        loadEsmModule<typeof import('inquirer')>('inquirer')
          .then(({ default: { prompt } }) =>
            prompt({
              type: 'confirm',
              name: 'useDifferent',
              message: `Port ${port} is already in use.\nWould you like to use a different port?`,
              default: true,
            }),
          )
          .then(
            (answers) =>
              answers.useDifferent ? resolve(checkPort(0, host)) : reject(createInUseError(port)),
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
