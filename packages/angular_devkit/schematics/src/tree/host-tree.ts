/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import {
  JsonValue,
  Path,
  PathFragment,
  PathIsDirectoryException,
  PathIsFileException,
  dirname,
  join,
  normalize,
  virtualFs,
} from '@angular-devkit/core';
import { ParseError, parse as jsoncParse, printParseErrorCode } from 'jsonc-parser';
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
import { DelegateTree } from './delegate';
import { LazyFileEntry } from './entry';
import {
  DirEntry,
  FileEntry,
  FilePredicate,
  FileVisitor,
  FileVisitorCancelToken,
  MergeStrategy,
  Tree,
  TreeSymbol,
  UpdateRecorder,
} from './interface';
import { UpdateRecorderBase } from './recorder';
import { ScopedTree } from './scoped';

let _uniqueId = 0;

export class HostDirEntry implements DirEntry {
  constructor(
    readonly parent: DirEntry | null,
    readonly path: Path,
    protected _host: virtualFs.SyncDelegateHost,
    protected _tree: Tree,
  ) {}

  get subdirs(): PathFragment[] {
    return this._host
      .list(this.path)
      .filter((fragment) => this._host.isDirectory(join(this.path, fragment)));
  }
  get subfiles(): PathFragment[] {
    return this._host
      .list(this.path)
      .filter((fragment) => this._host.isFile(join(this.path, fragment)));
  }

  dir(name: PathFragment): DirEntry {
    return this._tree.getDir(join(this.path, name));
  }
  file(name: PathFragment): FileEntry | null {
    return this._tree.get(join(this.path, name));
  }

  visit(visitor: FileVisitor): void {
    try {
      this.getSubfilesRecursively().forEach((file) => visitor(file.path, file));
    } catch (e) {
      if (e !== FileVisitorCancelToken) {
        throw e;
      }
    }
  }

  private getSubfilesRecursively() {
    function _recurse(entry: DirEntry): FileEntry[] {
      return entry.subdirs.reduce(
        (files, subdir) => [...files, ..._recurse(entry.dir(subdir))],
        entry.subfiles.map((subfile) => entry.file(subfile) as FileEntry),
      );
    }

    return _recurse(this);
  }
}

export class HostTree implements Tree {
  private readonly _id = --_uniqueId;
  private _record: virtualFs.CordHost;
  private _recordSync: virtualFs.SyncDelegateHost;
  private _ancestry = new Set<number>();

  private _dirCache = new Map<Path, HostDirEntry>();

  [TreeSymbol](): this {
    return this;
  }

  static isHostTree(tree: Tree): tree is HostTree {
    if (tree instanceof HostTree) {
      return true;
    }

    if (typeof tree === 'object' && typeof (tree as HostTree)._ancestry === 'object') {
      return true;
    }

    return false;
  }

  constructor(protected _backend: virtualFs.ReadonlyHost<{}> = new virtualFs.Empty()) {
    this._record = new virtualFs.CordHost(new virtualFs.SafeReadonlyHost(_backend));
    this._recordSync = new virtualFs.SyncDelegateHost(this._record);
  }

  protected _normalizePath(path: string): Path {
    return normalize('/' + path);
  }

  protected _willCreate(path: Path): boolean {
    return this._record.willCreate(path);
  }

  protected _willOverwrite(path: Path): boolean {
    return this._record.willOverwrite(path);
  }

  protected _willDelete(path: Path): boolean {
    return this._record.willDelete(path);
  }

  protected _willRename(path: Path): boolean {
    return this._record.willRename(path);
  }

  branch(): Tree {
    const branchedTree = new HostTree(this._backend);
    branchedTree._record = this._record.clone();
    branchedTree._recordSync = new virtualFs.SyncDelegateHost(branchedTree._record);
    branchedTree._ancestry = new Set(this._ancestry).add(this._id);

    return branchedTree;
  }

  private isAncestorOf(tree: Tree): boolean {
    if (tree instanceof HostTree) {
      return tree._ancestry.has(this._id);
    }
    if (tree instanceof DelegateTree) {
      return this.isAncestorOf((tree as unknown as { _other: Tree })._other);
    }
    if (tree instanceof ScopedTree) {
      return this.isAncestorOf((tree as unknown as { _base: Tree })._base);
    }

    return false;
  }

  merge(other: Tree, strategy: MergeStrategy = MergeStrategy.Default): void {
    if (other === this) {
      // Merging with yourself? Tsk tsk. Nothing to do at least.
      return;
    }

    if (this.isAncestorOf(other)) {
      // Workaround for merging a branch back into one of its ancestors
      // More complete branch point tracking is required to avoid
      strategy |= MergeStrategy.Overwrite;
    }

    const creationConflictAllowed =
      (strategy & MergeStrategy.AllowCreationConflict) == MergeStrategy.AllowCreationConflict;
    const overwriteConflictAllowed =
      (strategy & MergeStrategy.AllowOverwriteConflict) == MergeStrategy.AllowOverwriteConflict;
    const deleteConflictAllowed =
      (strategy & MergeStrategy.AllowDeleteConflict) == MergeStrategy.AllowDeleteConflict;

    other.actions.forEach((action) => {
      switch (action.kind) {
        case 'c': {
          const { path, content } = action;

          if (this._willCreate(path) || this._willOverwrite(path) || this.exists(path)) {
            const existingContent = this.read(path);
            if (existingContent && content.equals(existingContent)) {
              // Identical outcome; no action required
              return;
            }

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
          if (this._willDelete(path) && !overwriteConflictAllowed) {
            throw new MergeConflictException(path);
          }

          // Ignore if content is the same (considered the same change).
          if (this._willOverwrite(path)) {
            const existingContent = this.read(path);
            if (existingContent && content.equals(existingContent)) {
              // Identical outcome; no action required
              return;
            }

            if (!overwriteConflictAllowed) {
              throw new MergeConflictException(path);
            }
          }
          // We use write here as merge validation has already been done, and we want to let
          // the CordHost do its job.
          this._record.write(path, content as {} as virtualFs.FileBuffer).subscribe();

          return;
        }

        case 'r': {
          const { path, to } = action;
          if (this._willDelete(path)) {
            throw new MergeConflictException(path);
          }

          if (this._willRename(path)) {
            if (this._record.willRenameTo(path, to)) {
              // Identical outcome; no action required
              return;
            }

            // No override possible for renaming.
            throw new MergeConflictException(path);
          }
          this.rename(path, to);

          return;
        }

        case 'd': {
          const { path } = action;
          if (this._willDelete(path)) {
            // TODO: This should technically check the content (e.g., hash on delete)
            // Identical outcome; no action required
            return;
          }

          if (!this.exists(path) && !deleteConflictAllowed) {
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

  readText(path: string): string {
    const data = this.read(path);
    if (data === null) {
      throw new FileDoesNotExistException(path);
    }

    const decoder = new TextDecoder('utf-8', { fatal: true });

    try {
      // With the `fatal` option enabled, invalid data will throw a TypeError
      return decoder.decode(data);
    } catch (e) {
      // The second part should not be needed. But Jest does not support instanceof correctly.
      // See: https://github.com/jestjs/jest/issues/2549
      if (
        e instanceof TypeError ||
        (e as NodeJS.ErrnoException).code === 'ERR_ENCODING_INVALID_ENCODED_DATA'
      ) {
        throw new Error(`Failed to decode "${path}" as UTF-8 text.`);
      }
      throw e;
    }
  }

  readJson(path: string): JsonValue {
    const content = this.readText(path);
    const errors: ParseError[] = [];
    const result = jsoncParse(content, errors, { allowTrailingComma: true });

    // If there is a parse error throw with the error information
    if (errors[0]) {
      const { error, offset } = errors[0];
      throw new Error(
        `Failed to parse "${path}" as JSON. ${printParseErrorCode(error)} at offset: ${offset}.`,
      );
    }

    return result;
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

    return new LazyFileEntry(p, () => Buffer.from(this._recordSync.read(p)));
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
    this.root.visit((path, entry) => {
      visitor(path, entry);
    });
  }

  // Change content of host files.
  overwrite(path: string, content: Buffer | string): void {
    const p = this._normalizePath(path);
    if (!this._recordSync.exists(p)) {
      throw new FileDoesNotExistException(p);
    }
    const c = typeof content == 'string' ? Buffer.from(content) : content;
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
        if (!newContent.equals(entry.content)) {
          this.overwrite(path, newContent);
        }
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
    const c = typeof content == 'string' ? Buffer.from(content) : content;
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

  private *generateActions(): Iterable<Action> {
    for (const record of this._record.records()) {
      switch (record.kind) {
        case 'create':
          yield {
            id: this._id,
            parent: 0,
            kind: 'c',
            path: record.path,
            content: Buffer.from(record.content),
          } as CreateFileAction;
          break;
        case 'overwrite':
          yield {
            id: this._id,
            parent: 0,
            kind: 'o',
            path: record.path,
            content: Buffer.from(record.content),
          } as OverwriteFileAction;
          break;
        case 'rename':
          yield {
            id: this._id,
            parent: 0,
            kind: 'r',
            path: record.from,
            to: record.to,
          } as RenameFileAction;
          break;
        case 'delete':
          yield {
            id: this._id,
            parent: 0,
            kind: 'd',
            path: record.path,
          } as DeleteFileAction;
          break;
      }
    }
  }

  get actions(): Action[] {
    // Create a list of all records until we hit our original backend. This is to support branches
    // that diverge from each others.
    return Array.from(this.generateActions());
  }
}

export class HostCreateTree extends HostTree {
  constructor(host: virtualFs.ReadonlyHost) {
    super();

    const tempHost = new HostTree(host);
    tempHost.visit((path) => {
      const content = tempHost.read(path);
      if (content) {
        this.create(path, content);
      }
    });
  }
}

export class FilterHostTree extends HostTree {
  constructor(tree: HostTree, filter: FilePredicate<boolean> = () => true) {
    const newBackend = new virtualFs.SimpleMemoryHost();
    // cast to allow access
    const originalBackend = (tree as FilterHostTree)._backend;

    // Walk the original backend and add files that match the filter to the new backend
    const pendingPaths: Path[] = ['/' as Path];
    while (pendingPaths.length > 0) {
      const currentPath = pendingPaths.pop();
      if (currentPath === undefined) {
        break;
      }

      let isDirectory = false;
      originalBackend.isDirectory(currentPath).subscribe((val) => (isDirectory = val));
      if (isDirectory) {
        originalBackend
          .list(currentPath)
          .subscribe((val) => pendingPaths.push(...val.map((p) => join(currentPath, p))));
        continue;
      }

      let isFile = false;
      originalBackend.isFile(currentPath).subscribe((val) => (isFile = val));
      if (!isFile || !filter(currentPath)) {
        continue;
      }

      let content = null;
      originalBackend.read(currentPath).subscribe((val) => (content = val));
      if (content !== null) {
        newBackend.write(currentPath, content).subscribe();
      }
    }

    super(newBackend);

    // Add actions that match the filter to new tree
    for (const action of tree.actions) {
      if (!filter(action.path)) {
        continue;
      }

      switch (action.kind) {
        case 'c':
          this.create(action.path, action.content);
          break;
        case 'd':
          this.delete(action.path);
          break;
        case 'o':
          this.overwrite(action.path, action.content);
          break;
        case 'r':
          this.rename(action.path, action.to);
          break;
      }
    }
  }
}
