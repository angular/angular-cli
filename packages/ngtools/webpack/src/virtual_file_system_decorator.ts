/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Stats } from 'fs';
import { WebpackCompilerHost } from './compiler_host';
import { Callback, InputFileSystem, NodeWatchFileSystemInterface } from './webpack';

export const NodeWatchFileSystem: NodeWatchFileSystemInterface = require(
  'webpack/lib/node/NodeWatchFileSystem');

export class VirtualFileSystemDecorator implements InputFileSystem {
  constructor(
    private _inputFileSystem: InputFileSystem,
    private _webpackCompilerHost: WebpackCompilerHost,
  ) { }

  private _readFileSync(path: string): Buffer | null {
    if (this._webpackCompilerHost.fileExists(path)) {
      return this._webpackCompilerHost.readFileBuffer(path) || null;
    }

    return null;
  }

  private _statSync(path: string): Stats | null {
    if (this._webpackCompilerHost.fileExists(path)) {
      return this._webpackCompilerHost.stat(path);
    }

    return null;
  }

  getVirtualFilesPaths() {
    return this._webpackCompilerHost.getNgFactoryPaths();
  }

  stat(path: string, callback: Callback<Stats>): void {
    const result = this._statSync(path);
    if (result) {
      callback(null, result);
    } else {
      this._inputFileSystem.stat(path, callback);
    }
  }

  readdir(path: string, callback: Callback<string[]>): void {
    this._inputFileSystem.readdir(path, callback);
  }

  readFile(path: string, callback: Callback<string | Buffer>): void {
    const result = this._readFileSync(path);
    if (result) {
      callback(null, result);
    } else {
      this._inputFileSystem.readFile(path, callback);
    }
  }

  readJson(path: string, callback: Callback<{}>): void {
    this._inputFileSystem.readJson(path, callback);
  }

  readlink(path: string, callback: Callback<string>): void {
    this._inputFileSystem.readlink(path, callback);
  }

  statSync(path: string): Stats {
    const result = this._statSync(path);

    return result || this._inputFileSystem.statSync(path);
  }

  readdirSync(path: string): string[] {
    return this._inputFileSystem.readdirSync(path);
  }

  readFileSync(path: string): string | Buffer {
    const result = this._readFileSync(path);

    return result || this._inputFileSystem.readFileSync(path);
  }

  readJsonSync(path: string): string {
    return this._inputFileSystem.readJsonSync(path);
  }

  readlinkSync(path: string): string {
    return this._inputFileSystem.readlinkSync(path);
  }

  purge(changes?: string[] | string): void {
    if (typeof changes === 'string') {
      this._webpackCompilerHost.invalidate(changes);
    } else if (Array.isArray(changes)) {
      changes.forEach((fileName: string) => this._webpackCompilerHost.invalidate(fileName));
    }
    if (this._inputFileSystem.purge) {
      this._inputFileSystem.purge(changes);
    }
  }
}

export class VirtualWatchFileSystemDecorator extends NodeWatchFileSystem {
  constructor(private _virtualInputFileSystem: VirtualFileSystemDecorator) {
    super(_virtualInputFileSystem);
  }

  watch(
    files: any,  // tslint:disable-line:no-any
    dirs: any,  // tslint:disable-line:no-any
    missing: any,  // tslint:disable-line:no-any
    startTime: any,  // tslint:disable-line:no-any
    options: any,  // tslint:disable-line:no-any
    callback: any,  // tslint:disable-line:no-any
    callbackUndelayed: any,  // tslint:disable-line:no-any
  ) {
    const newCallback = (
      err: any,  // tslint:disable-line:no-any
      filesModified: any,  // tslint:disable-line:no-any
      contextModified: any,  // tslint:disable-line:no-any
      missingModified: any,  // tslint:disable-line:no-any
      fileTimestamps: { [k: string]: number },
      contextTimestamps: { [k: string]: number },
    ) => {
      // Update fileTimestamps with timestamps from virtual files.
      const virtualFilesStats = this._virtualInputFileSystem.getVirtualFilesPaths()
        .map((fileName) => ({
          path: fileName,
          mtime: +this._virtualInputFileSystem.statSync(fileName).mtime,
        }));
      virtualFilesStats.forEach(stats => fileTimestamps[stats.path] = +stats.mtime);
      callback(err, filesModified, contextModified, missingModified, fileTimestamps,
        contextTimestamps);
    };

    return super.watch(files, dirs, missing, startTime, options, newCallback, callbackUndelayed);
  }
}
