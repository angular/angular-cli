/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as fs from 'fs';
import { Observable } from 'rxjs/Observable';
import { empty } from 'rxjs/observable/empty';
import { from as observableFrom } from 'rxjs/observable/from';
import { of as observableOf } from 'rxjs/observable/of';
import { concat } from 'rxjs/operators/concat';
import { concatMap } from 'rxjs/operators/concatMap';
import { ignoreElements } from 'rxjs/operators/ignoreElements';
import { map } from 'rxjs/operators/map';
import { mergeMap } from 'rxjs/operators/mergeMap';
import { publish } from 'rxjs/operators/publish';
import { refCount } from 'rxjs/operators/refCount';
import {
  Path,
  PathFragment,
  asPosixPath,
  asWindowsPath,
  dirname,
  fragment,
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
  protected _getSystemPath(path: Path): string {
    if (process.platform.startsWith('win32')) {
      return asWindowsPath(path);
    } else {
      return asPosixPath(path);
    }
  }

  get capabilities(): virtualFs.HostCapabilities {
    return { synchronous: false };
  }

  write(path: Path, content: virtualFs.FileBuffer): Observable<void> {
    return new Observable<void>(obs => {
      // Create folders if necessary.
      const _createDir = (path: Path) => {
        if (fs.existsSync(this._getSystemPath(path))) {
          return;
        }
        if (dirname(path) === path) {
          throw new Error();
        }
        _createDir(dirname(path));
        fs.mkdirSync(this._getSystemPath(path));
      };
      _createDir(dirname(path));

      _callFs<void, string, Uint8Array>(
        fs.writeFile,
        this._getSystemPath(path),
        new Uint8Array(content),
      ).subscribe(obs);
    });
  }

  read(path: Path): Observable<virtualFs.FileBuffer> {
    return _callFs(fs.readFile, this._getSystemPath(path)).pipe(
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
            for (const fragment of fs.readdirSync(this._getSystemPath(path))) {
              if (fs.statSync(this._getSystemPath(join(path, fragment))).isDirectory()) {
                _recurseList(join(path, fragment));
                allDirs.push(join(path, fragment));
              } else {
                allFiles.push(join(path, fragment));
              }
            }
          };
          _recurseList(path);

          return observableFrom(allFiles)
            .pipe(
              mergeMap(p => _callFs(fs.unlink, this._getSystemPath(p))),
              ignoreElements(),
              concat(observableFrom(allDirs).pipe(
                concatMap(p => _callFs(fs.rmdir, this._getSystemPath(p))),
              )),
              map(() => {}),
            );
        } else {
          return _callFs(fs.unlink, this._getSystemPath(path));
        }
      }),
    );
  }

  rename(from: Path, to: Path): Observable<void> {
    return _callFs(fs.rename, this._getSystemPath(from), this._getSystemPath(to));
  }

  list(path: Path): Observable<PathFragment[]> {
    return _callFs(fs.readdir, this._getSystemPath(path)).pipe(
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
    return _callFs(fs.stat, this._getSystemPath(path)).pipe(
      map(stat => stat.isDirectory()),
    );
  }
  isFile(path: Path): Observable<boolean> {
    return _callFs(fs.stat, this._getSystemPath(path)).pipe(
      map(stat => stat.isDirectory()),
    );
  }

  // Some hosts may not support stats.
  stats(path: Path): Observable<virtualFs.Stats<fs.Stats>> | null {
    return _callFs(fs.stat, this._getSystemPath(path));
  }

  // Some hosts may not support watching.
  watch(
    path: Path,
    _options?: virtualFs.HostWatchOptions,
  ): Observable<virtualFs.HostWatchEvent> | null {
    return new Observable<virtualFs.HostWatchEvent>(obs => {
      const watcher = new FSWatcher({ persistent: true }).add(this._getSystemPath(path));

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
  protected _getSystemPath(path: Path): string {
    if (process.platform.startsWith('win32')) {
      return asWindowsPath(path);
    } else {
      return asPosixPath(path);
    }
  }

  get capabilities(): virtualFs.HostCapabilities {
    return { synchronous: true };
  }

  write(path: Path, content: virtualFs.FileBuffer): Observable<void> {
    // Create folders if necessary.
    const _createDir = (path: Path) => {
      if (fs.existsSync(this._getSystemPath(path))) {
        return;
      }
      _createDir(dirname(path));
      fs.mkdirSync(path);
    };
    _createDir(dirname(path));
    fs.writeFileSync(this._getSystemPath(path), new Uint8Array(content));

    return empty<void>();
  }

  read(path: Path): Observable<virtualFs.FileBuffer> {
    const buffer = fs.readFileSync(this._getSystemPath(path));

    return observableOf(new Uint8Array(buffer).buffer as virtualFs.FileBuffer);
  }

  delete(path: Path): Observable<void> {
    if (this.isDirectory(path)) {
      // Since this is synchronous, we can recurse and safely ignore the result.
      for (const name of fs.readdirSync(this._getSystemPath(path))) {
        this.delete(join(path, name));
      }
      fs.rmdirSync(this._getSystemPath(path));
    } else {
      fs.unlinkSync(this._getSystemPath(path));
    }

    return empty();
  }

  rename(from: Path, to: Path): Observable<void> {
    fs.renameSync(this._getSystemPath(from), this._getSystemPath(to));

    return empty();
  }

  list(path: Path): Observable<PathFragment[]> {
    return observableOf(fs.readdirSync(this._getSystemPath(path))).pipe(
      map(names => names.map(name => fragment(name))),
    );
  }

  exists(path: Path): Observable<boolean> {
    return observableOf(fs.existsSync(this._getSystemPath(path)));
  }

  isDirectory(path: Path): Observable<boolean> {
    // tslint:disable-next-line:non-null-operator
    return this.stats(path) !.pipe(map(stat => stat.isDirectory()));
  }
  isFile(path: Path): Observable<boolean> {
    // tslint:disable-next-line:non-null-operator
    return this.stats(path) !.pipe(map(stat => stat.isFile()));
  }

  // Some hosts may not support stats.
  stats(path: Path): Observable<virtualFs.Stats<fs.Stats>> | null {
    return observableOf(fs.statSync(this._getSystemPath(path)));
  }

  // Some hosts may not support watching.
  watch(
    path: Path,
    _options?: virtualFs.HostWatchOptions,
  ): Observable<virtualFs.HostWatchEvent> | null {
    return new Observable<virtualFs.HostWatchEvent>(obs => {
      const opts = { persistent: false };
      const watcher = new FSWatcher(opts).add(this._getSystemPath(path));

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
