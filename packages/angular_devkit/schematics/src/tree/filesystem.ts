/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Path, normalize } from '@angular-devkit/core';
import { LazyFileEntry } from './entry';
import { FileEntry } from './interface';
import { VirtualTree } from './virtual';


export interface FileSystemTreeHost {
  listDirectory: (path: string) => string[];
  isDirectory: (path: string) => boolean;
  readFile: (path: string) => Buffer;

  join: (path1: string, other: string) => string;
}


export class FileSystemTree extends VirtualTree {
  protected _initialized = false;

  constructor(private _host: FileSystemTreeHost) {
    super();
  }

  get root(): Map<Path, FileEntry> {
    const host = this._host;
    if (!this._initialized) {
      this._initialized = true;
      this._recursiveFileList().forEach(([system, schematic]) => {
        this._root.set(schematic, new LazyFileEntry(schematic, () => host.readFile(system)));
      });
    }

    return this._root;
  }

  get(path: string): FileEntry | null {
    const normalizedPath = this._normalizePath(path);

    return this._cacheMap.get(normalizedPath) || this.root.get(normalizedPath) || null;
  }

  protected _copyTo<T extends VirtualTree>(tree: T): void {
    if (tree instanceof FileSystemTree) {
      const x = tree as FileSystemTree;
      x._root = this._root;
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
