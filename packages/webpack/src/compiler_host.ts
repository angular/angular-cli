import * as ts from 'typescript';
import {basename, dirname} from 'path';
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
  private _changed = false;

  constructor(private _options: ts.CompilerOptions, private _setParentNodes = true) {
    this._delegate = ts.createCompilerHost(this._options, this._setParentNodes);
  }

  private _setFileContent(fileName: string, content: string) {
    this._files[fileName] = new VirtualFileStats(fileName, content);

    let p = dirname(fileName);
    while (p && !this._directories[p]) {
      this._directories[p] = new VirtualDirStats(p);
      p = dirname(p);
    }

    this._changed = true;
  }

  populateWebpackResolver(resolver: any) {
    const fs = resolver.fileSystem;
    if (!this._changed) {
      return;
    }

    for (const fileName of Object.keys(this._files)) {
      const stats = this._files[fileName];
      fs._statStorage.data[fileName] = [null, stats];
      fs._readFileStorage.data[fileName] = [null, stats.content];
    }
    for (const path of Object.keys(this._directories)) {
      const stats = this._directories[path];
      const dirs = this.getDirectories(path);
      const files = this.getFiles(path);
      fs._statStorage.data[path] = [null, stats];
      fs._readdirStorage.data[path] = [null, files.concat(dirs)];
    }

    this._changed = false;
  }

  fileExists(fileName: string): boolean {
    return fileName in this._files || this._delegate.fileExists(fileName);
  }

  readFile(fileName: string): string {
    return (fileName in this._files)
         ? this._files[fileName].content
         : this._delegate.readFile(fileName);
  }

  directoryExists(directoryName: string): boolean {
    return (directoryName in this._directories) || this._delegate.directoryExists(directoryName);
  }

  getFiles(path: string): string[] {
    return Object.keys(this._files)
      .filter(fileName => dirname(fileName) == path)
      .map(path => basename(path));
  }

  getDirectories(path: string): string[] {
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

  getSourceFile(fileName: string, languageVersion: ts.ScriptTarget, onError?: OnErrorFn) {
    if (!(fileName in this._files)) {
      return this._delegate.getSourceFile(fileName, languageVersion, onError);
    }

    return this._files[fileName].getSourceFile(languageVersion, this._setParentNodes);
  }

  getCancellationToken() {
    return this._delegate.getCancellationToken();
  }

  getDefaultLibFileName(options: ts.CompilerOptions) {
    return this._delegate.getDefaultLibFileName(options);
  }

  writeFile(fileName: string, data: string, writeByteOrderMark: boolean, onError?: OnErrorFn) {
    this._setFileContent(fileName, data);
  }

  getCurrentDirectory(): string {
    return this._delegate.getCurrentDirectory();
  }

  getCanonicalFileName(fileName: string): string {
    return this._delegate.getCanonicalFileName(fileName);
  }

  useCaseSensitiveFileNames(): boolean {
    return this._delegate.useCaseSensitiveFileNames();
  }

  getNewLine(): string {
    return this._delegate.getNewLine();
  }
}
