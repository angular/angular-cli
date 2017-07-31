import * as ts from 'typescript';
import {basename, dirname, join} from 'path';
import * as fs from 'fs';


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
  protected _uid = process.env['UID'] || 0;
  protected _gid = process.env['GID'] || 0;

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
  get mtime() { return this._mtime; }
  get ctime() { return this._ctime; }
  get birthtime() { return this._btime; }
}

export class VirtualDirStats extends VirtualStats {
  constructor(_fileName: string) {
    super(_fileName);
  }

  isDirectory() { return true; }

  get size() { return 1024; }
}

export class VirtualFileStats extends VirtualStats {
  private _sourceFile: ts.SourceFile;
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
  private _files: {[path: string]: VirtualFileStats} = Object.create(null);
  private _directories: {[path: string]: VirtualDirStats} = Object.create(null);

  private _changedFiles: {[path: string]: boolean} = Object.create(null);
  private _changedDirs: {[path: string]: boolean} = Object.create(null);

  private _basePath: string;
  private _setParentNodes: boolean;

  private _cache = false;

  constructor(private _options: ts.CompilerOptions, basePath: string) {
    this._setParentNodes = true;
    this._delegate = ts.createCompilerHost(this._options, this._setParentNodes);
    this._basePath = this._normalizePath(basePath);
  }

  private _normalizePath(path: string) {
    return path.replace(/\\/g, '/');
  }

  private _resolve(path: string) {
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

  populateWebpackResolver(resolver: any) {
    const fs = resolver.fileSystem;
    if (!this.dirty) {
      return;
    }

    /**
     * storageDataSetter is a temporary hack to address these two issues:
     * - https://github.com/angular/angular-cli/issues/7113
     * - https://github.com/angular/angular-cli/issues/7136
     *
     * This way we set values correctly in both a Map (enhanced-resove>=3.4.0) and
     * object (enhanced-resolve >= 3.1.0 <3.4.0).
     *
     * The right solution is to create a virtual filesystem by decorating the filesystem,
     * instead of injecting data into the private cache of the filesystem.
     *
     * Doing it the right way should fix other related bugs, but meanwhile we hack it since:
     * - it's affecting a lot of users.
     * - the real solution is non-trivial.
     */
    function storageDataSetter(data: Map<string, any> | {[k: string]: any}, k: string, v: any) {

      if (data instanceof Map) {
        data.set(k, v);
      } else {
        data[k] = v;
      }
    }



    const isWindows = process.platform.startsWith('win');
    for (const fileName of this.getChangedFilePaths()) {
      const stats = this._files[fileName];
      if (stats) {
        // If we're on windows, we need to populate with the proper path separator.
        const path = isWindows ? fileName.replace(/\//g, '\\') : fileName;
        // fs._statStorage.data[path] = [null, stats];
        // fs._readFileStorage.data[path] = [null, stats.content];
        storageDataSetter(fs._statStorage.data, path, [null, stats]);
        storageDataSetter(fs._readFileStorage.data, path, [null, stats.content]);
      } else {
        // Support removing files as well.
        const path = isWindows ? fileName.replace(/\//g, '\\') : fileName;
        // fs._statStorage.data[path] = [new Error(), null];
        // fs._readFileStorage.data[path] = [new Error(), null];
        storageDataSetter(fs._statStorage.data, path, [new Error(), null]);
        storageDataSetter(fs._readFileStorage.data, path, [new Error(), null]);
      }
    }
    for (const dirName of Object.keys(this._changedDirs)) {
      const stats = this._directories[dirName];
      const dirs = this.getDirectories(dirName);
      const files = this.getFiles(dirName);
      // If we're on windows, we need to populate with the proper path separator.
      const path = isWindows ? dirName.replace(/\//g, '\\') : dirName;
      // fs._statStorage.data[path] = [null, stats];
      // fs._readdirStorage.data[path] = [null, files.concat(dirs)];
      storageDataSetter(fs._statStorage.data, path, [null, stats]);
      storageDataSetter(fs._readFileStorage.data, path, [null, files.concat(dirs)]);
    }
  }

  resetChangedFileTracker() {
    this._changedFiles = Object.create(null);
    this._changedDirs = Object.create(null);
  }
  getChangedFilePaths(): string[] {
    return Object.keys(this._changedFiles);
  }

  invalidate(fileName: string): void {
    fileName = this._resolve(fileName);
    if (fileName in this._files) {
      this._files[fileName] = null;
      this._changedFiles[fileName] = true;
    }
  }

  fileExists(fileName: string): boolean {
    fileName = this._resolve(fileName);
    return this._files[fileName] != null || this._delegate.fileExists(fileName);
  }

  readFile(fileName: string): string {
    fileName = this._resolve(fileName);
    if (this._files[fileName] == null) {
      const result = this._delegate.readFile(fileName);
      if (result !== undefined && this._cache) {
        this._setFileContent(fileName, result);
        return result;
      } else {
        return result;
      }
    }
    return this._files[fileName].content;
  }

  directoryExists(directoryName: string): boolean {
    directoryName = this._resolve(directoryName);
    return (this._directories[directoryName] != null)
        || this._delegate.directoryExists(directoryName);
  }

  getFiles(path: string): string[] {
    path = this._resolve(path);
    return Object.keys(this._files)
      .filter(fileName => dirname(fileName) == path)
      .map(path => basename(path));
  }

  getDirectories(path: string): string[] {
    path = this._resolve(path);
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
    fileName = this._resolve(fileName);

    if (this._files[fileName] == null) {
      const content = this.readFile(fileName);
      if (!this._cache) {
        return ts.createSourceFile(fileName, content, languageVersion, this._setParentNodes);
      }
    }

    return this._files[fileName].getSourceFile(languageVersion, this._setParentNodes);
  }

  getCancellationToken() {
    return this._delegate.getCancellationToken();
  }

  getDefaultLibFileName(options: ts.CompilerOptions) {
    return this._delegate.getDefaultLibFileName(options);
  }

  // This is due to typescript CompilerHost interface being weird on writeFile. This shuts down
  // typings in WebStorm.
  get writeFile() {
    return (fileName: string, data: string, _writeByteOrderMark: boolean,
            _onError?: (message: string) => void, _sourceFiles?: ts.SourceFile[]): void => {
      fileName = this._resolve(fileName);
      this._setFileContent(fileName, data);
    };
  }

  getCurrentDirectory(): string {
    return this._basePath !== null ? this._basePath : this._delegate.getCurrentDirectory();
  }

  getCanonicalFileName(fileName: string): string {
    fileName = this._resolve(fileName);
    return this._delegate.getCanonicalFileName(fileName);
  }

  useCaseSensitiveFileNames(): boolean {
    return this._delegate.useCaseSensitiveFileNames();
  }

  getNewLine(): string {
    return this._delegate.getNewLine();
  }
}
