/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { spawn, SpawnOptions } from 'child_process';
import { Observable, throwError, timer } from 'rxjs';
import * as treeKill from 'tree-kill';
import { createServer, AddressInfo, createConnection } from 'net';
import { retryWhen, mergeMap } from 'rxjs/operators';

export function getAvailablePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server
      .unref()
      .on('error', reject)
      .listen(0, () => {
        const { port } = server.address() as AddressInfo;
        server.close(() => resolve(port));
      });
  });
}

export function spawnAsObservable(
  command: string,
  args: string[] = [],
  options: SpawnOptions = {}
): Observable<{ stdout?: string, stderr?: string }> {
  return new Observable(obs => {
    const proc = spawn(command, args, options);
    if (proc.stdout) {
      proc.stdout.on('data', data => obs.next({ stdout: data.toString() }));
    }

    if (proc.stderr) {
      proc.stderr.on('data', data => obs.next({ stderr: data.toString() }));
    }

    proc
      .on('error', err => obs.error(err))
      .on('close', code => {
        if (code !== 0) {
          obs.error(new Error(`${command} exited with ${code} code.`));
        }

        obs.complete();
      });

    return () => {
      if (!proc.killed) {
        treeKill(proc.pid, 'SIGTERM');
      }
    };
  });
}

export function waitUntilServerIsListening(
  port: number,
  host?: string,
): Observable<undefined> {
  const allowedErrorCodes = [
    'ECONNREFUSED',
    'ECONNRESET',
  ];

  return new Observable<undefined>(obs => {
    const client = createConnection({ host, port }, () => {
      obs.next(undefined);
      obs.complete();
    })
    .on('error', err => obs.error(err));

    return () => {
      if (!client.destroyed) {
        client.destroy();
      }
    };
  })
  .pipe(
    retryWhen(err => err.pipe(
      mergeMap((error, attempts) => {
        return attempts > 10 || !allowedErrorCodes.includes(error.code)
          ? throwError(error)
          : timer(100 * (attempts * 1));
      }),
    ))
  );
}
