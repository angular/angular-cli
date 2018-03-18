/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {
  Path,
  PathFragment,
  getSystemPath,
  normalize,
  resolve,
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
  private _syncHost: virtualFs.SyncDelegateHost<Stats>;

  constructor(protected _root: Path) {
    super();
    this._syncHost = new virtualFs.SyncDelegateHost(this);
  }

  // When a path is relative, resolve it relative to root, otherwise use it as absolute.
  write(path: Path, content: virtualFs.FileBuffer): Observable<void> {
    return super.write(resolve(this._root, path), content);
  }
  read(path: Path): Observable<virtualFs.FileBuffer> {
    return super.read(resolve(this._root, path));
  }
  delete(path: Path): Observable<void> {
    return super.delete(resolve(this._root, path));
  }
  rename(from: Path, to: Path): Observable<void> {
    return super.rename(resolve(this._root, from), resolve(this._root, to));
  }

  list(path: Path): Observable<PathFragment[]> {
    return super.list(resolve(this._root, path));
  }

  exists(path: Path): Observable<boolean> {
    return super.exists(resolve(this._root, path));
  }
  isDirectory(path: Path): Observable<boolean> {
    return super.isDirectory(resolve(this._root, path));
  }
  isFile(path: Path): Observable<boolean> {
    return super.isFile(resolve(this._root, path));
  }

  // Some hosts may not support stat.
  stat(path: Path): Observable<virtualFs.Stats<Stats>> {
    return super.stat(resolve(this._root, path));
  }

  // Some hosts may not support watching.
  watch(
    path: Path, options?: virtualFs.HostWatchOptions,
  ): Observable<virtualFs.HostWatchEvent> | null {
    return super.watch(resolve(this._root, path), options);
  }

  asSync() {
    return this._syncHost;
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
      this.asSync().write(normalize(fileName), virtualFs.stringToFileBuffer(files[fileName])),
    );
  }

  replaceInFile(path: string, match: RegExp | string, replacement: string) {
    const content = virtualFs.fileBufferToString(this.asSync().read(normalize(path)));
    this.asSync().write(normalize(path),
      virtualFs.stringToFileBuffer(content.replace(match, replacement)));
  }

  appendToFile(path: string, str: string) {
    const content = virtualFs.fileBufferToString(this.asSync().read(normalize(path)));
    this.asSync().write(normalize(path),
      virtualFs.stringToFileBuffer(content.concat(str)));
  }

  fileMatchExists(dir: string, regex: RegExp) {
    const [fileName] = this.asSync().list(normalize(dir)).filter(name => name.match(regex));

    return fileName || undefined;
  }

  copyFile(from: string, to: string) {
    const content = this.asSync().read(normalize(from));
    this.asSync().write(normalize(to), content);
  }
}
