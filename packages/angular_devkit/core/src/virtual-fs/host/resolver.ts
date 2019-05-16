/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Observable } from 'rxjs';
import { Path, PathFragment } from '../path';
import {
  FileBuffer,
  Host,
  HostCapabilities,
  HostWatchEvent,
  HostWatchOptions,
  Stats,
} from './interface';

/**
 * A Host that runs a method before calling its delegate. This is an abstract class and its actual
 * behaviour is entirely dependant of the subclass.
 */
export abstract class ResolverHost<T extends object> implements Host<T> {
  protected abstract _resolve(path: Path): Path;

  constructor(protected _delegate: Host<T>) {}

  get capabilities(): HostCapabilities { return this._delegate.capabilities; }

  write(path: Path, content: FileBuffer): Observable<void> {
    return this._delegate.write(this._resolve(path), content);
  }
  read(path: Path): Observable<FileBuffer> {
    return this._delegate.read(this._resolve(path));
  }
  delete(path: Path): Observable<void> {
    return this._delegate.delete(this._resolve(path));
  }
  rename(from: Path, to: Path): Observable<void> {
    return this._delegate.rename(this._resolve(from), this._resolve(to));
  }

  list(path: Path): Observable<PathFragment[]> {
    return this._delegate.list(this._resolve(path));
  }

  exists(path: Path): Observable<boolean> {
    return this._delegate.exists(this._resolve(path));
  }
  isDirectory(path: Path): Observable<boolean> {
    return this._delegate.isDirectory(this._resolve(path));
  }
  isFile(path: Path): Observable<boolean> {
    return this._delegate.isFile(this._resolve(path));
  }

  // Some hosts may not support stat.
  stat(path: Path): Observable<Stats<T> | null> | null {
    return this._delegate.stat(this._resolve(path));
  }

  // Some hosts may not support watching.
  watch(path: Path, options?: HostWatchOptions): Observable<HostWatchEvent> | null {
    return this._delegate.watch(this._resolve(path), options);
  }
}
