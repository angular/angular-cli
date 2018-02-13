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
  fragment,
  join,
  normalize,
  virtualFs,
} from '@angular-devkit/core';
import { LazyFileEntry } from './entry';
import { DirEntry, FileEntry, Tree } from './interface';
import { VirtualDirEntry, VirtualTree } from './virtual';


export class FileSystemDirEntry extends VirtualDirEntry {
  constructor(
    protected _host: virtualFs.SyncDelegateHost<{}>,
    tree: FileSystemTree,
    path: Path = normalize('/'),
  ) {
    super(tree, path);
  }

  protected _createDir(name: PathFragment): DirEntry {
    return new FileSystemDirEntry(this._host, this._tree as FileSystemTree, join(this._path, name));
  }

  get parent() {
    return this._path == '/' ? null : this._tree.getDir(dirname(this._path));
  }
  get subdirs() {
    const result = new Set<PathFragment>();

    try {
      this._host.list(this._path)
          .filter(name => this._host.isDirectory(join(this._path, name)))
          .forEach(name => result.add(fragment(name)));
    } catch (e) {
      if (e.code != 'ENOENT' && e.code != 'ENOTDIR') {
        throw e;
      }
    }

    for (const path of this._tree.staging.keys()) {
      if (path.startsWith(this._path) && dirname(path) != this._path) {
        result.add(basename(path));
      }
    }

    return [...result];
  }
  get subfiles() {
    const result = new Set<PathFragment>();

    try {
      this._host.list(this._path)
        .filter(name => !this._host.isDirectory(join(this._path, name)))
        .forEach(name => result.add(fragment(name)));
    } catch (e) {
      if (e.code != 'ENOENT' && e.code != 'ENOTDIR') {
        throw e;
      }
    }

    for (const path of this._tree.staging.keys()) {
      if (path.startsWith(this._path) && dirname(path) == this._path) {
        result.add(basename(path));
      }
    }

    return [...result];
  }

  file(name: PathFragment) {
    return this._tree.get(join(this._path, name));
  }
}


export class FileSystemTree extends VirtualTree {
  // This needs to be SyncDelegateHost because schematics Trees are synchronous.
  protected _host: virtualFs.SyncDelegateHost<{}>;
  protected _initialized = false;

  constructor(host: virtualFs.Host) {
    super();
    this._host = new virtualFs.SyncDelegateHost<{}>(host);
    this._root = new FileSystemDirEntry(this._host, this);
  }

  get tree(): Map<Path, FileEntry> {
    const host = this._host;
    if (!this._initialized) {
      this._initialized = true;
      this._recursiveFileList().forEach(path => {
        this._tree.set(path, new LazyFileEntry(path, () => {
          return new Buffer(host.read(path));
        }));
      });
    }

    return this._tree;
  }

  get(path: string): FileEntry | null {
    const normalizedPath = this._normalizePath(path);

    let entry = this._cacheMap.get(normalizedPath) || this._tree.get(normalizedPath) || null;

    if (entry == null && !this._initialized) {
      const systemPath = normalizedPath;
      const fileExists = this._host.exists(systemPath) && !this._host.isDirectory(systemPath);

      if (fileExists) {
        const host = this._host;
        entry = new LazyFileEntry(normalizedPath, () => new Buffer(host.read(systemPath)));
        this._tree.set(normalizedPath, entry);
      }
    }

    return entry;
  }

  branch(): Tree {
    const newTree = new FileSystemTree(this._host.delegate);
    this._copyTo(newTree);

    return newTree;
  }

  protected _copyTo<T extends VirtualTree>(tree: T): void {
    if (tree instanceof FileSystemTree) {
      const x = tree as FileSystemTree;
      x._tree = this._tree;
      x._initialized = this._initialized;

      this._actions.forEach(action => x._actions.push(action));
      [...this._cacheMap.entries()].forEach(([path, entry]) => {
        x._cacheMap.set(path, entry);
      });
    } else {
      super._copyTo(tree);
    }
  }

  protected _recursiveFileList(): Path[] {
    const host = this._host;
    const list: Path[] = [];

    function recurse(schematicPath: Path) {
      for (const name of host.list(schematicPath)) {
        const normalizedPath = join(schematicPath, name);
        if (host.isDirectory(normalizedPath)) {
          recurse(normalizedPath);
        } else {
          list.push(normalizedPath);
        }
      }
    }

    recurse(normalize('/'));

    return list;
  }
}


export class FileSystemCreateTree extends FileSystemTree {
  constructor(host: virtualFs.Host) {
    super(host);

    this._recursiveFileList().forEach(path => {
      this.create(path, new Buffer(this._host.read(path)));
    });
    this._initialized = true;
  }
}
