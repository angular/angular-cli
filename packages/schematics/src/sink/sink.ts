/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {
  Action,
  CreateFileAction,
  DeleteFileAction,
  OverwriteFileAction,
  RenameFileAction,
  UnknownActionException
} from '../tree/action';
import {FileAlreadyExistException, FileDoesNotExistException} from '../exception/exception';
import {Tree} from '../tree/interface';

import {Observable} from 'rxjs/Observable';
import 'rxjs/add/operator/concat';
import 'rxjs/add/operator/concatMap';
import 'rxjs/add/operator/last';
import 'rxjs/add/operator/mergeMap';


export interface Sink {
  preCommitAction: (action: Action) => void | Observable<Action | void> | Action;
  preCommit: () => void | Observable<void>;
  postCommit: () => void | Observable<void>;

  commit(tree: Tree): Observable<void>;
}


const Noop: any = function() {};


export abstract class SimpleSinkBase implements Sink {
  preCommitAction: (action: Action) => void | Action | Observable<Action> = Noop;
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
      .map(b => { if (!b) { this._fileDoesNotExistException(action.path); } });
  }
  protected _validateCreateAction(action: CreateFileAction): Observable<void> {
    return this._validateFileExists(action.path)
      .map(b => { if (b) { this._fileAlreadyExistException(action.path); } });
  }
  protected _validateRenameAction(action: RenameFileAction): Observable<void> {
    return this._validateFileExists(action.path)
      .map(b => { if (!b) { this._fileDoesNotExistException(action.path); } })
      .mergeMap(() => this._validateFileExists(action.to))
      .map(b => { if (b) { this._fileAlreadyExistException(action.to); } });
  }
  protected _validateDeleteAction(action: DeleteFileAction): Observable<void> {
    return this._validateFileExists(action.path)
      .map(b => { if (!b) { this._fileDoesNotExistException(action.path); } });
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
    return Observable.empty<void>()
      .concat(new Observable<void>(observer => {
        return this.validateSingleAction(action).subscribe(observer);
      }))
      .concat(new Observable<void>(observer => {
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
      }));
  }

  commit(tree: Tree): Observable<void> {
    const actions = Observable.from(tree.actions);
    return (this.preCommit() || Observable.empty<void>())
      .concat(new Observable(observer => actions.subscribe(observer)))
      .concatMap((action: Action) => {
        const maybeAction = this.preCommitAction(action);
        if (maybeAction instanceof Observable) {
          return maybeAction;
        } else if (maybeAction) {
          return Observable.of(maybeAction);
        } else {
          return Observable.of(action);
        }
      })
      .mergeMap(action => new Observable<Action>(o => {
        return this.commitSingleAction(action)
          .subscribe({
            error(err) { o.error(err); },
            complete() {
              o.next(action);
              o.complete();
            }
          });
      }))
      .mergeMap(action => this.postCommitAction(action) || Observable.empty<void>())
      .concat(new Observable<void>(observer => { this._done().subscribe(observer); }))
      .concat(new Observable<void>(observer => {
        const maybeObservable = this.postCommit();
        if (maybeObservable) {
          maybeObservable.subscribe(observer);
        } else {
          observer.complete();
        }
      }))
      .map(() => {});
  }
}
