/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Path, PathFragment, fragment, getSystemPath, virtualFs } from '@angular-devkit/core';
import { Stats } from 'fs';
import { Observable, throwError } from 'rxjs';
import { map } from 'rxjs/operators';
import { InputFileSystem } from 'webpack';

// Host is used instead of ReadonlyHost due to most decorators only supporting Hosts
export class WebpackInputHost implements virtualFs.Host<Stats> {

  constructor(public readonly inputFileSystem: InputFileSystem) { }

  get capabilities(): virtualFs.HostCapabilities {
    return { synchronous: true };
  }

  write(_path: Path, _content: virtualFs.FileBufferLike) {
    return throwError(new Error('Not supported.'));
  }

  delete(_path: Path) {
    return throwError(new Error('Not supported.'));
  }

  rename(_from: Path, _to: Path) {
    return throwError(new Error('Not supported.'));
  }

  read(path: Path): Observable<virtualFs.FileBuffer> {
    return new Observable(obs => {
      // TODO: remove this try+catch when issue https://github.com/ReactiveX/rxjs/issues/3740 is
      // fixed.
      try {
        const data = this.inputFileSystem.readFileSync(getSystemPath(path));
        obs.next(new Uint8Array(data).buffer as ArrayBuffer);
        obs.complete();
      } catch (e) {
        obs.error(e);
      }
    });
  }

  list(path: Path): Observable<PathFragment[]> {
    return new Observable(obs => {
      // TODO: remove this try+catch when issue https://github.com/ReactiveX/rxjs/issues/3740 is
      // fixed.
      try {
        // tslint:disable-next-line:no-any
        const names: string[] = (this.inputFileSystem as any).readdirSync(getSystemPath(path));
        obs.next(names.map(name => fragment(name)));
        obs.complete();
      } catch (err) {
        obs.error(err);
      }
    });
  }

  exists(path: Path): Observable<boolean> {
    return this.stat(path).pipe(map(stats => stats != null));
  }

  isDirectory(path: Path): Observable<boolean> {
    return this.stat(path).pipe(map(stats => stats != null && stats.isDirectory()));
  }

  isFile(path: Path): Observable<boolean> {
    return this.stat(path).pipe(map(stats => stats != null && stats.isFile()));
  }

  stat(path: Path): Observable<Stats | null> {
    return new Observable(obs => {
      try {
        const stats = this.inputFileSystem.statSync(getSystemPath(path));
        obs.next(stats);
        obs.complete();
      } catch (e) {
        if (e.code === 'ENOENT') {
          obs.next(null);
          obs.complete();
        } else {
          obs.error(e);
        }
      }
    });
  }

  watch(_path: Path, _options?: virtualFs.HostWatchOptions): null {
    return null;
  }
}
