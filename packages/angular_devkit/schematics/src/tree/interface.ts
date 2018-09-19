/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Path, PathFragment } from '@angular-devkit/core';
import { Action } from './action';


export enum MergeStrategy {
  AllowOverwriteConflict    = 1 << 1,
  AllowCreationConflict     = 1 << 2,
  AllowDeleteConflict       = 1 << 3,

  // Uses the default strategy.
  Default                   = 0,

  // Error out if 2 files have the same path. It is useful to have a different value than
  // Default in this case as the tooling Default might differ.
  Error                     = 1 << 0,

  // Only content conflicts are overwritten.
  ContentOnly               = AllowOverwriteConflict,

  // Overwrite everything with the latest change.
  Overwrite                 = AllowOverwriteConflict
                            + AllowCreationConflict
                            + AllowDeleteConflict,
}


export const FileVisitorCancelToken: symbol = Symbol();
export type FileVisitor = FilePredicate<void>;

export interface FileEntry {
  readonly path: Path;
  readonly content: Buffer;
}

export interface DirEntry {
  readonly parent: DirEntry | null;
  readonly path: Path;

  readonly subdirs: PathFragment[];
  readonly subfiles: PathFragment[];

  dir(name: PathFragment): DirEntry;
  file(name: PathFragment): FileEntry | null;

  visit(visitor: FileVisitor): void;
}

export interface FilePredicate<T> {
  (path: Path, entry?: Readonly<FileEntry> | null): T;
}

declare const window: { Symbol: { schematicTree: symbol }, window: {} };
declare const self: { Symbol: { schematicTree: symbol }, self: {} };
declare const global: { Symbol: { schematicTree: symbol }, global: {} };

export const TreeSymbol: symbol = (function() {
  const globalSymbol = (typeof window == 'object' && window.window === window && window.Symbol)
                    || (typeof self == 'object' && self.self === self && self.Symbol)
                    || (typeof global == 'object' && global.global === global && global.Symbol);

  if (!globalSymbol) {
    return Symbol('schematic-tree');
  }

  if (!globalSymbol.schematicTree) {
    globalSymbol.schematicTree = Symbol('schematic-tree');
  }

  return globalSymbol.schematicTree;
})();


export interface Tree {
  branch(): Tree;
  merge(other: Tree, strategy?: MergeStrategy): void;

  readonly root: DirEntry;

  // Readonly.
  read(path: string): Buffer | null;
  exists(path: string): boolean;
  get(path: string): FileEntry | null;
  getDir(path: string): DirEntry;
  visit(visitor: FileVisitor): void;

  // Change content of host files.
  overwrite(path: string, content: Buffer | string): void;
  beginUpdate(path: string): UpdateRecorder;
  commitUpdate(record: UpdateRecorder): void;

  // Structural methods.
  create(path: string, content: Buffer | string): void;
  delete(path: string): void;
  rename(from: string, to: string): void;

  apply(action: Action, strategy?: MergeStrategy): void;
  readonly actions: Action[];
}


namespace Tree {
  export function isTree(maybeTree: object): maybeTree is Tree {
    return TreeSymbol in maybeTree;
  }
}


export interface UpdateRecorder {
  // These just record changes.
  insertLeft(index: number, content: Buffer | string): UpdateRecorder;
  insertRight(index: number, content: Buffer | string): UpdateRecorder;
  remove(index: number, length: number): UpdateRecorder;
}
