/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Observable } from 'rxjs';
import { BaseException } from '../../exception';
import { Path, PathFragment } from '../path';
import {
  FileBuffer,
  FileBufferLike,
  Host,
  HostCapabilities,
  HostWatchEvent,
  HostWatchOptions,
  Stats,
} from './interface';


export class SynchronousDelegateExpectedException extends BaseException {
  constructor() { super(`Expected a synchronous delegate but got an asynchronous one.`); }
}

/**
 * Implement a synchronous-only host interface (remove the Observable parts).
 */
export class SyncDelegateHost<T extends object = {}> {
  constructor(protected _delegate: Host<T>) {
    if (!_delegate.capabilities.synchronous) {
      throw new SynchronousDelegateExpectedException();
    }
  }

  protected _doSyncCall<ResultT>(observable: Observable<ResultT>): ResultT {
    let completed = false;
    let result: ResultT | undefined = undefined;
    let errorResult: Error | undefined = undefined;
    observable.subscribe({
      next(x: ResultT) { result = x; },
      error(err: Error) { errorResult = err; },
      complete() { completed = true; },
    });

    if (errorResult !== undefined) {
      throw errorResult;
    }
    if (!completed) {
      throw new SynchronousDelegateExpectedException();
    }

    // The non-null operation is to work around `void` type. We don't allow to return undefined
    // but ResultT could be void, which is undefined in JavaScript, so this doesn't change the
    // behaviour.
    // tslint:disable-next-line:no-non-null-assertion
    return result !;
  }

  get capabilities(): HostCapabilities {
    return this._delegate.capabilities;
  }
  get delegate() {
    return this._delegate;
  }

  write(path: Path, content: FileBufferLike): void {
    return this._doSyncCall(this._delegate.write(path, content));
  }
  read(path: Path): FileBuffer {
    return this._doSyncCall(this._delegate.read(path));
  }
  delete(path: Path): void {
    return this._doSyncCall(this._delegate.delete(path));
  }
  rename(from: Path, to: Path): void {
    return this._doSyncCall(this._delegate.rename(from, to));
  }

  list(path: Path): PathFragment[] {
    return this._doSyncCall(this._delegate.list(path));
  }

  exists(path: Path): boolean {
    return this._doSyncCall(this._delegate.exists(path));
  }
  isDirectory(path: Path): boolean {
    return this._doSyncCall(this._delegate.isDirectory(path));
  }
  isFile(path: Path): boolean {
    return this._doSyncCall(this._delegate.isFile(path));
  }

  // Some hosts may not support stat.
  stat(path: Path): Stats<T> | null {
    const result: Observable<Stats<T> | null> | null = this._delegate.stat(path);

    if (result) {
      return this._doSyncCall(result);
    } else {
      return null;
    }
  }

  watch(path: Path, options?: HostWatchOptions): Observable<HostWatchEvent> | null {
    return this._delegate.watch(path, options);
  }
}
