/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as fs from 'fs';
import { dirname as pathDirname, join as pathJoin } from 'path';
import { Observable, concat, from as observableFrom, of, throwError } from 'rxjs';
import {
  concatMap,
  map,
  mergeMap,
  publish,
  refCount,
} from 'rxjs/operators';
import { promisify } from 'util';
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
  new(options: {}): ChokidarWatcher;

  add(path: string): ChokidarWatcher;
  on(type: 'change', cb: (path: string) => void): ChokidarWatcher;
  on(type: 'add', cb: (path: string) => void): ChokidarWatcher;
  on(type: 'unlink', cb: (path: string) => void): ChokidarWatcher;

  close(): void;
}

const writeFile = promisify(fs.writeFile);
const rename = promisify(fs.rename);
const mkdir = promisify(fs.mkdir);
const readdir = promisify(fs.readdir);
const readFile = promisify(fs.readFile);
const stat = promisify(fs.stat);
const unlink = promisify(fs.unlink);
const rmdir = promisify(fs.rmdir);
const access = promisify(fs.access);
async function exists(path: fs.PathLike): Promise<boolean> {
  try {
    await access(path, fs.constants.F_OK);

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
      // tslint:disable-next-line:no-implicit-dependencies
      FSWatcher = require('chokidar').FSWatcher;
    } catch (e) {
      if (e.code !== 'MODULE_NOT_FOUND') {
        throw new Error('As of angular-devkit version 8.0, the "chokidar" package ' +
          'must be installed in order to use watch() features.');
      }
      throw e;
    }
  }
}

/**
 * An implementation of the Virtual FS using Node as the background. There are two versions; one
 * synchronous and one asynchronous.
 */
export class NodeJsAsyncHost implements virtualFs.Host<fs.Stats> {
  get capabilities(): virtualFs.HostCapabilities {
    return { synchronous: false };
  }

  write(path: Path, content: virtualFs.FileBuffer): Observable<void> {
    return observableFrom(mkdir(getSystemPath(dirname(path)), { recursive: true }))
      .pipe(
        mergeMap(async() => {
          await writeFile(getSystemPath(path), content);
        }),
      );
  }

  read(path: Path): Observable<virtualFs.FileBuffer> {
    return observableFrom(readFile(getSystemPath(path)))
      .pipe(
        map(buffer => new Uint8Array(buffer).buffer as virtualFs.FileBuffer),
      );
  }

  delete(path: Path): Observable<void> {
    return this.isDirectory(path).pipe(
      mergeMap(async isDirectory => {
        if (isDirectory) {
          const recursiveDelete = async (dirPath: string) => {
            for (const fragment of (await readdir(dirPath))) {
              const sysPath = pathJoin(dirPath, fragment);
              const stats = await stat(sysPath);

              if (stats.isDirectory()) {
                await recursiveDelete(sysPath);
                await rmdir(sysPath);
              } else {
                await unlink(sysPath);
              }
            }
          };

          await recursiveDelete(getSystemPath(path));
        } else {
          await unlink(getSystemPath(path));
        }
      }),
    );
  }

  rename(from: Path, to: Path): Observable<void> {
    return observableFrom(rename(getSystemPath(from), getSystemPath(to)));
  }

  list(path: Path): Observable<PathFragment[]> {
    return observableFrom(readdir(getSystemPath(path))).pipe(
      map((names) => names.map(name => fragment(name))),
    );
  }

  exists(path: Path): Observable<boolean> {
    return observableFrom(exists(path));
  }

  isDirectory(path: Path): Observable<boolean> {
    return this.stat(path).pipe(
      map(stat => stat.isDirectory()),
    );
  }
  isFile(path: Path): Observable<boolean> {
    return this.stat(path).pipe(
      map(stat => stat.isFile()),
    );
  }

  // Some hosts may not support stat.
  stat(path: Path): Observable<virtualFs.Stats<fs.Stats>> {
    return observableFrom(stat(getSystemPath(path)));
  }

  // Some hosts may not support watching.
  watch(
    path: Path,
    _options?: virtualFs.HostWatchOptions,
  ): Observable<virtualFs.HostWatchEvent> | null {
    return new Observable<virtualFs.HostWatchEvent>(obs => {
      loadFSWatcher();
      const watcher = new FSWatcher({ persistent: true }).add(getSystemPath(path));

      watcher
        .on('change', path => {
          obs.next({
            path: normalize(path),
            time: new Date(),
            type: virtualFs.HostWatchEventType.Changed,
          });
        })
        .on('add', path => {
          obs.next({
            path: normalize(path),
            time: new Date(),
            type: virtualFs.HostWatchEventType.Created,
          });
        })
        .on('unlink', path => {
          obs.next({
            path: normalize(path),
            time: new Date(),
            type: virtualFs.HostWatchEventType.Deleted,
          });
        });

      return () => watcher.close();
    }).pipe(
      publish(),
      refCount(),
    );
  }
}


/**
 * An implementation of the Virtual FS using Node as the backend, synchronously.
 */
export class NodeJsSyncHost implements virtualFs.Host<fs.Stats> {
  get capabilities(): virtualFs.HostCapabilities {
    return { synchronous: true };
  }

  write(path: Path, content: virtualFs.FileBuffer): Observable<void> {
    return new Observable(obs => {
      fs.mkdirSync(getSystemPath(dirname(path)), { recursive: true });
      fs.writeFileSync(getSystemPath(path), new Uint8Array(content));
      obs.next();
      obs.complete();
    });
  }

  read(path: Path): Observable<virtualFs.FileBuffer> {
    return new Observable(obs => {
      const buffer = fs.readFileSync(getSystemPath(path));

      obs.next(new Uint8Array(buffer).buffer as virtualFs.FileBuffer);
      obs.complete();
    });
  }

  delete(path: Path): Observable<void> {
    return this.isDirectory(path).pipe(
      concatMap(isDir => {
        if (isDir) {
          const dirPaths = fs.readdirSync(getSystemPath(path));
          const rmDirComplete = new Observable<void>((obs) => {
            fs.rmdirSync(getSystemPath(path));
            obs.complete();
          });

          return concat(
            ...dirPaths.map(name => this.delete(join(path, name))),
            rmDirComplete,
          );
        } else {
          try {
            fs.unlinkSync(getSystemPath(path));
          } catch (err) {
            return throwError(err);
          }

          return of(undefined);
        }
      }),
    );
  }

  rename(from: Path, to: Path): Observable<void> {
    return new Observable(obs => {
      const toSystemPath = getSystemPath(to);
      fs.mkdirSync(pathDirname(toSystemPath), { recursive: true });
      fs.renameSync(getSystemPath(from), toSystemPath);
      obs.next();
      obs.complete();
    });
  }

  list(path: Path): Observable<PathFragment[]> {
    return new Observable(obs => {
      const names = fs.readdirSync(getSystemPath(path));
      obs.next(names.map(name => fragment(name)));
      obs.complete();
    });
  }

  exists(path: Path): Observable<boolean> {
    return new Observable(obs => {
      obs.next(fs.existsSync(getSystemPath(path)));
      obs.complete();
    });
  }

  isDirectory(path: Path): Observable<boolean> {
    // tslint:disable-next-line:no-non-null-assertion
    return this.stat(path)!.pipe(map(stat => stat.isDirectory()));
  }
  isFile(path: Path): Observable<boolean> {
    // tslint:disable-next-line:no-non-null-assertion
    return this.stat(path)!.pipe(map(stat => stat.isFile()));
  }

  // Some hosts may not support stat.
  stat(path: Path): Observable<virtualFs.Stats<fs.Stats>> {
    return new Observable(obs => {
      obs.next(fs.statSync(getSystemPath(path)));
      obs.complete();
    });
  }

  // Some hosts may not support watching.
  watch(
    path: Path,
    _options?: virtualFs.HostWatchOptions,
  ): Observable<virtualFs.HostWatchEvent> | null {
    return new Observable<virtualFs.HostWatchEvent>(obs => {
      const opts = { persistent: false };
      loadFSWatcher();
      const watcher = new FSWatcher(opts).add(getSystemPath(path));

      watcher
        .on('change', path => {
          obs.next({
            path: normalize(path),
            time: new Date(),
            type: virtualFs.HostWatchEventType.Changed,
          });
        })
        .on('add', path => {
          obs.next({
            path: normalize(path),
            time: new Date(),
            type: virtualFs.HostWatchEventType.Created,
          });
        })
        .on('unlink', path => {
          obs.next({
            path: normalize(path),
            time: new Date(),
            type: virtualFs.HostWatchEventType.Deleted,
          });
        });

      return () => watcher.close();
    }).pipe(
      publish(),
      refCount(),
    );
  }
}
