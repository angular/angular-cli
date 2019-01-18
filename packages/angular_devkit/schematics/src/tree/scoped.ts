/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {
  NormalizedRoot,
  Path,
  PathFragment,
  join,
  normalize,
  relative,
} from '@angular-devkit/core';
import { Action } from './action';
import { DelegateTree } from './delegate';
import {
  DirEntry,
  FileEntry,
  FileVisitor,
  MergeStrategy,
  Tree,
  TreeSymbol,
  UpdateRecorder,
} from './interface';

class ScopedFileEntry implements FileEntry {
  constructor(private _base: FileEntry, private scope: Path) {}

  get path(): Path {
    return join(NormalizedRoot, relative(this.scope, this._base.path));
  }

  get content(): Buffer { return this._base.content; }
}

class ScopedDirEntry implements DirEntry {
  constructor(private _base: DirEntry, readonly scope: Path) {}

  get parent(): DirEntry | null {
    if (!this._base.parent || this._base.path == this.scope) {
      return null;
    }

    return new ScopedDirEntry(this._base.parent, this.scope);
  }

  get path(): Path {
    return join(NormalizedRoot, relative(this.scope, this._base.path));
  }

  get subdirs(): PathFragment[] {
    return this._base.subdirs;
  }
  get subfiles(): PathFragment[] {
    return this._base.subfiles;
  }

  dir(name: PathFragment): DirEntry {
    const entry = this._base.dir(name);

    return entry && new ScopedDirEntry(entry, this.scope);
  }

  file(name: PathFragment): FileEntry | null {
    const entry = this._base.file(name);

    return entry && new ScopedFileEntry(entry, this.scope);
  }

  visit(visitor: FileVisitor): void {
    return this._base.visit((path, entry) => {
      visitor(
        join(NormalizedRoot, relative(this.scope, path)),
        entry && new ScopedFileEntry(entry, this.scope),
      );
    });
  }
}

export class ScopedTree implements Tree {
  readonly _root: ScopedDirEntry;

  constructor(private _base: Tree, scope: string) {
    const normalizedScope = normalize('/' + scope);
    this._root = new ScopedDirEntry(this._base.getDir(normalizedScope), normalizedScope);
  }

  get root(): DirEntry { return this._root; }

  branch(): Tree { return new ScopedTree(this._base.branch(), this._root.scope); }
  merge(other: Tree, strategy?: MergeStrategy): void {
    const self = this;
    const delegate = new class extends DelegateTree {
      get actions(): Action[] {
        return other.actions.map(action => self._fullPathAction(action));
      }
    }(other);

    this._base.merge(delegate, strategy);
  }

  // Readonly.
  read(path: string): Buffer | null { return this._base.read(this._fullPath(path)); }
  exists(path: string): boolean { return this._base.exists(this._fullPath(path)); }
  get(path: string): FileEntry | null {
    const entry = this._base.get(this._fullPath(path));

    return entry && new ScopedFileEntry(entry, this._root.scope);
  }
  getDir(path: string): DirEntry {
    const entry = this._base.getDir(this._fullPath(path));

    return entry && new ScopedDirEntry(entry, this._root.scope);
  }
  visit(visitor: FileVisitor): void { return this._root.visit(visitor); }

  // Change content of host files.
  overwrite(path: string, content: Buffer | string): void {
    return this._base.overwrite(this._fullPath(path), content);
  }
  beginUpdate(path: string): UpdateRecorder {
    return this._base.beginUpdate(this._fullPath(path));
  }
  commitUpdate(record: UpdateRecorder): void { return this._base.commitUpdate(record); }

  // Structural methods.
  create(path: string, content: Buffer | string): void {
    return this._base.create(this._fullPath(path), content);
  }
  delete(path: string): void { return this._base.delete(this._fullPath(path)); }
  rename(from: string, to: string): void {
    return this._base.rename(this._fullPath(from), this._fullPath(to));
  }

  apply(action: Action, strategy?: MergeStrategy): void {
    return this._base.apply(this._fullPathAction(action), strategy);
  }

  get actions(): Action[] {
    const scopedActions = [];

    for (const action of this._base.actions) {
      if (!action.path.startsWith(this._root.scope + '/')) {
        continue;
      }

      if (action.kind !== 'r') {
        scopedActions.push({
          ...action,
          path: join(NormalizedRoot, relative(this._root.scope, action.path)),
        });
      } else if (action.to.startsWith(this._root.scope + '/')) {
        scopedActions.push({
          ...action,
          path: join(NormalizedRoot, relative(this._root.scope, action.path)),
          to: join(NormalizedRoot, relative(this._root.scope, action.to)),
        });
      }
    }

    return scopedActions;
  }

  [TreeSymbol]() {
    return this;
  }

  private _fullPath(path: string): Path {
    return join(this._root.scope, normalize('/' + path));
  }

  private _fullPathAction(action: Action) {
    let fullPathAction: Action;
    if (action.kind === 'r') {
      fullPathAction = {
        ...action,
        path: this._fullPath(action.path),
        to: this._fullPath(action.to),
      };
    } else {
      fullPathAction = {
        ...action,
        path: this._fullPath(action.path),
      };
    }

    return fullPathAction;
  }
}
