/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Observable } from 'rxjs/Observable';
import { NormalizedRoot, Path, PathFragment, join } from '../path';
import {
  FileBuffer,
  Host,
  HostCapabilities,
  HostWatchEvent,
  HostWatchOptions,
  Stats,
} from './interface';

export class ScopedHost<T extends object> implements Host<T> {
  constructor(protected _delegate: Host<T>, protected _root: Path = NormalizedRoot) {}

  get capabilities(): HostCapabilities { return this._delegate.capabilities; }

  write(path: Path, content: FileBuffer): Observable<void> {
    return this._delegate.write(join(this._root, path), content);
  }
  read(path: Path): Observable<FileBuffer> {
    return this._delegate.read(join(this._root, path));
  }
  delete(path: Path): Observable<void> {
    return this._delegate.delete(join(this._root, path));
  }
  rename(from: Path, to: Path): Observable<void> {
    return this._delegate.rename(join(this._root, from), join(this._root, to));
  }

  list(path: Path): Observable<PathFragment[]> {
    return this._delegate.list(join(this._root, path));
  }

  exists(path: Path): Observable<boolean> {
    return this._delegate.exists(join(this._root, path));
  }
  isDirectory(path: Path): Observable<boolean> {
    return this._delegate.isDirectory(join(this._root, path));
  }
  isFile(path: Path): Observable<boolean> {
    return this._delegate.isFile(join(this._root, path));
  }

  // Some hosts may not support stat.
  stat(path: Path): Observable<Stats<T>> | null {
    return this._delegate.stat(join(this._root, path));
  }

  // Some hosts may not support watching.
  watch(path: Path, options?: HostWatchOptions): Observable<HostWatchEvent> | null {
    return this._delegate.watch(join(this._root, path), options);
  }
}
