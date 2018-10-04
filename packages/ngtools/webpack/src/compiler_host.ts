/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {
  Path,
  getSystemPath,
  isAbsolute,
  join,
  normalize,
  virtualFs,
} from '@angular-devkit/core';
import { Stats } from 'fs';
import * as ts from 'typescript';
import { WebpackResourceLoader } from './resource_loader';


export interface OnErrorFn {
  (message: string): void;
}


const dev = Math.floor(Math.random() * 10000);


export class WebpackCompilerHost implements ts.CompilerHost {
  private _syncHost: virtualFs.SyncDelegateHost;
  private _changedFiles = new Set<string>();
  private _basePath: Path;
  private _resourceLoader?: WebpackResourceLoader;

  constructor(
    private _options: ts.CompilerOptions,
    basePath: string,
    host: virtualFs.Host,
  ) {
    this._syncHost = new virtualFs.SyncDelegateHost(new virtualFs.CordHost(host));
    this._basePath = normalize(basePath);
  }

  private get virtualFiles(): Path[] {
    return (this._syncHost.delegate as virtualFs.CordHost)
      .records()
      .filter(record => record.kind === 'create')
      .map((record: virtualFs.CordHostCreate) => record.path);
  }

  denormalizePath(path: string) {
    return getSystemPath(normalize(path));
  }

  resolve(path: string): Path {
    const p = normalize(path);
    if (isAbsolute(p)) {
      return p;
    } else {
      return join(this._basePath, p);
    }
  }

  resetChangedFileTracker() {
    this._changedFiles.clear();
  }

  getChangedFilePaths(): string[] {
    return [...this._changedFiles];
  }

  getNgFactoryPaths(): string[] {
    return this.virtualFiles
      .filter(fileName => fileName.endsWith('.ngfactory.js') || fileName.endsWith('.ngstyle.js'))
      // These paths are used by the virtual file system decorator so we must denormalize them.
      .map(path => this.denormalizePath(path));
  }

  invalidate(fileName: string): void {
    const fullPath = this.resolve(fileName);

    if (this.fileExists(fileName)) {
      this._changedFiles.add(fullPath);
    }
  }

  fileExists(fileName: string, delegate = true): boolean {
    const p = this.resolve(fileName);

    try {
      const exists = this._syncHost.isFile(p);
      if (delegate) {
        return exists;
      } else if (exists) {
        const backend = new virtualFs.SyncDelegateHost(
          (this._syncHost.delegate as virtualFs.CordHost).backend as virtualFs.Host,
        );

        return !backend.isFile(p);
      }
    } catch { }

    return false;
  }

  readFile(fileName: string): string | undefined {
    const filePath = this.resolve(fileName);

    try {
      return virtualFs.fileBufferToString(this._syncHost.read(filePath));
    } catch {
      return undefined;
    }
  }

  readFileBuffer(fileName: string): Buffer {
    const filePath = this.resolve(fileName);

    return Buffer.from(this._syncHost.read(filePath));
  }

  private _makeStats(stats: virtualFs.Stats<Partial<Stats>>): Stats {
    return {
      isFile: () => stats.isFile(),
      isDirectory: () => stats.isDirectory(),
      isBlockDevice: () => stats.isBlockDevice && stats.isBlockDevice() || false,
      isCharacterDevice: () => stats.isCharacterDevice && stats.isCharacterDevice() || false,
      isFIFO: () => stats.isFIFO && stats.isFIFO() || false,
      isSymbolicLink: () => stats.isSymbolicLink && stats.isSymbolicLink() || false,
      isSocket: () => stats.isSocket && stats.isSocket() || false,
      dev: stats.dev === undefined ? dev : stats.dev,
      ino: stats.ino === undefined ? Math.floor(Math.random() * 100000) : stats.ino,
      mode: stats.mode === undefined ? parseInt('777', 8) : stats.mode,
      nlink: stats.nlink === undefined ? 1 : stats.nlink,
      uid: stats.uid || 0,
      gid: stats.gid || 0,
      rdev: stats.rdev || 0,
      size: stats.size,
      blksize: stats.blksize === undefined ? 512 : stats.blksize,
      blocks: stats.blocks === undefined ? Math.ceil(stats.size / 512) : stats.blocks,
      atime: stats.atime,
      atimeMs: stats.atime.getTime(),
      mtime: stats.mtime,
      mtimeMs: stats.mtime.getTime(),
      ctime: stats.ctime,
      ctimeMs: stats.ctime.getTime(),
      birthtime: stats.birthtime,
      birthtimeMs: stats.birthtime.getTime(),
    };
  }

  stat(path: string): Stats | null {
    const p = this.resolve(path);

    let stats: virtualFs.Stats<Partial<Stats>> | Stats | null = null;
    try {
      stats = this._syncHost.stat(p);
    } catch { }

    if (!stats) {
      return null;
    }

    if (stats instanceof Stats) {
      return stats;
    }

    return this._makeStats(stats);
  }

  directoryExists(directoryName: string): boolean {
    const p = this.resolve(directoryName);

    try {
      return this._syncHost.isDirectory(p);
    } catch {
      return false;
    }
  }

  getDirectories(path: string): string[] {
    const p = this.resolve(path);

    let delegated: string[];
    try {
      delegated = this._syncHost.list(p).filter(x => {
        try {
          return this._syncHost.isDirectory(join(p, x));
        } catch {
          return false;
        }
      });
    } catch {
      delegated = [];
    }

    return delegated;
  }

  getSourceFile(fileName: string, languageVersion: ts.ScriptTarget, onError?: OnErrorFn) {
    try {
      const content = this.readFile(fileName);
      if (content != undefined) {
        return ts.createSourceFile(workaroundResolve(fileName), content, languageVersion, true);
      }
    } catch (e) {
      if (onError) {
        onError(e.message);
      }
    }

    return undefined;
  }

  getDefaultLibFileName(options: ts.CompilerOptions) {
    return ts.createCompilerHost(options).getDefaultLibFileName(options);
  }

  // This is due to typescript CompilerHost interface being weird on writeFile. This shuts down
  // typings in WebStorm.
  get writeFile() {
    return (
      fileName: string,
      data: string,
      _writeByteOrderMark: boolean,
      onError?: (message: string) => void,
      _sourceFiles?: ReadonlyArray<ts.SourceFile>,
    ): void => {
      const p = this.resolve(fileName);

      try {
        this._syncHost.write(p, virtualFs.stringToFileBuffer(data));
      } catch (e) {
        if (onError) {
          onError(e.message);
        }
      }
    };
  }

  getCurrentDirectory(): string {
    return this._basePath;
  }

  getCanonicalFileName(fileName: string): string {
    const path = this.resolve(fileName);

    return this.useCaseSensitiveFileNames ? path : path.toLowerCase();
  }

  useCaseSensitiveFileNames(): boolean {
    return !process.platform.startsWith('win32');
  }

  getNewLine(): string {
    return '\n';
  }

  setResourceLoader(resourceLoader: WebpackResourceLoader) {
    this._resourceLoader = resourceLoader;
  }

  readResource(fileName: string) {
    if (this._resourceLoader) {
      // These paths are meant to be used by the loader so we must denormalize them.
      const denormalizedFileName = this.denormalizePath(normalize(fileName));

      return this._resourceLoader.get(denormalizedFileName);
    } else {
      return this.readFile(fileName);
    }
  }

  trace(message: string) {
    console.log(message);
  }
}


// `TsCompilerAotCompilerTypeCheckHostAdapter` in @angular/compiler-cli seems to resolve module
// names directly via `resolveModuleName`, which prevents full Path usage.
// To work around this we must provide the same path format as TS internally uses in
// the SourceFile paths.
export function workaroundResolve(path: Path | string) {
  return getSystemPath(normalize(path)).replace(/\\/g, '/');
}
