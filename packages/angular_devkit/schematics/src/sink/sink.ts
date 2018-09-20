/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {
  Observable,
  concat,
  defer as deferObservable,
  from as observableFrom,
  of as observableOf,
} from 'rxjs';
import {
  concatMap,
  ignoreElements,
  map,
  mergeMap,
} from 'rxjs/operators';
import { FileAlreadyExistException, FileDoesNotExistException } from '../exception/exception';
import {
  Action,
  CreateFileAction,
  DeleteFileAction,
  OverwriteFileAction,
  RenameFileAction,
  UnknownActionException,
  isAction,
} from '../tree/action';
import { Tree } from '../tree/interface';


export interface Sink {
  commit(tree: Tree): Observable<void>;
}


const Noop = function() {};


export abstract class SimpleSinkBase implements Sink {
  preCommitAction: (action: Action) => void
                                     | Action
                                     | PromiseLike<Action>
                                     | Observable<Action> = Noop;
  postCommitAction: (action: Action) => void | Observable<void> = Noop;
  preCommit: () => void | Observable<void> = Noop;
  postCommit: () => void | Observable<void> = Noop;

  protected abstract _validateFileExists(p: string): Observable<boolean>;

  protected abstract _overwriteFile(path: string, content: Buffer): Observable<void>;
  protected abstract _createFile(path: string, content: Buffer): Observable<void>;
  protected abstract _renameFile(path: string, to: string): Observable<void>;
  protected abstract _deleteFile(path: string): Observable<void>;

  protected abstract _done(): Observable<void>;

  protected _fileAlreadyExistException(path: string): void {
    throw new FileAlreadyExistException(path);
  }
  protected _fileDoesNotExistException(path: string): void {
    throw new FileDoesNotExistException(path);
  }

  protected _validateOverwriteAction(action: OverwriteFileAction): Observable<void> {
    return this._validateFileExists(action.path)
      .pipe(map(b => { if (!b) { this._fileDoesNotExistException(action.path); } }));
  }
  protected _validateCreateAction(action: CreateFileAction): Observable<void> {
    return this._validateFileExists(action.path)
      .pipe(map(b => { if (b) { this._fileAlreadyExistException(action.path); } }));
  }
  protected _validateRenameAction(action: RenameFileAction): Observable<void> {
    return this._validateFileExists(action.path).pipe(
      map(b => { if (!b) { this._fileDoesNotExistException(action.path); } }),
      mergeMap(() => this._validateFileExists(action.to)),
      map(b => { if (b) { this._fileAlreadyExistException(action.to); } }));
  }
  protected _validateDeleteAction(action: DeleteFileAction): Observable<void> {
    return this._validateFileExists(action.path)
      .pipe(map(b => { if (!b) { this._fileDoesNotExistException(action.path); } }));
  }

  validateSingleAction(action: Action): Observable<void> {
    switch (action.kind) {
      case 'o': return this._validateOverwriteAction(action);
      case 'c': return this._validateCreateAction(action);
      case 'r': return this._validateRenameAction(action);
      case 'd': return this._validateDeleteAction(action);
      default: throw new UnknownActionException(action);
    }
  }

  commitSingleAction(action: Action): Observable<void> {
    return concat(
      this.validateSingleAction(action),
      new Observable<void>(observer => {
        let committed = null;
        switch (action.kind) {
          case 'o': committed = this._overwriteFile(action.path, action.content); break;
          case 'c': committed = this._createFile(action.path, action.content); break;
          case 'r': committed = this._renameFile(action.path, action.to); break;
          case 'd': committed = this._deleteFile(action.path); break;
        }

        if (committed) {
          committed.subscribe(observer);
        } else {
          observer.complete();
        }
      }),
    ).pipe(ignoreElements());
  }

  commit(tree: Tree): Observable<void> {
    const actions = observableFrom(tree.actions);

    return concat(
      (this.preCommit() || observableOf(null)),
      deferObservable(() => actions).pipe(
        concatMap(action => {
          const maybeAction = this.preCommitAction(action);
          if (!maybeAction) {
            return observableOf(action);
          } else if (isAction(maybeAction)) {
            return observableOf(maybeAction);
          } else {
            return maybeAction;
          }
        }),
        concatMap(action => {
          return concat(
            this.commitSingleAction(action).pipe(ignoreElements()),
            observableOf(action),
          );
        }),
        concatMap(action => this.postCommitAction(action) || observableOf(null)),
      ),
      deferObservable(() => this._done()),
      deferObservable(() => this.postCommit() || observableOf(null)),
    ).pipe(ignoreElements());
  }
}
