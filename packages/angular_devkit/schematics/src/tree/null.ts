/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {
  BaseException,
  Path,
  PathFragment,
  dirname,
  join,
  normalize,
} from '@angular-devkit/core';
import { FileDoesNotExistException } from '../exception/exception';
import { Action } from './action';
import { DirEntry, MergeStrategy, Tree, TreeSymbol, UpdateRecorder } from './interface';
import { UpdateRecorderBase } from './recorder';


export class CannotCreateFileException extends BaseException {
  constructor(path: string) { super(`Cannot create file "${path}".`); }
}


export class NullTreeDirEntry implements DirEntry {
  get parent(): DirEntry | null {
    return this.path == '/' ? null : new NullTreeDirEntry(dirname(this.path));
  }

  constructor(public readonly path: Path) {}

  readonly subdirs: PathFragment[] = [];
  readonly subfiles: PathFragment[] = [];

  dir(name: PathFragment): DirEntry {
    return new NullTreeDirEntry(join(this.path, name));
  }
  file(_name: PathFragment) { return null; }

  visit() {}
}


export class NullTree implements Tree {
  [TreeSymbol]() {
    return this;
  }

  branch(): Tree {
    return new NullTree();
  }
  merge(_other: Tree, _strategy?: MergeStrategy): void {}

  readonly root: DirEntry = new NullTreeDirEntry(normalize('/'));

  // Simple readonly file system operations.
  exists(_path: string) { return false; }
  read(_path: string) { return null; }
  get(_path: string) { return null; }
  getDir(path: string) { return new NullTreeDirEntry(normalize('/' + path)); }
  visit() {}

  // Change content of host files.
  beginUpdate(path: string): never {
    throw new FileDoesNotExistException(path);
  }
  commitUpdate(record: UpdateRecorder): never {
    throw new FileDoesNotExistException(record instanceof UpdateRecorderBase
      ? record.path
      : '<unknown>');
  }

  // Change structure of the host.
  copy(path: string, _to: string): never {
    throw new FileDoesNotExistException(path);
  }
  delete(path: string): never {
    throw new FileDoesNotExistException(path);
  }
  create(path: string, _content: Buffer | string): never {
    throw new CannotCreateFileException(path);
  }
  rename(path: string, _to: string): never {
    throw new FileDoesNotExistException(path);
  }
  overwrite(path: string, _content: Buffer | string): never {
    throw new FileDoesNotExistException(path);
  }

  apply(_action: Action, _strategy?: MergeStrategy): void {}
  get actions(): Action[] {
    return [];
  }
}
