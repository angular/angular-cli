/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {normalizePath} from '../utility/path';
import {FileSystemTreeHost} from './filesystem';


export class InMemoryFileSystemTreeHost implements FileSystemTreeHost {
  private _content: { [path: string]: Buffer };
  private _files: string[];
  constructor(content: { [path: string]: string }) {
    this._content = Object.create(null);
    Object.keys(content).forEach(path => {
      path = normalizePath(path);
      this._content[path] = new Buffer(content[path]);
    });
    this._files = Object.keys(this._content);
  }

  listDirectory(path: string) {
    path = normalizePath(path).replace(/\/?$/, '/');

    return Object.keys(
      this._files
        .filter(p => p.startsWith(path))
        .map(p => p.substr(path.length))
        .map(p => p.replace(/\/.*$/, ''))
        .reduce((acc: {[k: string]: boolean}, p) => (acc[p] = true, acc), {}),
    ).sort();
  }
  isDirectory(path: string) {
    path = normalizePath(path);

    return path == '/' || this._files.some(p => p.split('/').slice(0, -1).join('/') == path);
  }
  readFile(path: string) {
    path = normalizePath(path);

    return this._content[path] || new Buffer('');
  }

  join(path1: string, path2: string) {
    return normalizePath(path1 + '/' + path2);
  }
}
