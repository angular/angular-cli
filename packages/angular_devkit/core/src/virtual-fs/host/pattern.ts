/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Observable } from 'rxjs';
import { Path, PathFragment } from '../path';
import {
  FileBuffer,
  Host,
  HostCapabilities,
  HostWatchEvent,
  HostWatchOptions,
  Stats,
} from './interface';


export type ReplacementFunction = (path: Path) => Path;


/**
 */
export class PatternMatchingHost<StatsT extends object = {}> implements Host<StatsT> {
  protected _patterns = new Map<RegExp, ReplacementFunction>();

  constructor(protected _delegate: Host<StatsT>) {}

  addPattern(pattern: string | string[], replacementFn: ReplacementFunction) {
    // Simple GLOB pattern replacement.
    const reString = '^('
      + (Array.isArray(pattern) ? pattern : [pattern])
        .map(ex => '('
          + ex.split(/[\/\\]/g).map(f => f
            .replace(/[\-\[\]{}()+?.^$|]/g, '\\$&')
            .replace(/^\*\*/g, '(.+?)?')
            .replace(/\*/g, '[^/\\\\]*'))
            .join('[\/\\\\]')
          + ')')
        .join('|')
      + ')($|/|\\\\)';

    this._patterns.set(new RegExp(reString), replacementFn);
  }

  protected _resolve(path: Path) {
    let newPath = path;
    this._patterns.forEach((fn, re) => {
      if (re.test(path)) {
        newPath = fn(newPath);
      }
    });

    return newPath;
  }

  get capabilities(): HostCapabilities { return this._delegate.capabilities; }

  write(path: Path, content: FileBuffer): Observable<void> {
    return this._delegate.write(this._resolve(path), content);
  }
  read(path: Path): Observable<FileBuffer> {
    return this._delegate.read(this._resolve(path));
  }
  delete(path: Path): Observable<void> {
    return this._delegate.delete(this._resolve(path));
  }
  rename(from: Path, to: Path): Observable<void> {
    return this._delegate.rename(this._resolve(from), this._resolve(to));
  }

  list(path: Path): Observable<PathFragment[]> {
    return this._delegate.list(this._resolve(path));
  }

  exists(path: Path): Observable<boolean> {
    return this._delegate.exists(this._resolve(path));
  }
  isDirectory(path: Path): Observable<boolean> {
    return this._delegate.isDirectory(this._resolve(path));
  }
  isFile(path: Path): Observable<boolean> {
    return this._delegate.isFile(this._resolve(path));
  }

  // Some hosts may not support stat.
  stat(path: Path): Observable<Stats<StatsT>> | null {
    return this._delegate.stat(this._resolve(path));
  }

  // Some hosts may not support watching.
  watch(path: Path, options?: HostWatchOptions): Observable<HostWatchEvent> | null {
    return this._delegate.watch(this._resolve(path), options);
  }
}
