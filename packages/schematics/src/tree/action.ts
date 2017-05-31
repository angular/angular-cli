/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {BaseException} from '../exception/exception';
import {SchematicPath} from '../utility/path';


export class UnknownActionException extends BaseException {
  constructor(action: Action) { super(`Unknown action: "${action.kind}".`); }
}


export type Action = CreateFileAction
                   | OverwriteFileAction
                   | RenameFileAction
                   | DeleteFileAction;


export interface ActionBase {
  readonly id: number;
  readonly path: SchematicPath;
}


let _id = 0;

export class ActionList implements Iterable<Action> {
  private _actions: Action[] = [];

  create(path: SchematicPath, content: Buffer) {
    this._actions.push({ id: _id++, kind: 'c', path, content });
  }
  overwrite(path: SchematicPath, content: Buffer) {
    this._actions.push({ id: _id++, kind: 'o', path, content });
  }
  rename(path: SchematicPath, to: SchematicPath) {
    this._actions.push({ id: _id++, kind: 'r', path, to });
  }
  delete(path: SchematicPath) {
    this._actions.push({ id: _id++, kind: 'd', path });
  }


  optimize() {
    const actions = this._actions;
    const deleted = new Set<string>();
    this._actions = [];

    // Handles files we create.
    for (let i = 0; i < actions.length; i++) {
      const iAction = actions[i];
      if (iAction.kind == 'c') {
        let path = iAction.path;
        let content = iAction.content;
        let toDelete = false;
        deleted.delete(path);

        for (let j = i + 1; j < actions.length; j++) {
          const action = actions[j];
          if (path == action.path) {
            switch (action.kind) {
              case 'c': content = action.content; actions.splice(j--, 1); break;
              case 'o': content = action.content; actions.splice(j--, 1); break;
              case 'r': path = action.to; actions.splice(j--, 1); break;
              case 'd': toDelete = true; actions.splice(j--, 1); break;
            }
          }
          if (toDelete) {
            break;
          }
        }

        if (!toDelete) {
          this.create(path, content);
        } else {
          deleted.add(path);
        }
      } else if (deleted.has(iAction.path)) {
        continue;
      } else {
        switch (iAction.kind) {
          case 'o': this.overwrite(iAction.path, iAction.content); break;
          case 'r': this.rename(iAction.path, iAction.to); break;
          case 'd': this.delete(iAction.path); break;
        }
      }
    }
  }

  push(action: Action) { this._actions.push(action); }
  get(i: number) { return this._actions[i]; }
  has(action: Action) {
    for (let i = 0; i < this._actions.length; i++) {
      const a = this._actions[i];
      if (a.id == action.id) {
        return true;
      }
      if (a.id > action.id) {
        return false;
      }
    }
    return false;
  }
  find(predicate: (value: Action) => boolean): Action | null {
    return this._actions.find(predicate) || null;
  }
  forEach(fn: (value: Action, index: number, array: Action[]) => void, thisArg?: any) {
    this._actions.forEach(fn, thisArg);
  }
  get length() { return this._actions.length; }
  [Symbol.iterator]() { return this._actions[Symbol.iterator](); }
}


export function isContentAction(action: Action): action is CreateFileAction | OverwriteFileAction {
  return action.kind == 'c' || action.kind == 'o';
}


// Create a file. If the file already exists then this is an error.
export interface CreateFileAction extends ActionBase {
  readonly kind: 'c';
  readonly content: Buffer;
}

// Overwrite a file. If the file does not already exist, this is an error.
export interface OverwriteFileAction extends ActionBase {
  readonly kind: 'o';
  readonly content: Buffer;
}

// Move a file from one path to another. If the source files does not exist, this is an error.
// If the target path already exists, this is an error.
export interface RenameFileAction extends ActionBase {
  readonly kind: 'r';
  readonly to: SchematicPath;
}

// Delete a file. If the file does not exist, this is an error.
export interface DeleteFileAction extends ActionBase {
  readonly kind: 'd';
}
