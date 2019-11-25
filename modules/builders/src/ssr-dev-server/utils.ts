/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { exec, ExecOptions } from 'child_process';
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

export function execAsObservable(command: string, options: ExecOptions):
  Observable<{ stdout: string, stderr: string }> {
  return new Observable(obs => {
    const proc = exec(command, options, (err, stdout, stderr) => {
      if (err) {
        obs.error(err);
        return;
      }

      obs.next({ stdout, stderr });
      obs.complete();
    });

    return () => {
      if (!proc.killed) {
        treeKill(proc.pid, 'SIGTERM');
      }
    };
  });
}
