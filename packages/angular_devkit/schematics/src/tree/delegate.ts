/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Action } from './action';
import {
  DirEntry,
  FileEntry,
  FileVisitor,
  MergeStrategy,
  Tree,
  TreeSymbol,
  UpdateRecorder,
} from './interface';

export class DelegateTree implements Tree {
  constructor(protected _other: Tree) {}

  branch(): Tree { return this._other.branch(); }
  merge(other: Tree, strategy?: MergeStrategy): void { this._other.merge(other, strategy); }

  get root(): DirEntry { return this._other.root; }

  // Readonly.
  read(path: string): Buffer | null { return this._other.read(path); }
  exists(path: string): boolean { return this._other.exists(path); }
  get(path: string): FileEntry | null { return this._other.get(path); }
  getDir(path: string): DirEntry { return this._other.getDir(path); }
  visit(visitor: FileVisitor): void { return this._other.visit(visitor); }

  // Change content of host files.
  overwrite(path: string, content: Buffer | string): void {
    return this._other.overwrite(path, content);
  }
  beginUpdate(path: string): UpdateRecorder { return this._other.beginUpdate(path); }
  commitUpdate(record: UpdateRecorder): void { return this._other.commitUpdate(record); }

  // Structural methods.
  create(path: string, content: Buffer | string): void {
    return this._other.create(path, content);
  }
  delete(path: string): void { return this._other.delete(path); }
  rename(from: string, to: string): void { return this._other.rename(from, to); }

  apply(action: Action, strategy?: MergeStrategy): void {
    return this._other.apply(action, strategy);
  }
  get actions(): Action[] { return this._other.actions; }

  [TreeSymbol]() {
    return this;
  }
}
