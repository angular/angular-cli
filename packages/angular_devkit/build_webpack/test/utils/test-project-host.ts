/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {
  Path,
  getSystemPath,
  normalize,
  virtualFs,
} from '@angular-devkit/core';
import { NodeJsSyncHost } from '@angular-devkit/core/node';
import { SpawnOptions, spawn } from 'child_process';
import { Stats } from 'fs';
import { Observable } from 'rxjs/Observable';
import { empty } from 'rxjs/observable/empty';
import { concatMap, map } from 'rxjs/operators';


interface ProcessOutput {
  stdout: string;
  stderr: string;
}

export class TestProjectHost extends NodeJsSyncHost {
  private _scopedSyncHost: virtualFs.SyncDelegateHost<Stats>;

  constructor(protected _root: Path) {
    super();
    this._scopedSyncHost = new virtualFs.SyncDelegateHost(new virtualFs.ScopedHost(this, _root));
  }

  scopedSync() {
    return this._scopedSyncHost;
  }

  initialize(): Observable<void> {
    return this.exists(normalize('.git')).pipe(
      concatMap(exists => !exists ? this._gitInit() : empty<void>()),
    );
  }

  restore(): Observable<void> {
    return this._gitClean();
  }

  private _gitClean(): Observable<void> {
    return this._exec('git', ['clean', '-fd']).pipe(
      concatMap(() => this._exec('git', ['checkout', '.'])),
      map(() => { }),
    );
  }

  private _gitInit(): Observable<void> {
    return this._exec('git', ['init']).pipe(
      concatMap(() => this._exec('git', ['config', 'user.email', 'angular-core+e2e@google.com'])),
      concatMap(() => this._exec('git', ['config', 'user.name', 'Angular DevKit Tests'])),
      concatMap(() => this._exec('git', ['add', '--all'])),
      concatMap(() => this._exec('git', ['commit', '-am', '"Initial commit"'])),
      map(() => { }),
    );
  }

  private _exec(cmd: string, args: string[]): Observable<ProcessOutput> {
    return new Observable(obs => {
      args = args.filter(x => x !== undefined);
      let stdout = '';
      let stderr = '';

      const spawnOptions: SpawnOptions = { cwd: getSystemPath(this._root) };

      if (process.platform.startsWith('win')) {
        args.unshift('/c', cmd);
        cmd = 'cmd.exe';
        spawnOptions['stdio'] = 'pipe';
      }

      const childProcess = spawn(cmd, args, spawnOptions);
      childProcess.stdout.on('data', (data: Buffer) => stdout += data.toString('utf-8'));
      childProcess.stderr.on('data', (data: Buffer) => stderr += data.toString('utf-8'));

      // Create the error here so the stack shows who called this function.
      const err = new Error(`Running "${cmd} ${args.join(' ')}" returned error code `);

      childProcess.on('exit', (code) => {
        if (!code) {
          obs.next({ stdout, stderr });
        } else {
          err.message += `${code}.\n\nSTDOUT:\n${stdout}\n\nSTDERR:\n${stderr}\n`;
          obs.error(err);
        }
        obs.complete();
      });
    });
  }

  writeMultipleFiles(files: { [path: string]: string }): void {
    Object.keys(files).map(fileName =>
      this.scopedSync().write(
        normalize(fileName),
        virtualFs.stringToFileBuffer(files[fileName]),
      ),
    );
  }

  replaceInFile(path: string, match: RegExp | string, replacement: string) {
    const content = virtualFs.fileBufferToString(this.scopedSync().read(normalize(path)));
    this.scopedSync().write(normalize(path),
      virtualFs.stringToFileBuffer(content.replace(match, replacement)));
  }

  appendToFile(path: string, str: string) {
    const content = virtualFs.fileBufferToString(this.scopedSync().read(normalize(path)));
    this.scopedSync().write(normalize(path),
      virtualFs.stringToFileBuffer(content.concat(str)));
  }

  fileMatchExists(dir: string, regex: RegExp) {
    const [fileName] = this.scopedSync().list(normalize(dir)).filter(name => name.match(regex));

    return fileName || undefined;
  }

  copyFile(from: string, to: string) {
    const content = this.scopedSync().read(normalize(from));
    this.scopedSync().write(normalize(to), content);
  }
}
