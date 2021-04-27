/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Compiler } from 'webpack';
import { isWebpackFiveOrHigher } from '../../utils/webpack-version';

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

export interface WebpackWatcher {
  close(): void;
  pause(): void;
  // Webpack 4
  getFileTimestamps(): Map<string, number>;
  getContextTimestamps(): Map<string, number>;
  // Webpack 5
  getFileTimeInfoEntries(): Map<string, { safeTime: number; timestamp: number }>;
  getContextTimeInfoEntries(): Map<string, { safeTime: number; timestamp: number }>;
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

type WatchCallback4 = (
  error: Error | undefined,
  fileChanges: Set<string>,
  directoryChanges: Set<string>,
  missingChanges: Set<string>,
  files: Map<string, number>,
  contexts: Map<string, number>,
  removals: Set<string>,
) => void;
type WatchCallback5 = (
  error: Error | undefined,
  files: Map<string, { safeTime: number; timestamp: number }>,
  contexts: Map<string, { safeTime: number; timestamp: number }>,
  changes: Set<string>,
  removals: Set<string>,
) => void;

export interface WebpackWatchFileSystem {
  watch(
    files: Iterable<string>,
    directories: Iterable<string>,
    missing: Iterable<string>,
    startTime: number,
    options: {},
    callback: WatchCallback4 | WatchCallback5,
    callbackUndelayed: (file: string, time: number) => void,
  ): WebpackWatcher;
}

class BuilderWatchFileSystem implements WebpackWatchFileSystem {
  constructor(
    private readonly watcherFactory: BuilderWatcherFactory,
    private readonly inputFileSystem: { purge?(path?: string): void },
  ) {}

  watch(
    files: Iterable<string>,
    directories: Iterable<string>,
    missing: Iterable<string>,
    startTime: number,
    _options: {},
    callback: WatchCallback4 | WatchCallback5,
    callbackUndelayed?: (file: string, time: number) => void,
  ): WebpackWatcher {
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

        if (isWebpackFiveOrHigher()) {
          (callback as WatchCallback5)(
            undefined,
            new Map(timeInfo),
            new Map(timeInfo),
            new Set([...fileChanges, ...directoryChanges, ...missingChanges]),
            removals,
          );
        } else {
          (callback as WatchCallback4)(
            undefined,
            fileChanges,
            directoryChanges,
            missingChanges,
            timeInfo.toTimestamps(),
            timeInfo.toTimestamps(),
            removals,
          );
        }
      });
    });

    return {
      close() {
        watcher.close();
      },
      pause() {},
      getFileTimestamps() {
        return timeInfo.toTimestamps();
      },
      getContextTimestamps() {
        return timeInfo.toTimestamps();
      },
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

  apply(compiler: Compiler & { watchFileSystem: WebpackWatchFileSystem }): void {
    compiler.hooks.environment.tap('BuilderWatchPlugin', () => {
      compiler.watchFileSystem = new BuilderWatchFileSystem(
        this.watcherFactory,
        compiler.inputFileSystem,
      );
    });
  }
}
