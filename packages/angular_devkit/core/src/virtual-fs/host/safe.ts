/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Path, PathFragment } from '../path';
import { FileBuffer, HostCapabilities, ReadonlyHost, Stats } from './interface';

/**
 * A Host that filters out errors. The only exception is `read()` which will still error out if
 * the delegate returned an error (e.g. NodeJS will error out if the file doesn't exist).
 */
export class SafeReadonlyHost<StatsT extends object = {}> implements ReadonlyHost<StatsT> {
  constructor(private _delegate: ReadonlyHost<StatsT>) {}

  get capabilities(): HostCapabilities {
    return this._delegate.capabilities;
  }

  read(path: Path): Observable<FileBuffer> {
    return this._delegate.read(path);
  }

  list(path: Path): Observable<PathFragment[]> {
    return this._delegate.list(path).pipe(
      catchError(() => of([])),
    );
  }

  exists(path: Path): Observable<boolean> {
    return this._delegate.exists(path);
  }
  isDirectory(path: Path): Observable<boolean> {
    return this._delegate.isDirectory(path).pipe(
      catchError(() => of(false)),
    );
  }
  isFile(path: Path): Observable<boolean> {
    return this._delegate.isFile(path).pipe(
      catchError(() => of(false)),
    );
  }

  // Some hosts may not support stats.
  stat(path: Path): Observable<Stats<StatsT> | null> | null {
    const maybeStat = this._delegate.stat(path);

    return maybeStat && maybeStat.pipe(
      catchError(() => of(null)),
    );
  }
}
