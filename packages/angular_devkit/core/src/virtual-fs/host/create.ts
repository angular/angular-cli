/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Observable } from 'rxjs';
import { Path, PathFragment } from '../path';
import { FileBuffer, FileBufferLike, Host, HostCapabilities, Stats } from './interface';

export interface SyncHostHandler<StatsT extends object = {}> {
  read(path: Path): FileBuffer;
  list(path: Path): PathFragment[];

  exists(path: Path): boolean;
  isDirectory(path: Path): boolean;
  isFile(path: Path): boolean;

  stat(path: Path): Stats<StatsT> | null;

  write(path: Path, content: FileBufferLike): void;
  delete(path: Path): void;
  rename(from: Path, to: Path): void;
}

function wrapAction<T>(action: () => T): Observable<T> {
  return new Observable((subscriber) => {
    subscriber.next(action());
    subscriber.complete();
  });
}

export function createSyncHost<StatsT extends object = {}>(
  handler: SyncHostHandler<StatsT>,
): Host<StatsT> {
  return new (class {
    get capabilities(): HostCapabilities {
      return { synchronous: true };
    }

    read(path: Path): Observable<FileBuffer> {
      return wrapAction(() => handler.read(path));
    }

    list(path: Path): Observable<PathFragment[]> {
      return wrapAction(() => handler.list(path));
    }

    exists(path: Path): Observable<boolean> {
      return wrapAction(() => handler.exists(path));
    }

    isDirectory(path: Path): Observable<boolean> {
      return wrapAction(() => handler.isDirectory(path));
    }

    isFile(path: Path): Observable<boolean> {
      return wrapAction(() => handler.isFile(path));
    }

    stat(path: Path): Observable<Stats<StatsT> | null> {
      return wrapAction(() => handler.stat(path));
    }

    write(path: Path, content: FileBufferLike): Observable<void> {
      return wrapAction(() => handler.write(path, content));
    }

    delete(path: Path): Observable<void> {
      return wrapAction(() => handler.delete(path));
    }

    rename(from: Path, to: Path): Observable<void> {
      return wrapAction(() => handler.rename(from, to));
    }

    watch(): null {
      return null;
    }
  })();
}
