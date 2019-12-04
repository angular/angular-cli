/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { spawn, SpawnOptions } from 'child_process';
import { Observable } from 'rxjs';
import * as treeKill from 'tree-kill';
import { createServer, AddressInfo } from 'net';

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
    if (!proc) {
      obs.error(new Error(`${command} cannot be spawned.`));
      return;
    }

    if (proc.stdout) {
      proc.stdout.on('data', data => obs.next({ stdout: data.toString() }));
    }

    if (proc.stderr) {
      proc.stderr.on('data', data => obs.next({ stderr: data.toString() }));
    }

    proc
      .on('error', err => obs.error(err))
      .on('close', () => obs.complete());

    return () => {
      if (!proc.killed) {
        treeKill(proc.pid, 'SIGTERM');
      }
    };
  });
}
