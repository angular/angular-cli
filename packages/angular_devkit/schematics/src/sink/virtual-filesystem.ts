/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Observable } from 'rxjs/Observable';
import { concat as concatObservables } from 'rxjs/observable/concat';
import { empty } from 'rxjs/observable/empty';
import { from as observableFrom } from 'rxjs/observable/from';
import { of as observableOf } from 'rxjs/observable/of';
import { concatMap, reduce } from 'rxjs/operators';
import { CreateFileAction } from '../tree/action';
import { UpdateBuffer } from '../utility/update-buffer';
import { SimpleSinkBase } from './sink';


export interface VirtualFileSystemSinkHost {
  write(path: string, content: Buffer): Observable<void>;
  delete(path: string): Observable<void>;
  exists(path: string): Observable<boolean>;
  rename(path: string, to: string): Observable<void>;
}


export abstract class VirtualFileSystemSink extends SimpleSinkBase {
  protected _filesToDelete = new Set<string>();
  protected _filesToRename = new Set<[string, string]>();
  protected _filesToCreate = new Map<string, UpdateBuffer>();
  protected _filesToUpdate = new Map<string, UpdateBuffer>();

  constructor(protected _host: VirtualFileSystemSinkHost, protected _force = false) { super(); }

  protected _validateCreateAction(action: CreateFileAction): Observable<void> {
    return this._force ? empty<void>() : super._validateCreateAction(action);
  }

  protected _validateFileExists(p: string): Observable<boolean> {
    if (this._filesToCreate.has(p) || this._filesToUpdate.has(p)) {
      return observableOf(true);
    } else if (this._filesToDelete.has(p)) {
      return observableOf(false);
    } else {
      return this._host.exists(p);
    }
  }

  protected _overwriteFile(path: string, content: Buffer): Observable<void> {
    this._filesToUpdate.set(path, new UpdateBuffer(content));

    return empty<void>();
  }
  protected _createFile(path: string, content: Buffer): Observable<void> {
    this._filesToCreate.set(path, new UpdateBuffer(content));

    return empty<void>();
  }
  protected _renameFile(from: string, to: string): Observable<void> {
    this._filesToRename.add([from, to]);

    return empty<void>();
  }
  protected _deleteFile(path: string): Observable<void> {
    if (this._filesToCreate.has(path)) {
      this._filesToCreate.delete(path);
      this._filesToUpdate.delete(path);
    } else {
      this._filesToDelete.add(path);
    }

    return empty<void>();
  }

  _done() {
    // Really commit everything to the actual filesystem.
    return concatObservables(
      observableFrom([...this._filesToDelete.values()]).pipe(
        concatMap(path => this._host.delete(path))),
      observableFrom([...this._filesToCreate.entries()]).pipe(
        concatMap(([path, buffer]) => this._host.write(path, buffer.generate()))),
      observableFrom([...this._filesToRename.entries()]).pipe(
        concatMap(([_, [path, to]]) => this._host.rename(path, to))),
      observableFrom([...this._filesToUpdate.entries()]).pipe(
        concatMap(([path, buffer]) => this._host.write(path, buffer.generate()))),
    ).pipe(reduce(() => {}));
  }
}
