/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as fs from 'fs';
import { EMPTY, Observable, concat, from as observableFrom, throwError } from 'rxjs';
import {
  concatMap,
  ignoreElements,
  map,
  mergeMap,
  publish,
  refCount,
} from 'rxjs/operators';
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
  new (options: {}): ChokidarWatcher;

  add(path: string): ChokidarWatcher;
  on(type: 'change', cb: (path: string) => void): ChokidarWatcher;
  on(type: 'add', cb: (path: string) => void): ChokidarWatcher;
  on(type: 'unlink', cb: (path: string) => void): ChokidarWatcher;

  close(): void;
}

const { FSWatcher }: { FSWatcher: ChokidarWatcher } = require('chokidar');


type FsFunction0<R> = (cb: (err?: Error, result?: R) => void) => void;
type FsFunction1<R, T1> = (p1: T1, cb: (err?: Error, result?: R) => void) => void;
type FsFunction2<R, T1, T2>
  = (p1: T1, p2: T2, cb: (err?: Error, result?: R) => void) => void;


function _callFs<R>(fn: FsFunction0<R>): Observable<R>;
function _callFs<R, T1>(fn: FsFunction1<R, T1>, p1: T1): Observable<R>;
function _callFs<R, T1, T2>(fn: FsFunction2<R, T1, T2>, p1: T1, p2: T2): Observable<R>;

function _callFs<ResultT>(fn: Function, ...args: {}[]): Observable<ResultT> {
  return new Observable(obs => {
    fn(...args, (err?: Error, result?: ResultT) => {
      if (err) {
        obs.error(err);
      } else {
        obs.next(result);
        obs.complete();
      }
    });
  });
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
    return new Observable<void>(obs => {
      // Create folders if necessary.
      const _createDir = (path: Path) => {
        if (fs.existsSync(getSystemPath(path))) {
          return;
        }
        if (dirname(path) === path) {
          throw new Error();
        }
        _createDir(dirname(path));
        fs.mkdirSync(getSystemPath(path));
      };
      _createDir(dirname(path));

      _callFs<void, string, Uint8Array>(
        fs.writeFile,
        getSystemPath(path),
        new Uint8Array(content),
      ).subscribe(obs);
    });
  }

  read(path: Path): Observable<virtualFs.FileBuffer> {
    return _callFs(fs.readFile, getSystemPath(path)).pipe(
      map(buffer => new Uint8Array(buffer).buffer as virtualFs.FileBuffer),
    );
  }

  delete(path: Path): Observable<void> {
    return this.isDirectory(path).pipe(
      mergeMap(isDirectory => {
        if (isDirectory) {
          const allFiles: Path[] = [];
          const allDirs: Path[] = [];
          const _recurseList = (path: Path) => {
            for (const fragment of fs.readdirSync(getSystemPath(path))) {
              if (fs.statSync(getSystemPath(join(path, fragment))).isDirectory()) {
                _recurseList(join(path, fragment));
                allDirs.push(join(path, fragment));
              } else {
                allFiles.push(join(path, fragment));
              }
            }
          };
          _recurseList(path);

          return concat(
            observableFrom(allFiles).pipe(
              mergeMap(p => _callFs(fs.unlink, getSystemPath(p))),
              ignoreElements(),
            ),
            observableFrom(allDirs).pipe(
              concatMap(p => _callFs(fs.rmdir, getSystemPath(p))),
              map(() => {}),
            ),
          );
        } else {
          return _callFs(fs.unlink, getSystemPath(path));
        }
      }),
    );
  }

  rename(from: Path, to: Path): Observable<void> {
    return _callFs(fs.rename, getSystemPath(from), getSystemPath(to));
  }

  list(path: Path): Observable<PathFragment[]> {
    return _callFs(fs.readdir, getSystemPath(path)).pipe(
      map(names => names.map(name => fragment(name))),
    );
  }

  exists(path: Path): Observable<boolean> {
    // Exists is a special case because it cannot error.
    return new Observable(obs => {
      fs.exists(path, exists => {
        obs.next(exists);
        obs.complete();
      });
    });
  }

  isDirectory(path: Path): Observable<boolean> {
    return _callFs(fs.stat, getSystemPath(path)).pipe(
      map(stat => stat.isDirectory()),
    );
  }
  isFile(path: Path): Observable<boolean> {
    return _callFs(fs.stat, getSystemPath(path)).pipe(
      map(stat => stat.isDirectory()),
    );
  }

  // Some hosts may not support stat.
  stat(path: Path): Observable<virtualFs.Stats<fs.Stats>> | null {
    return _callFs(fs.stat, getSystemPath(path));
  }

  // Some hosts may not support watching.
  watch(
    path: Path,
    _options?: virtualFs.HostWatchOptions,
  ): Observable<virtualFs.HostWatchEvent> | null {
    return new Observable<virtualFs.HostWatchEvent>(obs => {
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
      // TODO: remove this try+catch when issue https://github.com/ReactiveX/rxjs/issues/3740 is
      // fixed.
      try {
        // Create folders if necessary.
        const _createDir = (path: Path) => {
          if (fs.existsSync(getSystemPath(path))) {
            return;
          }
          _createDir(dirname(path));
          fs.mkdirSync(getSystemPath(path));
        };
        _createDir(dirname(path));
        fs.writeFileSync(getSystemPath(path), new Uint8Array(content));

        obs.next();
        obs.complete();
      } catch (err) {
        obs.error(err);
      }
    });
  }

  read(path: Path): Observable<virtualFs.FileBuffer> {
    return new Observable(obs => {
      // TODO: remove this try+catch when issue https://github.com/ReactiveX/rxjs/issues/3740 is
      // fixed.
      try {
        const buffer = fs.readFileSync(getSystemPath(path));

        obs.next(new Uint8Array(buffer).buffer as virtualFs.FileBuffer);
        obs.complete();
      } catch (err) {
        obs.error(err);
      }
    });
  }

  delete(path: Path): Observable<void> {
    return this.isDirectory(path).pipe(
      concatMap(isDir => {
        if (isDir) {
          // Since this is synchronous, we can recurse and safely ignore the result.
          for (const name of fs.readdirSync(getSystemPath(path))) {
            this.delete(join(path, name)).subscribe();
          }
          try {
            fs.rmdirSync(getSystemPath(path));
          } catch (error) {
            return throwError(error);
          }
        } else {
          try {
            fs.unlinkSync(getSystemPath(path));
          } catch (error) {
            return throwError(error);
          }
        }

        return EMPTY;
      }),
    );
  }

  rename(from: Path, to: Path): Observable<void> {
    return new Observable(obs => {
      // TODO: remove this try+catch when issue https://github.com/ReactiveX/rxjs/issues/3740 is
      // fixed.
      try {
        fs.renameSync(getSystemPath(from), getSystemPath(to));
        obs.next();
        obs.complete();
      } catch (err) {
        obs.error(err);
      }
    });
  }

  list(path: Path): Observable<PathFragment[]> {
    return new Observable(obs => {
      // TODO: remove this try+catch when issue https://github.com/ReactiveX/rxjs/issues/3740 is
      // fixed.
      try {
        const names = fs.readdirSync(getSystemPath(path));
        obs.next(names.map(name => fragment(name)));
        obs.complete();
      } catch (err) {
        obs.error(err);
      }
    });
  }

  exists(path: Path): Observable<boolean> {
    return new Observable(obs => {
      // TODO: remove this try+catch when issue https://github.com/ReactiveX/rxjs/issues/3740 is
      // fixed.
      try {
        obs.next(fs.existsSync(getSystemPath(path)));
        obs.complete();
      } catch (err) {
        obs.error(err);
      }
    });
  }

  isDirectory(path: Path): Observable<boolean> {
    // tslint:disable-next-line:non-null-operator
    return this.stat(path) !.pipe(map(stat => stat.isDirectory()));
  }
  isFile(path: Path): Observable<boolean> {
    // tslint:disable-next-line:non-null-operator
    return this.stat(path) !.pipe(map(stat => stat.isFile()));
  }

  // Some hosts may not support stat.
  stat(path: Path): Observable<virtualFs.Stats<fs.Stats>> {
    return new Observable(obs => {
      // TODO: remove this try+catch when issue https://github.com/ReactiveX/rxjs/issues/3740 is
      // fixed.
      try {
        obs.next(fs.statSync(getSystemPath(path)));
        obs.complete();
      } catch (err) {
        obs.error(err);
      }
    });
  }

  // Some hosts may not support watching.
  watch(
    path: Path,
    _options?: virtualFs.HostWatchOptions,
  ): Observable<virtualFs.HostWatchEvent> | null {
    return new Observable<virtualFs.HostWatchEvent>(obs => {
      const opts = { persistent: false };
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
