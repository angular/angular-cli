/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import fs, {
  PathLike,
  Stats,
  constants,
  existsSync,
  promises as fsPromises,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'fs';
import { dirname as pathDirname, join as pathJoin } from 'path';
import { Observable, concat, from as observableFrom, of, throwError } from 'rxjs';
import { concatMap, map, mergeMap, publish, refCount } from 'rxjs/operators';
import {
  Path,
  PathFragment,
  dirname,
  fragment,
  getSystemPath,
  join,
  normalize,
  virtualFs,
} from '../src';

interface ChokidarWatcher {
  // eslint-disable-next-line @typescript-eslint/no-misused-new
  new (options: {}): ChokidarWatcher;

  add(path: string): ChokidarWatcher;
  on(type: 'change', cb: (path: string) => void): ChokidarWatcher;
  on(type: 'add', cb: (path: string) => void): ChokidarWatcher;
  on(type: 'unlink', cb: (path: string) => void): ChokidarWatcher;

  close(): void;
}

async function exists(path: PathLike): Promise<boolean> {
  try {
    await fsPromises.access(path, constants.F_OK);

    return true;
  } catch {
    return false;
  }
}

// This will only be initialized if the watch() method is called.
// Otherwise chokidar appears only in type positions, and shouldn't be referenced
// in the JavaScript output.
let FSWatcher: ChokidarWatcher;
function loadFSWatcher() {
  if (!FSWatcher) {
    try {
      // eslint-disable-next-line import/no-extraneous-dependencies
      FSWatcher = require('chokidar').FSWatcher;
    } catch (e) {
      if (e.code !== 'MODULE_NOT_FOUND') {
        throw new Error(
          'As of angular-devkit version 8.0, the "chokidar" package ' +
            'must be installed in order to use watch() features.',
        );
      }
      throw e;
    }
  }
}

/**
 * An implementation of the Virtual FS using Node as the background. There are two versions; one
 * synchronous and one asynchronous.
 */
export class NodeJsAsyncHost implements virtualFs.Host<Stats> {
  get capabilities(): virtualFs.HostCapabilities {
    return { synchronous: false };
  }

  write(path: Path, content: virtualFs.FileBuffer): Observable<void> {
    return observableFrom(fsPromises.mkdir(getSystemPath(dirname(path)), { recursive: true })).pipe(
      mergeMap(() => fsPromises.writeFile(getSystemPath(path), new Uint8Array(content))),
    );
  }

  read(path: Path): Observable<virtualFs.FileBuffer> {
    return observableFrom(fsPromises.readFile(getSystemPath(path))).pipe(
      map((buffer) => new Uint8Array(buffer).buffer as virtualFs.FileBuffer),
    );
  }

  delete(path: Path): Observable<void> {
    return this.isDirectory(path).pipe(
      mergeMap(async (isDirectory) => {
        if (isDirectory) {
          // The below should be removed and replaced with just `rm` when support for Node.Js 12 is removed.
          const { rm, rmdir } = fsPromises as typeof fsPromises & {
            rm?: (
              path: fs.PathLike,
              options?: {
                force?: boolean;
                maxRetries?: number;
                recursive?: boolean;
                retryDelay?: number;
              },
            ) => Promise<void>;
          };

          if (rm) {
            await rm(getSystemPath(path), { force: true, recursive: true, maxRetries: 3 });
          } else {
            await rmdir(getSystemPath(path), { recursive: true, maxRetries: 3 });
          }
        } else {
          await fsPromises.unlink(getSystemPath(path));
        }
      }),
    );
  }

  rename(from: Path, to: Path): Observable<void> {
    return observableFrom(fsPromises.rename(getSystemPath(from), getSystemPath(to)));
  }

  list(path: Path): Observable<PathFragment[]> {
    return observableFrom(fsPromises.readdir(getSystemPath(path))).pipe(
      map((names) => names.map((name) => fragment(name))),
    );
  }

  exists(path: Path): Observable<boolean> {
    return observableFrom(exists(getSystemPath(path)));
  }

  isDirectory(path: Path): Observable<boolean> {
    return this.stat(path).pipe(map((stat) => stat.isDirectory()));
  }

  isFile(path: Path): Observable<boolean> {
    return this.stat(path).pipe(map((stat) => stat.isFile()));
  }

  // Some hosts may not support stat.
  stat(path: Path): Observable<virtualFs.Stats<Stats>> {
    return observableFrom(fsPromises.stat(getSystemPath(path)));
  }

  // Some hosts may not support watching.
  watch(
    path: Path,
    _options?: virtualFs.HostWatchOptions,
  ): Observable<virtualFs.HostWatchEvent> | null {
    return new Observable<virtualFs.HostWatchEvent>((obs) => {
      loadFSWatcher();
      const watcher = new FSWatcher({ persistent: true }).add(getSystemPath(path));

      watcher
        .on('change', (path) => {
          obs.next({
            path: normalize(path),
            time: new Date(),
            type: virtualFs.HostWatchEventType.Changed,
          });
        })
        .on('add', (path) => {
          obs.next({
            path: normalize(path),
            time: new Date(),
            type: virtualFs.HostWatchEventType.Created,
          });
        })
        .on('unlink', (path) => {
          obs.next({
            path: normalize(path),
            time: new Date(),
            type: virtualFs.HostWatchEventType.Deleted,
          });
        });

      return () => watcher.close();
    }).pipe(publish(), refCount());
  }
}

/**
 * An implementation of the Virtual FS using Node as the backend, synchronously.
 */
export class NodeJsSyncHost implements virtualFs.Host<Stats> {
  get capabilities(): virtualFs.HostCapabilities {
    return { synchronous: true };
  }

  write(path: Path, content: virtualFs.FileBuffer): Observable<void> {
    return new Observable((obs) => {
      mkdirSync(getSystemPath(dirname(path)), { recursive: true });
      writeFileSync(getSystemPath(path), new Uint8Array(content));
      obs.next();
      obs.complete();
    });
  }

  read(path: Path): Observable<virtualFs.FileBuffer> {
    return new Observable((obs) => {
      const buffer = readFileSync(getSystemPath(path));

      obs.next(new Uint8Array(buffer).buffer as virtualFs.FileBuffer);
      obs.complete();
    });
  }

  delete(path: Path): Observable<void> {
    return this.isDirectory(path).pipe(
      concatMap((isDir) => {
        if (isDir) {
          const dirPaths = readdirSync(getSystemPath(path));
          const rmDirComplete = new Observable<void>((obs) => {
            // The below should be removed and replaced with just `rmSync` when support for Node.Js 12 is removed.
            const { rmSync, rmdirSync } = fs as typeof fs & {
              rmSync?: (
                path: fs.PathLike,
                options?: {
                  force?: boolean;
                  maxRetries?: number;
                  recursive?: boolean;
                  retryDelay?: number;
                },
              ) => void;
            };

            if (rmSync) {
              rmSync(getSystemPath(path), { force: true, recursive: true, maxRetries: 3 });
            } else {
              rmdirSync(getSystemPath(path), { recursive: true, maxRetries: 3 });
            }

            obs.complete();
          });

          return concat(...dirPaths.map((name) => this.delete(join(path, name))), rmDirComplete);
        } else {
          try {
            unlinkSync(getSystemPath(path));
          } catch (err) {
            return throwError(err);
          }

          return of(undefined);
        }
      }),
    );
  }

  rename(from: Path, to: Path): Observable<void> {
    return new Observable((obs) => {
      const toSystemPath = getSystemPath(to);
      mkdirSync(pathDirname(toSystemPath), { recursive: true });
      renameSync(getSystemPath(from), toSystemPath);
      obs.next();
      obs.complete();
    });
  }

  list(path: Path): Observable<PathFragment[]> {
    return new Observable((obs) => {
      const names = readdirSync(getSystemPath(path));
      obs.next(names.map((name) => fragment(name)));
      obs.complete();
    });
  }

  exists(path: Path): Observable<boolean> {
    return new Observable((obs) => {
      obs.next(existsSync(getSystemPath(path)));
      obs.complete();
    });
  }

  isDirectory(path: Path): Observable<boolean> {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return this.stat(path)!.pipe(map((stat) => stat.isDirectory()));
  }

  isFile(path: Path): Observable<boolean> {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return this.stat(path)!.pipe(map((stat) => stat.isFile()));
  }

  // Some hosts may not support stat.
  stat(path: Path): Observable<virtualFs.Stats<Stats>> {
    return new Observable((obs) => {
      obs.next(statSync(getSystemPath(path)));
      obs.complete();
    });
  }

  // Some hosts may not support watching.
  watch(
    path: Path,
    _options?: virtualFs.HostWatchOptions,
  ): Observable<virtualFs.HostWatchEvent> | null {
    return new Observable<virtualFs.HostWatchEvent>((obs) => {
      const opts = { persistent: false };
      loadFSWatcher();
      const watcher = new FSWatcher(opts).add(getSystemPath(path));

      watcher
        .on('change', (path) => {
          obs.next({
            path: normalize(path),
            time: new Date(),
            type: virtualFs.HostWatchEventType.Changed,
          });
        })
        .on('add', (path) => {
          obs.next({
            path: normalize(path),
            time: new Date(),
            type: virtualFs.HostWatchEventType.Created,
          });
        })
        .on('unlink', (path) => {
          obs.next({
            path: normalize(path),
            time: new Date(),
            type: virtualFs.HostWatchEventType.Deleted,
          });
        });

      return () => watcher.close();
    }).pipe(publish(), refCount());
  }
}
