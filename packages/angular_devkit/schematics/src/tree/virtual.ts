/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {
  Path,
  PathFragment,
  basename,
  dirname,
  join,
  normalize,
  split,
} from '@angular-devkit/core';
import {
  ContentHasMutatedException,
  FileAlreadyExistException,
  FileDoesNotExistException,
  InvalidUpdateRecordException,
  MergeConflictException,
} from '../exception/exception';
import { Action, ActionList, UnknownActionException } from './action';
import { SimpleFileEntry } from './entry';
import {
  DirEntry,
  FileEntry,
  FileVisitor,
  FileVisitorCancelToken,
  MergeStrategy,
  Tree,
  TreeSymbol,
  UpdateRecorder,
} from './interface';
import { UpdateRecorderBase } from './recorder';


export class VirtualDirEntry implements DirEntry {
  protected _subdirs = new Map<PathFragment, DirEntry>();

  constructor(protected _tree: VirtualTree, protected _path: Path = normalize('/')) {}

  protected _createDir(name: PathFragment): DirEntry {
    return new VirtualDirEntry(this._tree, join(this._path, name));
  }

  get parent() {
    return this._path == '/' ? null : this._tree.getDir(dirname(this._path));
  }
  get path() { return this._path; }
  get subdirs() {
    return this._tree.files
               .filter(path => path.startsWith(this._path) && dirname(path) != this._path)
               .map(path => basename(path));
  }
  get subfiles() {
    return this._tree.files
               .filter(path => path.startsWith(this._path) && dirname(path) == this._path)
               .map(path => basename(path));
  }

  dir(name: PathFragment) {
    let maybe = this._subdirs.get(name);
    if (!maybe) {
      this._subdirs.set(name, maybe = this._createDir(name));
    }

    return maybe;
  }
  file(name: PathFragment) {
    return this._tree.get(join(this._path, name));
  }

  visit(visitor: FileVisitor) {
    function _recurse(entry: VirtualDirEntry) {
      entry.subfiles.forEach(path => {
        visitor(join(entry._path, path), entry.file(path));
      });
      entry.subdirs.forEach(path => {
        _recurse(entry.dir(path) as VirtualDirEntry);
      });
    }

    try {
      _recurse(this);
    } catch (e) {
      if (e !== FileVisitorCancelToken) {
        throw e;
      }
    }
  }
}


/**
 * The root class of most trees.
 */
export class VirtualTree implements Tree {
  protected _actions = new ActionList();
  protected _cacheMap = new Map<Path, FileEntry>();
  protected _root = new VirtualDirEntry(this);
  protected _tree = new Map<Path, FileEntry>();

  /**
   * Normalize the path. Made available to subclasses to overload.
   * @param path The path to normalize.
   * @returns {string} A path that is resolved and normalized.
   */
  protected _normalizePath(path: string): Path {
    return normalize('/' + path);
  }
  protected get tree(): ReadonlyMap<Path, FileEntry> { return this._tree; }
  get staging(): ReadonlyMap<Path, FileEntry> { return this._cacheMap; }

  [TreeSymbol]() {
    return this;
  }

  /**
   * A list of file names contained by this Tree.
   * @returns {[string]} File paths.
   */
  get files(): Path[] {
    return [...new Set<Path>([...this.tree.keys(), ...this._cacheMap.keys()]).values()];
  }

  get root(): DirEntry { return this._root; }

  get(path: string): FileEntry | null {
    const normalizedPath = this._normalizePath(path);

    return this._cacheMap.get(normalizedPath) || this.tree.get(normalizedPath) || null;
  }
  has(path: string) {
    return this.get(path) != null;
  }
  set(entry: FileEntry) {
    return this._cacheMap.set(entry.path, entry);
  }

  exists(path: string): boolean {
    return this.has(path);
  }

  read(path: string): Buffer | null {
    const entry = this.get(path);

    return entry ? entry.content : null;
  }

  getDir(path: string): DirEntry {
    let dir: DirEntry = this.root;
    split(this._normalizePath(path)).slice(1).forEach(fragment => {
      dir = dir.dir(fragment);
    });

    return dir;
  }

  visit(visitor: FileVisitor) {
    try {
      this.files.forEach(path => visitor(path, this.get(path)));
    } catch (e) {
      if (e !== FileVisitorCancelToken) {
        throw e;
      }
    }
  }

  beginUpdate(path: string): UpdateRecorder {
    const entry = this.get(path);
    if (!entry) {
      throw new FileDoesNotExistException(path);
    }

    return new UpdateRecorderBase(entry);
  }

  commitUpdate(record: UpdateRecorder) {
    if (record instanceof UpdateRecorderBase) {
      const path = record.path;
      const entry = this.get(path);
      if (!entry) {
        throw new ContentHasMutatedException(path);
      } else {
        const newContent = record.apply(entry.content);
        this.overwrite(path, newContent);
      }
    } else {
      throw new InvalidUpdateRecordException();
    }
  }

  overwrite(path: string, content: Buffer | string) {
    const normalizedTo = this._normalizePath(path);
    if (typeof content == 'string') {
      content = new Buffer(content, 'utf-8');
    }
    const maybeEntry = this.get(normalizedTo);
    if (maybeEntry && maybeEntry.content.equals(content)) {
      return;
    }
    this._overwrite(normalizedTo, content);
  }
  create(path: string, content: Buffer | string): void {
    const normalizedTo = this._normalizePath(path);
    if (typeof content == 'string') {
      content = new Buffer(content);
    }
    this._create(normalizedTo, content);
  }
  rename(path: string, to: string): void {
    const normalizedPath = this._normalizePath(path);
    const normalizedTo = this._normalizePath(to);
    if (normalizedPath === normalizedTo) {
      // Nothing to do.
      return;
    }
    this._rename(normalizedPath, normalizedTo);
  }

  delete(path: string): void {
    this._delete(this._normalizePath(path));
  }

  protected _overwrite(path: Path, content: Buffer, action?: Action) {
    if (!this.has(path)) {
      throw new FileDoesNotExistException(path);
    }
    // Update the action buffer.
    if (action) {
      this._actions.push(action);
    } else {
      this._actions.overwrite(path, content);
    }
    this.set(new SimpleFileEntry(path, content));
  }
  protected _create(path: Path, content: Buffer, action?: Action) {
    if (this._cacheMap.has(path)) {
      throw new FileAlreadyExistException(path);
    }

    if (action) {
      this._actions.push(action);
    } else {
      this._actions.create(path, content);
    }
    this.set(new SimpleFileEntry(path, content as Buffer));
  }
  protected _rename(path: Path, to: Path, action?: Action, force = false) {
    const entry = this.get(path);
    if (!entry) {
      throw new FileDoesNotExistException(path);
    }
    if (this._cacheMap.has(to) && !force) {
      throw new FileAlreadyExistException(to);
    }

    if (action) {
      this._actions.push(action);
    } else {
      this._actions.rename(path, to);
    }

    this.set(new SimpleFileEntry(to, entry.content));
    this._cacheMap.delete(path);
  }
  protected _delete(path: Path, action?: Action) {
    if (!this.has(path)) {
      throw new FileDoesNotExistException(path);
    }

    if (action) {
      this._actions.push(action);
    } else {
      this._actions.delete(path);
    }
    this._cacheMap.delete(path);
  }


  apply(action: Action, strategy: MergeStrategy) {
    if (this._actions.has(action)) {
      return;
    }
    switch (action.kind) {
      case 'o':
        // Update the action buffer.
        this._overwrite(action.path, action.content, action);
        break;

      case 'c':
        if (this._cacheMap.has(action.path)) {
          switch (strategy) {
            case MergeStrategy.Error: throw new MergeConflictException(action.path);
            case MergeStrategy.Overwrite:
              this._overwrite(action.path, action.content, action);
              break;
          }
        } else {
          this._create(action.path, action.content, action);
        }
        break;

      case 'r':
        const force = (strategy & MergeStrategy.AllowOverwriteConflict) != 0;
        this._rename(action.path, action.to, action, force);
        break;

      case 'd': this._delete(action.path, action); break;

      default: throw new UnknownActionException(action);
    }
  }

  // Returns an ordered list of Action to get this host.
  get actions(): Action[] {
    return [...this._actions];
  }

  /**
   * Allow subclasses to copy to a tree their own properties.
   * @return {Tree}
   * @private
   */
  protected _copyTo<T extends VirtualTree>(tree: T): void {
    tree._tree = new Map(this.tree);
    this._actions.forEach(action => tree._actions.push(action));
    [...this._cacheMap.entries()].forEach(([path, entry]) => {
      tree._cacheMap.set(path, entry);
    });
  }

  branch(): Tree {
    const newTree = new VirtualTree();
    this._copyTo(newTree);

    return newTree;
  }

  // Creates a new host from 2 hosts.
  merge(other: Tree, strategy: MergeStrategy = MergeStrategy.Default) {
    other.actions.forEach(action => this.apply(action, strategy));
  }

  optimize() {
    // This destroys the history. Hope you know what you're doing.
    this._actions.optimize();
  }

  static branch(tree: Tree) {
    return tree.branch();
  }

  static merge(tree: Tree, other: Tree, strategy: MergeStrategy = MergeStrategy.Default): Tree {
    const newTree = tree.branch();
    newTree.merge(other, strategy);

    return newTree;
  }

  static optimize(tree: Tree) {
    const newTree = (tree as VirtualTree).branch() as VirtualTree;
    newTree.optimize();

    return newTree;
  }
}
