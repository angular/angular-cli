/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import {
  PathLike,
  Stats,
  constants,
  existsSync,
  promises as fsPromises,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname as pathDirname } from 'node:path';
import { Observable, map, mergeMap, from as observableFrom, publish, refCount } from 'rxjs';
import { Path, PathFragment, dirname, fragment, getSystemPath, normalize, virtualFs } from '../src';

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
let FSWatcher: typeof import('chokidar').FSWatcher;
function loadFSWatcher() {
  if (!FSWatcher) {
    try {
      FSWatcher = require('chokidar').FSWatcher;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'MODULE_NOT_FOUND') {
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
      map((buffer) => new Uint8Array(buffer).buffer),
    );
  }

  delete(path: Path): Observable<void> {
    return observableFrom(
      fsPromises.rm(getSystemPath(path), { force: true, recursive: true, maxRetries: 3 }),
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
      const watcher = new FSWatcher({ persistent: true });
      watcher.add(getSystemPath(path));

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

      return () => {
        void watcher.close();
      };
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

      obs.next(new Uint8Array(buffer).buffer);
      obs.complete();
    });
  }

  delete(path: Path): Observable<void> {
    return new Observable<void>((obs) => {
      rmSync(getSystemPath(path), { force: true, recursive: true, maxRetries: 3 });

      obs.complete();
    });
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
    return this.stat(path).pipe(map((stat) => stat.isDirectory()));
  }

  isFile(path: Path): Observable<boolean> {
    return this.stat(path).pipe(map((stat) => stat.isFile()));
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
      loadFSWatcher();
      const watcher = new FSWatcher({ persistent: false });
      watcher.add(getSystemPath(path));

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

      return () => {
        void watcher.close();
      };
    }).pipe(publish(), refCount());
  }
}
