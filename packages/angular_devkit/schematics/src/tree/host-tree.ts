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
  PathIsDirectoryException,
  PathIsFileException,
  clean,
  dirname,
  join,
  normalize,
  virtualFs,
} from '@angular-devkit/core';
import { ReadonlyHost } from '../../../core/src/virtual-fs/host';
import { CordHostRecord } from '../../../core/src/virtual-fs/host/record';
import {
  ContentHasMutatedException,
  FileAlreadyExistException,
  FileDoesNotExistException,
  InvalidUpdateRecordException,
  MergeConflictException,
  SchematicsException,
} from '../exception/exception';
import {
  Action,
  CreateFileAction,
  DeleteFileAction,
  OverwriteFileAction,
  RenameFileAction,
} from './action';
import { LazyFileEntry } from './entry';
import {
  DirEntry,
  FileEntry,
  FileVisitor,
  FileVisitorCancelToken,
  MergeStrategy,
  Tree, TreeSymbol,
  UpdateRecorder,
} from './interface';
import { UpdateRecorderBase } from './recorder';


let _uniqueId = 0;


export class HostDirEntry implements DirEntry {
  constructor(
    readonly parent: DirEntry | null,
    readonly path: Path,
    protected _host: virtualFs.SyncDelegateHost,
    protected _tree: Tree,
  ) {}

  get subdirs(): PathFragment[] {
    return this._host.list(this.path)
      .filter(fragment => this._host.isDirectory(join(this.path, fragment)));
  }
  get subfiles(): PathFragment[] {
    return this._host.list(this.path)
      .filter(fragment => this._host.isFile(join(this.path, fragment)));
  }

  dir(name: PathFragment): DirEntry {
    return this._tree.getDir(join(this.path, name));
  }
  file(name: PathFragment): FileEntry | null {
    return this._tree.get(join(this.path, name));
  }

  visit(visitor: FileVisitor): void {
    function _recurse(entry: DirEntry) {
      entry.subfiles.forEach(path => {
        visitor(join(entry.path, path), entry.file(path));
      });
      entry.subdirs.forEach(path => {
        _recurse(entry.dir(path));
      });
    }

    try {
      _recurse(this);
    } catch (e) {
      if (e !== FileVisitorCancelToken) {
        throw e;
      }
    }
  }
}


export class HostTree implements Tree {
  private _id = _uniqueId++;
  private _record: virtualFs.CordHost;
  private _recordSync: virtualFs.SyncDelegateHost;

  private _dirCache = new Map<Path, HostDirEntry>();


  [TreeSymbol]() {
    return this;
  }

  constructor(protected _backend: virtualFs.ReadonlyHost<{}> = new virtualFs.Empty()) {
    this._record = new virtualFs.CordHost(new virtualFs.SafeReadonlyHost(_backend));
    this._recordSync = new virtualFs.SyncDelegateHost(this._record);
  }

  protected _normalizePath(path: string): Path {
    return normalize('/' + path);
  }

  protected _willCreate(path: Path) {
    let current: ReadonlyHost = this._record;
    while (current && current != this._backend) {
      if (!(current instanceof virtualFs.CordHost)) {
        break;
      }

      if (current.willCreate(path)) {
        return true;
      }

      current = current.backend;
    }

    return false;
  }
  protected _willOverwrite(path: Path) {
    let current: ReadonlyHost = this._record;
    while (current && current != this._backend) {
      if (!(current instanceof virtualFs.CordHost)) {
        break;
      }

      if (current.willOverwrite(path)) {
        return true;
      }

      current = current.backend;
    }

    return false;
  }
  protected _willDelete(path: Path) {
    let current: ReadonlyHost = this._record;
    while (current && current != this._backend) {
      if (!(current instanceof virtualFs.CordHost)) {
        break;
      }

      if (current.willDelete(path)) {
        return true;
      }

      current = current.backend;
    }

    return false;
  }
  protected _willRename(path: Path) {
    let current: ReadonlyHost = this._record;
    while (current && current != this._backend) {
      if (!(current instanceof virtualFs.CordHost)) {
        break;
      }

      if (current.willRename(path)) {
        return true;
      }

      current = current.backend;
    }

    return false;
  }


  branch(): Tree {
    // Freeze our own records, and swap. This is so the branch and this Tree don't share the same
    // history anymore.
    const record = this._record;
    this._record = new virtualFs.CordHost(record);
    this._recordSync = new virtualFs.SyncDelegateHost(this._record);

    return new HostTree(record);
  }

  merge(other: Tree, strategy: MergeStrategy = MergeStrategy.Default): void {
    if (other === this) {
      // Merging with yourself? Tsk tsk. Nothing to do at least.
      return;
    }

    const creationConflictAllowed =
      (strategy & MergeStrategy.AllowCreationConflict) == MergeStrategy.AllowCreationConflict;
    const overwriteConflictAllowed =
      (strategy & MergeStrategy.AllowOverwriteConflict) == MergeStrategy.AllowOverwriteConflict;
    const deleteConflictAllowed =
      (strategy & MergeStrategy.AllowOverwriteConflict) == MergeStrategy.AllowDeleteConflict;

    other.actions.forEach(action => {
      if (action.id === this._id) {
        return;
      }

      switch (action.kind) {
        case 'c': {
          const { path, content } = action;

          if ((this._willCreate(path) || this._willOverwrite(path))) {
            if (!creationConflictAllowed) {
              throw new MergeConflictException(path);
            }

            this._record.overwrite(path, content as {} as virtualFs.FileBuffer).subscribe();
          } else {
            this._record.create(path, content as {} as virtualFs.FileBuffer).subscribe();
          }

          return;
        }

        case 'o': {
          const { path, content } = action;

          // Ignore if content is the same (considered the same change).
          if (this._willOverwrite(path) && !overwriteConflictAllowed) {
            throw new MergeConflictException(path);
          }
          // We use write here as merge validation has already been done, and we want to let
          // the CordHost do its job.
          this._record.overwrite(path, content as {} as virtualFs.FileBuffer).subscribe();

          return;
        }

        case 'r': {
          const { path, to } = action;
          if (this._willRename(path)) {
            // No override possible for renaming.
            throw new MergeConflictException(path);
          }
          this.rename(path, to);

          return;
        }

        case 'd': {
          const { path } = action;
          if (this._willDelete(path) && !deleteConflictAllowed) {
            throw new MergeConflictException(path);
          }
          this._recordSync.delete(path);

          return;
        }
      }
    });
  }

  get root(): DirEntry {
    return this.getDir('/');
  }

  // Readonly.
  read(path: string): Buffer | null {
    const entry = this.get(path);

    return entry ? entry.content : null;
  }
  exists(path: string): boolean {
    return this._recordSync.isFile(this._normalizePath(path));
  }

  get(path: string): FileEntry | null {
    const p = this._normalizePath(path);
    if (this._recordSync.isDirectory(p)) {
      throw new PathIsDirectoryException(p);
    }
    if (!this._recordSync.exists(p)) {
      return null;
    }

    return new LazyFileEntry(p, () => new Buffer(this._recordSync.read(p)));
  }

  getDir(path: string): DirEntry {
    const p = this._normalizePath(path);
    if (this._recordSync.isFile(p)) {
      throw new PathIsFileException(p);
    }

    let maybeCache = this._dirCache.get(p);
    if (!maybeCache) {
      let parent: Path | null = dirname(p);
      if (p === parent) {
        parent = null;
      }

      maybeCache = new HostDirEntry(parent && this.getDir(parent), p, this._recordSync, this);
      this._dirCache.set(p, maybeCache);
    }

    return maybeCache;
  }
  visit(visitor: FileVisitor): void {
    const allFiles: [Path, FileEntry | null | undefined][] = [];
    this.root.visit((path, entry) => {
      allFiles.push([path, entry]);
    });

    allFiles.forEach(([path, entry]) => visitor(path, entry));
  }

  // Change content of host files.
  overwrite(path: string, content: Buffer | string): void {
    const p = this._normalizePath(path);
    if (!this._recordSync.exists(p)) {
      throw new FileDoesNotExistException(p);
    }
    const c = typeof content == 'string' ? new Buffer(content) : content;
    this._record.overwrite(p, c as {} as virtualFs.FileBuffer).subscribe();
  }
  beginUpdate(path: string): UpdateRecorder {
    const entry = this.get(path);
    if (!entry) {
      throw new FileDoesNotExistException(path);
    }

    return UpdateRecorderBase.createFromFileEntry(entry);
  }
  commitUpdate(record: UpdateRecorder): void {
    if (record instanceof UpdateRecorderBase) {
      const path = record.path;
      const entry = this.get(path);
      if (!entry) {
        throw new ContentHasMutatedException(path);
      } else {
        const newContent = record.apply(entry.content);
        this.overwrite(path, newContent);
      }
    } else {
      throw new InvalidUpdateRecordException();
    }
  }

  // Structural methods.
  create(path: string, content: Buffer | string): void {
    const p = this._normalizePath(path);
    if (this._recordSync.exists(p)) {
      throw new FileAlreadyExistException(p);
    }
    const c = typeof content == 'string' ? new Buffer(content) : content;
    this._record.create(p, c as {} as virtualFs.FileBuffer).subscribe();
  }
  delete(path: string): void {
    this._recordSync.delete(this._normalizePath(path));
  }
  rename(from: string, to: string): void {
    this._recordSync.rename(this._normalizePath(from), this._normalizePath(to));
  }

  apply(action: Action, strategy?: MergeStrategy): void {
    throw new SchematicsException('Apply not implemented on host trees.');
  }
  get actions(): Action[] {
    // Create a list of all records until we hit our original backend. This is to support branches
    // that diverge from each others.
    const allRecords: CordHostRecord[] = [...this._record.records()];
    let current = this._record.backend;
    while (current != this._backend) {
      if (!(current instanceof virtualFs.CordHost)) {
        break;
      }

      allRecords.unshift(...current.records());
      current = current.backend;
    }

    return clean(
      allRecords
        .map(record => {
          switch (record.kind) {
            case 'create':
              return {
                id: this._id,
                parent: 0,
                kind: 'c',
                path: record.path,
                content: new Buffer(record.content),
              } as CreateFileAction;
            case 'overwrite':
              return {
                id: this._id,
                parent: 0,
                kind: 'o',
                path: record.path,
                content: new Buffer(record.content),
              } as OverwriteFileAction;
            case 'rename':
              return {
                id: this._id,
                parent: 0,
                kind: 'r',
                path: record.from,
                to: record.to,
              } as RenameFileAction;
            case 'delete':
              return {
                id: this._id,
                parent: 0,
                kind: 'd',
                path: record.path,
              } as DeleteFileAction;

            default:
              return;
          }
        }),
    );
  }
}
