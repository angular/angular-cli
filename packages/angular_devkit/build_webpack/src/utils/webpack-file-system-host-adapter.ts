/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { FileDoesNotExistException, JsonObject, normalize, virtualFs } from '@angular-devkit/core';
import { Callback, InputFileSystem } from '@ngtools/webpack/src/webpack';
import { Stats } from 'fs';
import { Observable } from 'rxjs/Observable';
import { of } from 'rxjs/observable/of';
import { map, mergeMap, switchMap } from 'rxjs/operators';


export class WebpackFileSystemHostAdapter implements InputFileSystem {
  protected _syncHost: virtualFs.SyncDelegateHost<Stats> | null = null;

  constructor(protected _host: virtualFs.Host<Stats>) {}

  private _doHostCall<T>(o: Observable<T>, callback: Callback<T>) {
    const token = Symbol();
    let value: T | typeof token = token;
    let error = false;

    try {
      o.subscribe({
        error(err) {
          error = true;
          callback(err);
        },
        next(v) {
          value = v;
        },
        complete() {
          if (value !== token) {
            callback(null, value);
          } else {
            callback(new Error('Unknown error happened.'));
          }
        },
      });
    } catch (err) {
      // In some occasions, the error handler above will be called, then an exception will be
      // thrown (by design in observable constructors in RxJS 5). Don't call the callback
      // twice.
      if (!error) {
        callback(err);
      }
    }
  }

  stat(path: string, callback: Callback<Stats>): void {
    const p = normalize('/' + path);
    const result = this._host.stat(p);

    if (result === null) {
      const o = this._host.exists(p).pipe(
        switchMap(exists => {
          if (!exists) {
            throw new FileDoesNotExistException(p);
          }

          return this._host.isDirectory(p).pipe(
            mergeMap(isDirectory => {
              return (isDirectory ? of(0) : this._host.read(p).pipe(
                map(content => content.byteLength),
              )).pipe(
                map(size => [isDirectory, size]),
              );
            }),
          );
        }),
        map(([isDirectory, size]) => {
          return {
            isFile() { return !isDirectory; },
            isDirectory() { return isDirectory; },
            size,
            atime: new Date(),
            mtime: new Date(),
            ctime: new Date(),
            birthtime: new Date(),
          };
        }),
      );

      this._doHostCall(o, callback);
    } else {
      this._doHostCall(result, callback);
    }
  }

  readdir(path: string, callback: Callback<string[]>): void {
    return this._doHostCall(this._host.list(normalize('/' + path)), callback);
  }

  readFile(path: string, callback: Callback<string>): void {
    const o = this._host.read(normalize('/' + path)).pipe(
      map(content => virtualFs.fileBufferToString(content)),
    );

    return this._doHostCall(o, callback);
  }

  readJson(path: string, callback: Callback<JsonObject>): void {
    const o = this._host.read(normalize('/' + path)).pipe(
      map(content => JSON.parse(virtualFs.fileBufferToString(content))),
    );

    return this._doHostCall(o, callback);
  }

  readlink(path: string, callback: Callback<string>): void {
    const err: NodeJS.ErrnoException = new Error('Not a symlink.');
    err.code = 'EINVAL';
    callback(err);
  }

  statSync(path: string): Stats {
    if (!this._syncHost) {
      this._syncHost = new virtualFs.SyncDelegateHost(this._host);
    }

    const result = this._syncHost.stat(normalize('/' + path));
    if (result) {
      return result;
    } else {
      return {} as Stats;
    }
  }
  readdirSync(path: string): string[] {
    if (!this._syncHost) {
      this._syncHost = new virtualFs.SyncDelegateHost(this._host);
    }

    return this._syncHost.list(normalize('/' + path));
  }
  readFileSync(path: string): string {
    if (!this._syncHost) {
      this._syncHost = new virtualFs.SyncDelegateHost(this._host);
    }

    return virtualFs.fileBufferToString(this._syncHost.read(normalize('/' + path)));
  }
  readJsonSync(path: string): string {
    return JSON.parse(this.readFileSync(path));
  }
  readlinkSync(path: string): string {
    const err: NodeJS.ErrnoException = new Error('Not a symlink.');
    err.code = 'EINVAL';
    throw err;
  }

  purge(_changes?: string[] | string): void {}
}
