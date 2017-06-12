/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {VirtualTree} from './virtual';
import {normalizePath, SchematicPath} from '../utility/path';
import {LazyFileEntry} from './entry';


export interface FileSystemTreeHost {
  listDirectory: (path: string) => string[];
  isDirectory: (path: string) => boolean;
  readFile: (path: string) => Buffer;

  join: (path1: string, other: string) => string;
}


export class FileSystemTree extends VirtualTree {
  constructor(private _host: FileSystemTreeHost, asCreate = false) {
    super();

    this._recursiveFileList().forEach(([system, schematic]) => {
      if (asCreate) {
        this.create(schematic, _host.readFile(system));
      } else {
        this._root.set(schematic, new LazyFileEntry(schematic, () => _host.readFile(system)));
      }
    });
  }

  protected _recursiveFileList(): [ string, SchematicPath ][] {
    const host = this._host;
    const list: [string, SchematicPath][] = [];

    function recurse(systemPath: string, schematicPath: string) {
      for (const name of host.listDirectory(systemPath)) {
        const systemName = host.join(systemPath, name);
        const normalizedPath = normalizePath(schematicPath + '/' + name);
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
