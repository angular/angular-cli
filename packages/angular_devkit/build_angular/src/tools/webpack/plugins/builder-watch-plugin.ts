/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Compiler } from 'webpack';

export type BuilderWatcherCallback = (
  events: Array<{ path: string; type: 'created' | 'modified' | 'deleted'; time?: number }>,
) => void;

export interface BuilderWatcherFactory {
  watch(
    files: Iterable<string>,
    directories: Iterable<string>,
    callback: BuilderWatcherCallback,
  ): { close(): void };
}

class TimeInfoMap extends Map<string, { safeTime: number; timestamp: number }> {
  update(path: string, timestamp: number): void {
    this.set(path, Object.freeze({ safeTime: timestamp, timestamp }));
  }

  toTimestamps(): Map<string, number> {
    const timestamps = new Map<string, number>();
    for (const [file, entry] of this) {
      timestamps.set(file, entry.timestamp);
    }

    return timestamps;
  }
}

// Extract watch related types from the Webpack compiler type since they are not directly exported
type WebpackWatchFileSystem = Compiler['watchFileSystem'];
type WatchOptions = Parameters<WebpackWatchFileSystem['watch']>[4];
type WatchCallback = Parameters<WebpackWatchFileSystem['watch']>[5];

class BuilderWatchFileSystem implements WebpackWatchFileSystem {
  constructor(
    private readonly watcherFactory: BuilderWatcherFactory,
    private readonly inputFileSystem: Compiler['inputFileSystem'],
  ) {}

  watch(
    files: Iterable<string>,
    directories: Iterable<string>,
    missing: Iterable<string>,
    startTime: number,
    _options: WatchOptions,
    callback: WatchCallback,
    callbackUndelayed?: (file: string, time: number) => void,
  ): ReturnType<WebpackWatchFileSystem['watch']> {
    const watchedFiles = new Set(files);
    const watchedDirectories = new Set(directories);
    const watchedMissing = new Set(missing);

    const timeInfo = new TimeInfoMap();
    for (const file of files) {
      timeInfo.update(file, startTime);
    }
    for (const directory of directories) {
      timeInfo.update(directory, startTime);
    }

    const watcher = this.watcherFactory.watch(files, directories, (events) => {
      if (events.length === 0) {
        return;
      }

      if (callbackUndelayed) {
        process.nextTick(() => callbackUndelayed(events[0].path, events[0].time ?? Date.now()));
      }

      process.nextTick(() => {
        const removals = new Set<string>();
        const fileChanges = new Set<string>();
        const directoryChanges = new Set<string>();
        const missingChanges = new Set<string>();

        for (const event of events) {
          this.inputFileSystem.purge?.(event.path);

          if (event.type === 'deleted') {
            timeInfo.delete(event.path);
            removals.add(event.path);
          } else {
            timeInfo.update(event.path, event.time ?? Date.now());
            if (watchedFiles.has(event.path)) {
              fileChanges.add(event.path);
            } else if (watchedDirectories.has(event.path)) {
              directoryChanges.add(event.path);
            } else if (watchedMissing.has(event.path)) {
              missingChanges.add(event.path);
            }
          }
        }

        const timeInfoMap = new Map(timeInfo);

        callback(
          undefined,
          timeInfoMap,
          timeInfoMap,
          new Set([...fileChanges, ...directoryChanges, ...missingChanges]),
          removals,
        );
      });
    });

    return {
      close() {
        watcher.close();
      },
      pause() {},
      getFileTimeInfoEntries() {
        return new Map(timeInfo);
      },
      getContextTimeInfoEntries() {
        return new Map(timeInfo);
      },
    };
  }
}

export class BuilderWatchPlugin {
  constructor(private readonly watcherFactory: BuilderWatcherFactory) {}

  apply(compiler: Compiler): void {
    compiler.hooks.environment.tap('BuilderWatchPlugin', () => {
      compiler.watchFileSystem = new BuilderWatchFileSystem(
        this.watcherFactory,
        compiler.inputFileSystem,
      );
    });
  }
}
