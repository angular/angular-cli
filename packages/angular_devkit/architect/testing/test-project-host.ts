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
  basename,
  dirname,
  join,
  normalize,
  relative,
  virtualFs,
} from '@angular-devkit/core';
import { NodeJsSyncHost } from '@angular-devkit/core/node';
import { Stats } from 'fs';
import { EMPTY, Observable, from, of } from 'rxjs';
import { concatMap, delay, finalize, map, mergeMap, retry, tap } from 'rxjs/operators';


/**
 * @deprecated
 */
export class TestProjectHost extends NodeJsSyncHost {
  private _currentRoot: Path | null = null;
  private _scopedSyncHost: virtualFs.SyncDelegateHost<Stats> | null = null;

  constructor(protected _templateRoot: Path) {
    super();
  }

  root(): Path {
    if (this._currentRoot === null) {
      throw new Error('TestProjectHost must be initialized before being used.');
    }

    return this._currentRoot;
  }

  scopedSync(): virtualFs.SyncDelegateHost<Stats> {
    if (this._currentRoot === null || this._scopedSyncHost === null) {
      throw new Error('TestProjectHost must be initialized before being used.');
    }

    return this._scopedSyncHost;
  }

  initialize(): Observable<void> {
    const recursiveList = (path: Path): Observable<Path> => this.list(path).pipe(
      // Emit each fragment individually.
      concatMap(fragments => from(fragments)),
      // Join the path with fragment.
      map(fragment => join(path, fragment)),
      // Emit directory content paths instead of the directory path.
      mergeMap(path => this.isDirectory(path).pipe(
        concatMap(isDir => isDir ? recursiveList(path) : of(path)),
      )),
    );

    // Find a unique folder that we can write to to use as current root.
    return this.findUniqueFolderPath().pipe(
      // Save the path and create a scoped host for it.
      tap(newFolderPath => {
        this._currentRoot = newFolderPath;
        this._scopedSyncHost = new virtualFs.SyncDelegateHost(
          new virtualFs.ScopedHost(this, this.root()));
      }),
      // List all files in root.
      concatMap(() => recursiveList(this._templateRoot)),
      // Copy them over to the current root.
      concatMap(from => {
        const to = join(this.root(), relative(this._templateRoot, from));

        return this.read(from).pipe(
          concatMap(buffer => this.write(to, buffer)),
        );
      }),
      map(() => { }),
    );
  }

  restore(): Observable<void> {
    if (this._currentRoot === null) {
      return EMPTY;
    }

    // Delete the current root and clear the variables.
    // Wait 50ms and retry up to 10 times, to give time for file locks to clear.
    return this.exists(this.root()).pipe(
      delay(50),
      concatMap(exists => exists ? this.delete(this.root()) : EMPTY),
      retry(10),
      finalize(() => {
        this._currentRoot = null;
        this._scopedSyncHost = null;
      }),
    );
  }

  writeMultipleFiles(files: { [path: string]: string | ArrayBufferLike | Buffer }): void {
    Object.keys(files).forEach(fileName => {
      let content = files[fileName];
      if (typeof content == 'string') {
        content = virtualFs.stringToFileBuffer(content);
      } else if (content instanceof Buffer) {
        content = content.buffer.slice(
          content.byteOffset,
          content.byteOffset + content.byteLength,
        );
      }

      this.scopedSync().write(
        normalize(fileName),
        content,
      );
    });
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

  fileMatchExists(dir: string, regex: RegExp): PathFragment | undefined {
    const [fileName] = this.scopedSync().list(normalize(dir)).filter(name => name.match(regex));

    return fileName || undefined;
  }

  copyFile(from: string, to: string) {
    const content = this.scopedSync().read(normalize(from));
    this.scopedSync().write(normalize(to), content);
  }

  private findUniqueFolderPath(): Observable<Path> {
    // 11 character alphanumeric string.
    const randomString = Math.random().toString(36).slice(2);
    const newFolderName = `test-project-host-${basename(this._templateRoot)}-${randomString}`;
    const newFolderPath = join(dirname(this._templateRoot), newFolderName);

    return this.exists(newFolderPath).pipe(
      concatMap(exists => exists ? this.findUniqueFolderPath() : of(newFolderPath)),
    );
  }
}
