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
} from '@angular-devkit/core';
import { LazyFileEntry } from './entry';
import { DirEntry, FileEntry } from './interface';
import { VirtualDirEntry, VirtualTree } from './virtual';


export interface FileSystemTreeHost {
  listDirectory: (path: string) => string[];
  isDirectory: (path: string) => boolean;
  readFile: (path: string) => Buffer;

  join: (path1: string, other: string) => string;
}


export class FileSystemDirEntry extends VirtualDirEntry {
  constructor(
    protected _host: FileSystemTreeHost,
    tree: FileSystemTree,
    protected _systemPath = '',
    path: Path = normalize('/'),
  ) {
    super(tree, path);
  }

  protected _createDir(name: PathFragment): DirEntry {
    return new FileSystemDirEntry(
      this._host,
      this._tree as FileSystemTree,
      this._host.join(this._systemPath, name),
      join(this._path, name),
    );
  }

  get parent() {
    return this._path == '/' ? null : this._tree.getDir(dirname(this._path));
  }
  get subdirs() {
    const result = new Set<PathFragment>();

    try {
      this._host.listDirectory(this._systemPath)
          .filter(name => this._host.isDirectory(this._host.join(this._systemPath, name)))
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
      this._host.listDirectory(this._systemPath)
        .filter(name => !this._host.isDirectory(this._host.join(this._systemPath, name)))
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
  protected _initialized = false;

  constructor(private _host: FileSystemTreeHost) {
    super();
    this._root = new FileSystemDirEntry(_host, this);
  }

  get tree(): Map<Path, FileEntry> {
    const host = this._host;
    if (!this._initialized) {
      this._initialized = true;
      this._recursiveFileList().forEach(([system, schematic]) => {
        this._tree.set(schematic, new LazyFileEntry(schematic, () => host.readFile(system)));
      });
    }

    return this._tree;
  }

  get(path: string): FileEntry | null {
    const normalizedPath = this._normalizePath(path);

    return this._cacheMap.get(normalizedPath) || this.tree.get(normalizedPath) || null;
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

  protected _recursiveFileList(): [ string, Path ][] {
    const host = this._host;
    const list: [string, Path][] = [];

    function recurse(systemPath: string, schematicPath: string) {
      for (const name of host.listDirectory(systemPath)) {
        const systemName = host.join(systemPath, name);
        const normalizedPath = normalize(schematicPath + '/' + name);
        if (host.isDirectory(normalizedPath)) {
          recurse(systemName, normalizedPath);
        } else {
          list.push([systemName, normalizedPath]);
        }
      }
    }

    recurse('', '/');

    return list;
  }
}


export class FileSystemCreateTree extends FileSystemTree {
  constructor(host: FileSystemTreeHost) {
    super(host);

    this._recursiveFileList().forEach(([system, schematic]) => {
      this.create(schematic, host.readFile(system));
    });
    this._initialized = true;
  }
}
