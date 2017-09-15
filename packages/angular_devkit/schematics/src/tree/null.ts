/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { BaseException } from '@angular-devkit/core';
import { FileDoesNotExistException } from '../exception/exception';
import { Action } from './action';
import { MergeStrategy, Tree, UpdateRecorder } from './interface';
import { UpdateRecorderBase } from './recorder';


export class CannotCreateFileException extends BaseException {
  constructor(path: string) { super(`Cannot create file "${path}".`); }
}


export class NullTree implements Tree {
  // Simple readonly file system operations.
  exists(_path: string) { return false; }
  read(_path: string) { return null; }
  get(_path: string) { return null; }
  get files(): string[] { return []; }

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
