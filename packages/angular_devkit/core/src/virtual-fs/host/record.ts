/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {
  EMPTY,
  Observable,
  concat,
  from as observableFrom,
  of,
  throwError,
} from 'rxjs';
import { concatMap, map, reduce, switchMap, toArray } from 'rxjs/operators';
import {
  FileAlreadyExistException,
  FileDoesNotExistException,
  PathIsDirectoryException,
  UnknownException,
} from '../../exception';
import { Path, PathFragment } from '../path';
import {
  FileBuffer,
  Host,
  HostCapabilities,
  HostWatchOptions,
  ReadonlyHost,
  Stats,
} from './interface';
import { SimpleMemoryHost } from './memory';


export interface CordHostCreate {
  kind: 'create';
  path: Path;
  content: FileBuffer;
}
export interface CordHostOverwrite {
  kind: 'overwrite';
  path: Path;
  content: FileBuffer;
}
export interface CordHostRename {
  kind: 'rename';
  from: Path;
  to: Path;
}
export interface CordHostDelete {
  kind: 'delete';
  path: Path;
}
export type CordHostRecord = CordHostCreate
                           | CordHostOverwrite
                           | CordHostRename
                           | CordHostDelete;


/**
 * A Host that records changes to the underlying Host, while keeping a record of Create, Overwrite,
 * Rename and Delete of files.
 *
 * This is fully compatible with Host, but will keep a staging of every changes asked. That staging
 * follows the principle of the Tree (e.g. can create a file that already exists).
 *
 * Using `create()` and `overwrite()` will force those operations, but using `write` will add
 * the create/overwrite records IIF the files does/doesn't already exist.
 */
export class CordHost extends SimpleMemoryHost {
  protected _filesToCreate = new Set<Path>();
  protected _filesToRename = new Map<Path, Path>();
  protected _filesToRenameRevert = new Map<Path, Path>();
  protected _filesToDelete = new Set<Path>();
  protected _filesToOverwrite = new Set<Path>();

  constructor(protected _back: ReadonlyHost) { super(); }

  get backend(): ReadonlyHost { return this._back; }
  get capabilities(): HostCapabilities {
    // Our own host is always Synchronous, but the backend might not be.
    return {
      synchronous: this._back.capabilities.synchronous,
    };
  }

  /**
   * Create a copy of this host, including all actions made.
   * @returns {CordHost} The carbon copy.
   */
  clone(): CordHost {
    const dolly = new CordHost(this._back);

    dolly._cache = new Map(this._cache);
    dolly._filesToCreate = new Set(this._filesToCreate);
    dolly._filesToRename = new Map(this._filesToRename);
    dolly._filesToRenameRevert = new Map(this._filesToRenameRevert);
    dolly._filesToDelete = new Set(this._filesToDelete);
    dolly._filesToOverwrite = new Set(this._filesToOverwrite);

    return dolly;
  }

  /**
   * Commit the changes recorded to a Host. It is assumed that the host does have the same structure
   * as the host that was used for backend (could be the same host).
   * @param host The host to create/delete/rename/overwrite files to.
   * @param force Whether to skip existence checks when creating/overwriting. This is
   *   faster but might lead to incorrect states. Because Hosts natively don't support creation
   *   versus overwriting (it's only writing), we check for existence before completing a request.
   * @returns An observable that completes when done, or error if an error occured.
   */
  commit(host: Host, force = false): Observable<void> {
    // Really commit everything to the actual host.
    return observableFrom(this.records()).pipe(
      concatMap(record => {
        switch (record.kind) {
          case 'delete': return host.delete(record.path);
          case 'rename': return host.rename(record.from, record.to);
          case 'create':
            return host.exists(record.path).pipe(
              switchMap(exists => {
                if (exists && !force) {
                  return throwError(new FileAlreadyExistException(record.path));
                } else {
                  return host.write(record.path, record.content);
                }
              }),
            );
          case 'overwrite':
            return host.exists(record.path).pipe(
              switchMap(exists => {
                if (!exists && !force) {
                  return throwError(new FileDoesNotExistException(record.path));
                } else {
                  return host.write(record.path, record.content);
                }
              }),
            );
        }
      }),
      reduce(() => {}),
    );
  }

  records(): CordHostRecord[] {
    return [
      ...[...this._filesToDelete.values()].map(path => ({
        kind: 'delete', path,
      }) as CordHostRecord),
      ...[...this._filesToRename.entries()].map(([from, to]) => ({
        kind: 'rename', from, to,
      }) as CordHostRecord),
      ...[...this._filesToCreate.values()].map(path => ({
        kind: 'create', path, content: this._read(path),
      }) as CordHostRecord),
      ...[...this._filesToOverwrite.values()].map(path => ({
        kind: 'overwrite', path, content: this._read(path),
      }) as CordHostRecord),
    ];
  }

  /**
   * Specialized version of {@link CordHost#write} which forces the creation of a file whether it
   * exists or not.
   * @param {} path
   * @param {FileBuffer} content
   * @returns {Observable<void>}
   */
  create(path: Path, content: FileBuffer): Observable<void> {
    if (super._exists(path)) {
      throw new FileAlreadyExistException(path);
    }

    if (this._filesToDelete.has(path)) {
      this._filesToDelete.delete(path);
      this._filesToOverwrite.add(path);
    } else {
      this._filesToCreate.add(path);
    }

    return super.write(path, content);
  }

  overwrite(path: Path, content: FileBuffer): Observable<void> {
    return this.isDirectory(path).pipe(
      switchMap(isDir => {
        if (isDir) {
          return throwError(new PathIsDirectoryException(path));
        }

        return this.exists(path);
      }),
      switchMap(exists => {
        if (!exists) {
          return throwError(new FileDoesNotExistException(path));
        }

        if (!this._filesToCreate.has(path)) {
          this._filesToOverwrite.add(path);
        }

        return super.write(path, content);
      }),
    );
  }

  write(path: Path, content: FileBuffer): Observable<void> {
    return this.exists(path).pipe(
      switchMap(exists => {
        if (exists) {
          // It exists, but might be being renamed or deleted. In that case we want to create it.
          if (this.willRename(path) || this.willDelete(path)) {
            return this.create(path, content);
          } else {
            return this.overwrite(path, content);
          }
        } else {
          return this.create(path, content);
        }
      }),
    );
  }

  read(path: Path): Observable<FileBuffer> {
    if (this._exists(path)) {
      return super.read(path);
    }

    return this._back.read(path);
  }

  delete(path: Path): Observable<void> {
    if (this._exists(path)) {
      if (this._filesToCreate.has(path)) {
        this._filesToCreate.delete(path);
      } else if (this._filesToOverwrite.has(path)) {
        this._filesToOverwrite.delete(path);
        this._filesToDelete.add(path);
      } else {
        const maybeOrigin = this._filesToRenameRevert.get(path);
        if (maybeOrigin) {
          this._filesToRenameRevert.delete(path);
          this._filesToRename.delete(maybeOrigin);
          this._filesToDelete.add(maybeOrigin);
        } else {
          return throwError(
            new UnknownException(`This should never happen. Path: ${JSON.stringify(path)}.`),
          );
        }
      }

      return super.delete(path);
    } else {
      return this._back.exists(path).pipe(
        switchMap(exists => {
          if (exists) {
            this._filesToDelete.add(path);

            return of<void>();
          } else {
            return throwError(new FileDoesNotExistException(path));
          }
        }),
      );
    }
  }

  rename(from: Path, to: Path): Observable<void> {
    return concat(
      this.exists(to),
      this.exists(from),
    ).pipe(
      toArray(),
      switchMap(([existTo, existFrom]) => {
        if (!existFrom) {
          return throwError(new FileDoesNotExistException(from));
        }
        if (from === to) {
          return EMPTY;
        }

        if (existTo) {
          return throwError(new FileAlreadyExistException(to));
        }

        // If we're renaming a file that's been created, shortcircuit to creating the `to` path.
        if (this._filesToCreate.has(from)) {
          this._filesToCreate.delete(from);
          this._filesToCreate.add(to);

          return super.rename(from, to);
        }
        if (this._filesToOverwrite.has(from)) {
          this._filesToOverwrite.delete(from);

          // Recursively call this function. This is so we don't repeat the bottom logic. This
          // if will be by-passed because we just deleted the `from` path from files to overwrite.
          return concat(
            this.rename(from, to),
            new Observable<never>(x => {
              this._filesToOverwrite.add(to);
              x.complete();
            }),
          );
        }
        if (this._filesToDelete.has(to)) {
          this._filesToDelete.delete(to);
          this._filesToDelete.add(from);
          this._filesToOverwrite.add(to);

          // We need to delete the original and write the new one.
          return this.read(from).pipe(
            map(content => this._write(to, content)),
          );
        }

        const maybeTo1 = this._filesToRenameRevert.get(from);
        if (maybeTo1) {
          // We already renamed to this file (A => from), let's rename the former to the new
          // path (A => to).
          this._filesToRename.delete(maybeTo1);
          this._filesToRenameRevert.delete(from);
          from = maybeTo1;
        }

        this._filesToRename.set(from, to);
        this._filesToRenameRevert.set(to, from);

        // If the file is part of our data, just rename it internally.
        if (this._exists(from)) {
          return super.rename(from, to);
        } else {
          // Create a file with the same content.
          return this._back.read(from).pipe(
            switchMap(content => super.write(to, content)),
          );
        }
      }),
    );
  }

  list(path: Path): Observable<PathFragment[]> {
    return concat(
      super.list(path),
      this._back.list(path),
    ).pipe(
      reduce((list: Set<PathFragment>, curr: PathFragment[]) => {
        curr.forEach(elem => list.add(elem));

        return list;
      }, new Set<PathFragment>()),
      map(set => [...set]),
    );
  }

  exists(path: Path): Observable<boolean> {
    return this._exists(path)
      ? of(true)
      : ((this.willDelete(path) || this.willRename(path)) ? of(false) : this._back.exists(path));
  }
  isDirectory(path: Path): Observable<boolean> {
    return this._exists(path) ? super.isDirectory(path) : this._back.isDirectory(path);
  }
  isFile(path: Path): Observable<boolean> {
    return this._exists(path)
      ? super.isFile(path)
      : ((this.willDelete(path) || this.willRename(path)) ? of(false) : this._back.isFile(path));
  }

  stat(path: Path): Observable<Stats | null> | null {
    return this._exists(path)
      ? super.stat(path)
      : ((this.willDelete(path) || this.willRename(path)) ? of(null) : this._back.stat(path));
  }

  watch(path: Path, options?: HostWatchOptions) {
    // Watching not supported.
    return null;
  }

  willCreate(path: Path) {
    return this._filesToCreate.has(path);
  }
  willOverwrite(path: Path) {
    return this._filesToOverwrite.has(path);
  }
  willDelete(path: Path) {
    return this._filesToDelete.has(path);
  }
  willRename(path: Path) {
    return this._filesToRename.has(path);
  }
  willRenameTo(path: Path, to: Path) {
    return this._filesToRename.get(path) === to;
  }
}
