/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as fs from 'fs';
import { basename, dirname, join, sep } from 'path';
import * as ts from 'typescript';
import { WebpackResourceLoader } from './resource_loader';


export interface OnErrorFn {
  (message: string): void;
}


const dev = Math.floor(Math.random() * 10000);


export class VirtualStats implements fs.Stats {
  protected _ctime = new Date();
  protected _mtime = new Date();
  protected _atime = new Date();
  protected _btime = new Date();
  protected _dev = dev;
  protected _ino = Math.floor(Math.random() * 100000);
  protected _mode = parseInt('777', 8);  // RWX for everyone.
  protected _uid = Number(process.env['UID']) || 0;
  protected _gid = Number(process.env['GID']) || 0;

  constructor(protected _path: string) {}

  isFile() { return false; }
  isDirectory() { return false; }
  isBlockDevice() { return false; }
  isCharacterDevice() { return false; }
  isSymbolicLink() { return false; }
  isFIFO() { return false; }
  isSocket() { return false; }

  get dev() { return this._dev; }
  get ino() { return this._ino; }
  get mode() { return this._mode; }
  get nlink() { return 1; }  // Default to 1 hard link.
  get uid() { return this._uid; }
  get gid() { return this._gid; }
  get rdev() { return 0; }
  get size() { return 0; }
  get blksize() { return 512; }
  get blocks() { return Math.ceil(this.size / this.blksize); }
  get atime() { return this._atime; }
  get atimeMs() { return this._atime.getTime(); }
  get mtime() { return this._mtime; }
  get mtimeMs() { return this._mtime.getTime(); }
  get ctime() { return this._ctime; }
  get ctimeMs() { return this._ctime.getTime(); }
  get birthtime() { return this._btime; }
  get birthtimeMs() { return this._btime.getTime(); }
}

export class VirtualDirStats extends VirtualStats {
  constructor(_fileName: string) {
    super(_fileName);
  }

  isDirectory() { return true; }

  get size() { return 1024; }
}

export class VirtualFileStats extends VirtualStats {
  private _sourceFile: ts.SourceFile | null;
  constructor(_fileName: string, private _content: string) {
    super(_fileName);
  }

  get content() { return this._content; }
  set content(v: string) {
    this._content = v;
    this._mtime = new Date();
    this._sourceFile = null;
  }
  setSourceFile(sourceFile: ts.SourceFile) {
    this._sourceFile = sourceFile;
  }
  getSourceFile(languageVersion: ts.ScriptTarget, setParentNodes: boolean) {
    if (!this._sourceFile) {
      this._sourceFile = ts.createSourceFile(
        this._path,
        this._content,
        languageVersion,
        setParentNodes);
    }

    return this._sourceFile;
  }

  isFile() { return true; }

  get size() { return this._content.length; }
}


export class WebpackCompilerHost implements ts.CompilerHost {
  private _delegate: ts.CompilerHost;
  private _files: {[path: string]: VirtualFileStats | null} = Object.create(null);
  private _directories: {[path: string]: VirtualDirStats | null} = Object.create(null);

  private _changedFiles: {[path: string]: boolean} = Object.create(null);
  private _changedDirs: {[path: string]: boolean} = Object.create(null);

  private _basePath: string;
  private _setParentNodes: boolean;

  private _cache = false;
  private _resourceLoader?: WebpackResourceLoader | undefined;

  constructor(private _options: ts.CompilerOptions, basePath: string) {
    this._setParentNodes = true;
    this._delegate = ts.createCompilerHost(this._options, this._setParentNodes);
    this._basePath = this._normalizePath(basePath);
  }

  private _normalizePath(path: string) {
    return path.replace(/\\/g, '/');
  }

  denormalizePath(path: string) {
    return path.replace(/\//g, sep);
  }

  resolve(path: string) {
    path = this._normalizePath(path);
    if (path[0] == '.') {
      return this._normalizePath(join(this.getCurrentDirectory(), path));
    } else if (path[0] == '/' || path.match(/^\w:\//)) {
      return path;
    } else {
      return this._normalizePath(join(this._basePath, path));
    }
  }

  private _setFileContent(fileName: string, content: string) {
    this._files[fileName] = new VirtualFileStats(fileName, content);

    let p = dirname(fileName);
    while (p && !this._directories[p]) {
      this._directories[p] = new VirtualDirStats(p);
      this._changedDirs[p] = true;
      p = dirname(p);
    }

    this._changedFiles[fileName] = true;
  }

  get dirty() {
    return Object.keys(this._changedFiles).length > 0;
  }

  enableCaching() {
    this._cache = true;
  }

  resetChangedFileTracker() {
    this._changedFiles = Object.create(null);
    this._changedDirs = Object.create(null);
  }

  getChangedFilePaths(): string[] {
    return Object.keys(this._changedFiles);
  }

  getNgFactoryPaths(): string[] {
    return Object.keys(this._files)
      .filter(fileName => fileName.endsWith('.ngfactory.js') || fileName.endsWith('.ngstyle.js'))
      // These paths are used by the virtual file system decorator so we must denormalize them.
      .map((path) => this.denormalizePath(path));
  }

  invalidate(fileName: string): void {
    const fullPath = this.resolve(fileName);

    if (fullPath in this._files) {
      this._files[fullPath] = null;
    } else {
      for (const file in this._files) {
        if (file.startsWith(fullPath + '/')) {
          this._files[file] = null;
        }
      }
    }
    if (this.fileExists(fullPath)) {
      this._changedFiles[fullPath] = true;
    }
  }

  fileExists(fileName: string, delegate = true): boolean {
    fileName = this.resolve(fileName);

    return this._files[fileName] != null || (delegate && this._delegate.fileExists(fileName));
  }

  readFile(fileName: string): string | undefined {
    fileName = this.resolve(fileName);

    const stats = this._files[fileName];
    if (!stats) {
      const result = this._delegate.readFile(fileName);
      if (result !== undefined) {
        if (this._cache) {
          this._setFileContent(fileName, result);
        }
      }

      return result;
    }

    return stats.content;
  }

  // Does not delegate, use with `fileExists/directoryExists()`.
  stat(path: string): VirtualStats {
    path = this.resolve(path);
    const stats = this._files[path] || this._directories[path];
    if (!stats) {
      throw new Error(`File not found: ${JSON.stringify(path)}`);
    }

    return stats;
  }

  directoryExists(directoryName: string, delegate = true): boolean {
    directoryName = this.resolve(directoryName);

    return (this._directories[directoryName] != null)
            || (delegate
                && this._delegate.directoryExists != undefined
                && this._delegate.directoryExists(directoryName));
  }

  getFiles(path: string): string[] {
    path = this.resolve(path);

    return Object.keys(this._files)
      .filter(fileName => dirname(fileName) == path)
      .map(path => basename(path));
  }

  getDirectories(path: string): string[] {
    path = this.resolve(path);
    const subdirs = Object.keys(this._directories)
      .filter(fileName => dirname(fileName) == path)
      .map(path => basename(path));

    let delegated: string[];
    try {
      delegated = this._delegate.getDirectories(path);
    } catch (e) {
      delegated = [];
    }

    return delegated.concat(subdirs);
  }

  getSourceFile(fileName: string, languageVersion: ts.ScriptTarget, _onError?: OnErrorFn) {
    fileName = this.resolve(fileName);

    let stats = this._files[fileName];
    if (!stats) {
      const content = this.readFile(fileName);

      if (!this._cache && content) {
        return ts.createSourceFile(fileName, content, languageVersion, this._setParentNodes);
      } else {
        stats = this._files[fileName];
        if (!stats) {
          // If cache is turned on and the file exists, the readFile call will have populated stats.
          // Empty stats at this point mean the file doesn't exist at and so we should return
          // undefined.
          return undefined;
        }
      }
    }

    return stats.getSourceFile(languageVersion, this._setParentNodes);
  }

  get getCancellationToken() {
    return this._delegate.getCancellationToken;
  }

  getDefaultLibFileName(options: ts.CompilerOptions) {
    return this._delegate.getDefaultLibFileName(options);
  }

  // This is due to typescript CompilerHost interface being weird on writeFile. This shuts down
  // typings in WebStorm.
  get writeFile() {
    return (
      fileName: string,
      data: string, _writeByteOrderMark: boolean,
      _onError?: (message: string) => void,
      _sourceFiles?: ReadonlyArray<ts.SourceFile>,
    ): void => {
      fileName = this.resolve(fileName);
      this._setFileContent(fileName, data);
    };
  }

  getCurrentDirectory(): string {
    return this._basePath !== null ? this._basePath : this._delegate.getCurrentDirectory();
  }

  getCanonicalFileName(fileName: string): string {
    fileName = this.resolve(fileName);

    return this._delegate.getCanonicalFileName(fileName);
  }

  useCaseSensitiveFileNames(): boolean {
    return this._delegate.useCaseSensitiveFileNames();
  }

  getNewLine(): string {
    return this._delegate.getNewLine();
  }

  setResourceLoader(resourceLoader: WebpackResourceLoader) {
    this._resourceLoader = resourceLoader;
  }

  readResource(fileName: string) {
    if (this._resourceLoader) {
      // These paths are meant to be used by the loader so we must denormalize them.
      const denormalizedFileName = this.denormalizePath(fileName);

      return this._resourceLoader.get(denormalizedFileName);
    } else {
      return this.readFile(fileName);
    }
  }
}
