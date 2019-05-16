/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { BaseException, Path } from '@angular-devkit/core';


export class UnknownActionException extends BaseException {
  constructor(action: Action) { super(`Unknown action: "${action.kind}".`); }
}


export type Action = CreateFileAction
                   | OverwriteFileAction
                   | RenameFileAction
                   | DeleteFileAction;


export interface ActionBase {
  readonly id: number;
  readonly parent: number;
  readonly path: Path;
}


let _id = 1;

export class ActionList implements Iterable<Action> {
  private _actions: Action[] = [];

  protected _action(action: Partial<Action>) {
    this._actions.push(Object.assign({
      id: _id++,
      parent: this._actions[this._actions.length - 1] || 0,
    }, action) as Action);
  }

  create(path: Path, content: Buffer) {
    this._action({ kind: 'c', path, content });
  }
  overwrite(path: Path, content: Buffer) {
    this._action({ kind: 'o', path, content });
  }
  rename(path: Path, to: Path) {
    this._action({ kind: 'r', path, to });
  }
  delete(path: Path) {
    this._action({ kind: 'd', path });
  }


  optimize() {
    const toCreate = new Map<Path, Buffer>();
    const toRename = new Map<Path, Path>();
    const toOverwrite = new Map<Path, Buffer>();
    const toDelete = new Set<Path>();

    for (const action of this._actions) {
      switch (action.kind) {
        case 'c':
          toCreate.set(action.path, action.content);
          break;

        case 'o':
          if (toCreate.has(action.path)) {
            toCreate.set(action.path, action.content);
          } else {
            toOverwrite.set(action.path, action.content);
          }
          break;

        case 'd':
          toDelete.add(action.path);
          break;

        case 'r':
          const maybeCreate = toCreate.get(action.path);
          const maybeOverwrite = toOverwrite.get(action.path);
          if (maybeCreate) {
            toCreate.delete(action.path);
            toCreate.set(action.to, maybeCreate);
          }
          if (maybeOverwrite) {
            toOverwrite.delete(action.path);
            toOverwrite.set(action.to, maybeOverwrite);
          }

          let maybeRename: Path | undefined = undefined;
          for (const [from, to] of toRename.entries()) {
            if (to == action.path) {
              maybeRename = from;
              break;
            }
          }

          if (maybeRename) {
            toRename.set(maybeRename, action.to);
          }

          if (!maybeCreate && !maybeOverwrite && !maybeRename) {
            toRename.set(action.path, action.to);
          }
          break;
      }
    }

    this._actions = [];
    toDelete.forEach(x => {
      this.delete(x);
    });

    toRename.forEach((to, from) => {
      this.rename(from, to);
    });

    toCreate.forEach((content, path) => {
      this.create(path, content);
    });

    toOverwrite.forEach((content, path) => {
      this.overwrite(path, content);
    });
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
  forEach(fn: (value: Action, index: number, array: Action[]) => void, thisArg?: {}) {
    this._actions.forEach(fn, thisArg);
  }
  get length() { return this._actions.length; }
  [Symbol.iterator]() { return this._actions[Symbol.iterator](); }
}


export function isContentAction(action: Action): action is CreateFileAction | OverwriteFileAction {
  return action.kind == 'c' || action.kind == 'o';
}


export function isAction(action: any): action is Action {  // tslint:disable-line:no-any
  const kind = action && action.kind;

  return action !== null
      && typeof action.id == 'number'
      && typeof action.path == 'string'
      && (kind == 'c' || kind == 'o' || kind == 'r' || kind == 'd');
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
  readonly to: Path;
}

// Delete a file. If the file does not exist, this is an error.
export interface DeleteFileAction extends ActionBase {
  readonly kind: 'd';
}
