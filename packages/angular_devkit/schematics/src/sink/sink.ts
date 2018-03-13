/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Observable } from 'rxjs/Observable';
import { defer as deferObservable } from 'rxjs/observable/defer';
import { empty } from 'rxjs/observable/empty';
import { from as observableFrom } from 'rxjs/observable/from';
import { of as observableOf } from 'rxjs/observable/of';
import {
  concat,
  concatMap,
  ignoreElements,
  map,
  mergeMap,
  reduce,
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
  preCommitAction: (action: Action) => void | PromiseLike<Action> | Observable<Action> | Action;
  preCommit: () => void | Observable<void>;
  postCommit: () => void | Observable<void>;

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
    return empty<void>().pipe(
      concat(new Observable<void>(observer => {
        return this.validateSingleAction(action).subscribe(observer);
      })),
      concat(new Observable<void>(observer => {
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
      })));
  }

  commit(tree: Tree): Observable<void> {
    const actions = observableFrom(tree.actions);

    return (this.preCommit() || empty<void>()).pipe(
      concat(deferObservable(() => actions)),
      concatMap((action: Action) => {
        const maybeAction = this.preCommitAction(action);
        if (!maybeAction) {
          return observableOf(action);
        } else if (isAction(maybeAction)) {
          return observableOf(maybeAction);
        } else {
          return maybeAction;
        }
      }),
      concatMap((action: Action) => {
        return this.commitSingleAction(action).pipe(
          ignoreElements(),
          concat([action]));
      }),
      concatMap((action: Action) => this.postCommitAction(action) || empty<void>()),
      concat(deferObservable(() => this._done())),
      concat(deferObservable(() => this.postCommit() || empty<void>())),
      reduce(() => {}),
    );
  }
}
