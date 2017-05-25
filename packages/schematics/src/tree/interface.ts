/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {Action} from './action';
import {SchematicPath} from '../utility/path';


export enum MergeStrategy {
  Error = -1,  // Error out if 2 files have the same path.
  Default = 0,  // Uses the default strategy.
  Overwrite = 1,  // Overwrite the file.
}


export interface FileEntry {
  readonly path: SchematicPath;
  readonly content: Buffer;
}


export interface FilePredicate<T> {
  (path: SchematicPath, entry?: Readonly<FileEntry> | null): T;
}


export interface Tree {
  // Readonly.
  readonly files: string[];
  exists(path: string): boolean;

  // Content access.
  read(path: string): Buffer | null;
  get(path: string): FileEntry | null;

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


export interface UpdateRecorder {
  // These just record changes.
  insertLeft(index: number, content: Buffer | string): UpdateRecorder;
  insertRight(index: number, content: Buffer | string): UpdateRecorder;
  remove(index: number, length: number): UpdateRecorder;
}
