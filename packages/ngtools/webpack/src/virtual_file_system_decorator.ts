/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { FileDoesNotExistException, Path, getSystemPath, normalize } from '@angular-devkit/core';
import { Stats } from 'fs';
import { InputFileSystem } from 'webpack';
import { WebpackCompilerHost } from './compiler_host';
import { NodeWatchFileSystemInterface } from './webpack';
import { isWebpackFiveOrHigher } from './webpack-version';

export const NodeWatchFileSystem: NodeWatchFileSystemInterface = require(
  'webpack/lib/node/NodeWatchFileSystem');

// NOTE: @types/webpack InputFileSystem is missing some methods
export class VirtualFileSystemDecorator implements InputFileSystem {
  constructor(
    private _inputFileSystem: InputFileSystem,
    private _webpackCompilerHost: WebpackCompilerHost,
  ) { }

  getWebpackCompilerHost() {
    return this._webpackCompilerHost;
  }

  getVirtualFilesPaths() {
    return this._webpackCompilerHost.getNgFactoryPaths();
  }

  stat(path: string, callback: (err: Error, result: Stats) => void): void {
    const result = this._webpackCompilerHost.stat(path);
    if (result) {
      // tslint:disable-next-line:no-any
      callback(null as any, result);
    } else {
      // tslint:disable-next-line:no-any
      callback(new FileDoesNotExistException(path), undefined as any);
    }
  }

  readdir(path: string, callback: (err: Error, result: string[]) => void): void {
    // tslint:disable-next-line: no-any
    (this._inputFileSystem as any).readdir(path, callback);
  }

  readFile(path: string, callback: (err: Error, contents: Buffer) => void): void {
    try {
      // tslint:disable-next-line:no-any
      callback(null as any, this._webpackCompilerHost.readFileBuffer(path));
    } catch (e) {
      // tslint:disable-next-line:no-any
      callback(e, undefined as any);
    }
  }

  readJson(path: string, callback: (err: Error, result: unknown) => void): void {
    // tslint:disable-next-line:no-any
    (this._inputFileSystem as any).readJson(path, callback);
  }

  readlink(path: string, callback: (err: Error | null | undefined, linkString: string) => void): void {
    this._inputFileSystem.readlink(path, callback);
  }

  statSync(path: string): Stats {
    const stats = this._webpackCompilerHost.stat(path);
    if (stats === null) {
      throw new FileDoesNotExistException(path);
    }

    return stats;
  }

  readdirSync(path: string): string[] {
    // tslint:disable-next-line:no-any
    return (this._inputFileSystem as any).readdirSync(path);
  }

  readFileSync(path: string): Buffer {
    return this._webpackCompilerHost.readFileBuffer(path);
  }

  readJsonSync(path: string): string {
    // tslint:disable-next-line:no-any
    return (this._inputFileSystem as any).readJsonSync(path);
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
      // tslint:disable-next-line:no-any
      (this._inputFileSystem as any).purge(changes);
    }
  }
}

export class VirtualWatchFileSystemDecorator extends NodeWatchFileSystem {
  constructor(
    private _virtualInputFileSystem: VirtualFileSystemDecorator,
    private _replacements?: Map<Path, Path> | ((path: Path) => Path),
  ) {
    super(_virtualInputFileSystem);
  }

  mapReplacements(
    original: Iterable<string>,
    reverseReplacements: Map<string, string>,
  ): Iterable<string> {
    if (!this._replacements) {
      return original;
    }
    const replacements = this._replacements;

    return [...original].map(file => {
      if (typeof replacements === 'function') {
        const replacement = getSystemPath(replacements(normalize(file)));
        if (replacement !== file) {
          reverseReplacements.set(replacement, file);
        }

        return replacement;
      } else {
        const replacement = replacements.get(normalize(file));
        if (replacement) {
          const fullReplacement = getSystemPath(replacement);
          reverseReplacements.set(fullReplacement, file);

          return fullReplacement;
        } else {
          return file;
        }
      }
    });
  }

  reverseTimestamps<T>(
    map: Map<string, T>,
    reverseReplacements: Map<string, string>,
  ): Map<string, T> {
    for (const entry of Array.from(map.entries())) {
      const original = reverseReplacements.get(entry[0]);
      if (original) {
        map.set(original, entry[1]);
        map.delete(entry[0]);
      }
    }

    return map;
  }

  createWebpack4Watch() {
    return (
      files: Iterable<string>,
      dirs: Iterable<string>,
      missing: Iterable<string>,
      startTime: number,
      options: {},
      callback: Parameters<NodeWatchFileSystemInterface['watch']>[5],
      callbackUndelayed: (filename: string, timestamp: number) => void,
    ): ReturnType<NodeWatchFileSystemInterface['watch']> => {
      const reverseReplacements = new Map<string, string>();

      const newCallbackUndelayed = (filename: string, timestamp: number) => {
        const original = reverseReplacements.get(filename);
        if (original) {
          this._virtualInputFileSystem.purge(original);
          callbackUndelayed(original, timestamp);
        } else {
          callbackUndelayed(filename, timestamp);
        }
      };

      const newCallback: Parameters<NodeWatchFileSystemInterface['watch']>[5] = (
        err: Error | null,
        filesModified: string[],
        contextModified: string[],
        missingModified: string[],
        fileTimestamps: Map<string, number>,
        contextTimestamps: Map<string, number>,
      ) => {
        // Update fileTimestamps with timestamps from virtual files.
        const virtualFilesStats = this._virtualInputFileSystem.getVirtualFilesPaths()
          .map((fileName) => ({
            path: fileName,
            mtime: +this._virtualInputFileSystem.statSync(fileName).mtime,
          }));
        virtualFilesStats.forEach(stats => fileTimestamps.set(stats.path, +stats.mtime));
        callback(
          err,
          filesModified.map(value => reverseReplacements.get(value) || value),
          contextModified.map(value => reverseReplacements.get(value) || value),
          missingModified.map(value => reverseReplacements.get(value) || value),
          this.reverseTimestamps(fileTimestamps, reverseReplacements),
          this.reverseTimestamps(contextTimestamps, reverseReplacements),
        );
      };

      const watcher = super.watch(
        this.mapReplacements(files, reverseReplacements),
        this.mapReplacements(dirs, reverseReplacements),
        this.mapReplacements(missing, reverseReplacements),
        startTime,
        options,
        newCallback,
        newCallbackUndelayed,
      );

      return {
        close: () => watcher.close(),
        pause: () => watcher.pause(),
        getFileTimestamps: () =>
          this.reverseTimestamps(watcher.getFileTimestamps(), reverseReplacements),
        getContextTimestamps: () =>
          this.reverseTimestamps(watcher.getContextTimestamps(), reverseReplacements),
      };
    };
  }

  createWebpack5Watch() {
    return (
      files: Iterable<string>,
      dirs: Iterable<string>,
      missing: Iterable<string>,
      startTime: number,
      options: {},
      callback: Parameters<NodeWatchFileSystemInterface['watch']>[5],
      callbackUndelayed: (filename: string, timestamp: number) => void,
    ): ReturnType<NodeWatchFileSystemInterface['watch']> => {
      const reverseReplacements = new Map<string, string>();

      const newCallbackUndelayed = (filename: string, timestamp: number) => {
        const original = reverseReplacements.get(filename);
        if (original) {
          this._virtualInputFileSystem.purge(original);
          callbackUndelayed(original, timestamp);
        } else {
          callbackUndelayed(filename, timestamp);
        }
      };

      const newCallback = (
        err: Error,
        // tslint:disable-next-line: no-any
        fileTimeInfoEntries: Map<string, any>,
        // tslint:disable-next-line: no-any
        contextTimeInfoEntries: Map<string, any>,
        missing: Set<string>,
        removals: Set<string>,
      ) => {
        // Update fileTimestamps with timestamps from virtual files.
        const virtualFilesStats = this._virtualInputFileSystem.getVirtualFilesPaths()
          .map((fileName) => ({
            path: fileName,
            mtime: +this._virtualInputFileSystem.statSync(fileName).mtime,
          }));
        virtualFilesStats.forEach(stats => fileTimeInfoEntries.set(stats.path, +stats.mtime));
        callback(
          err,
          this.reverseTimestamps(fileTimeInfoEntries, reverseReplacements),
          this.reverseTimestamps(contextTimeInfoEntries, reverseReplacements),
          new Set([...missing].map(value => reverseReplacements.get(value) || value)),
          new Set([...removals].map(value => reverseReplacements.get(value) || value)),
        );
      };

      const watcher = super.watch(
        this.mapReplacements(files, reverseReplacements),
        this.mapReplacements(dirs, reverseReplacements),
        this.mapReplacements(missing, reverseReplacements),
        startTime,
        options,
        newCallback,
        newCallbackUndelayed,
      );

      return {
        close: () => watcher.close(),
        pause: () => watcher.pause(),
        getFileTimeInfoEntries: () =>
          this.reverseTimestamps(watcher.getFileTimeInfoEntries(), reverseReplacements),
        getContextTimeInfoEntries: () =>
          this.reverseTimestamps(watcher.getContextTimeInfoEntries(), reverseReplacements),
      };
    };
  }

  // tslint:disable-next-line: no-any
  watch = isWebpackFiveOrHigher() ? this.createWebpack5Watch() : this.createWebpack4Watch() as any;
}
