/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { prompt } from 'inquirer';
import * as net from 'net';
import { isTTY } from './tty';

function createInUseError(port: number): Error {
  return new Error(`Port ${port} is already in use. Use '--port' to specify a different port.`);
}

export async function checkPort(port: number, host: string): Promise<number> {
  if (port === 0) {
    return 0;
  }

  return new Promise<number>((resolve, reject) => {
    const server = net.createServer();

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

        prompt({
          type: 'confirm',
          name: 'useDifferent',
          message: `Port ${port} is already in use.\nWould you like to use a different port?`,
          default: true,
        }).then(
          (answers) => answers.useDifferent ? resolve(0) : reject(createInUseError(port)),
          () => reject(createInUseError(port)),
        );
      })
      .once('listening', () => {
        server.close();
        resolve(port);
      })
      .listen(port, host);
  });
}
