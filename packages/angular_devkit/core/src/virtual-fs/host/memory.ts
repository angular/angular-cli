/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Observable } from 'rxjs/Observable';
import { Subject } from 'rxjs/Subject';
import { empty } from 'rxjs/observable/empty';
import { of as observableOf } from 'rxjs/observable/of';
import { _throw } from 'rxjs/observable/throw';
import {
  FileAlreadyExistException,
  FileDoesNotExistException,
  PathIsDirectoryException,
  PathIsFileException,
} from '../../exception/exception';
import {
  NormalizedRoot,
  NormalizedSep,
  Path,
  PathFragment,
  dirname,
  isAbsolute,
  join,
  normalize,
  split,
} from '../path';
import {
  FileBuffer,
  Host,
  HostCapabilities,
  HostWatchEvent,
  HostWatchEventType,
  HostWatchOptions,
  Stats,
} from './interface';


export class SimpleMemoryHost implements Host<{}> {
  private _cache = new Map<Path, FileBuffer>();
  private _watchers = new Map<Path, [HostWatchOptions, Subject<HostWatchEvent>][]>();

  protected _toAbsolute(path: Path) {
    return isAbsolute(path) ? path : normalize('/' + path);
  }

  protected _isDir(path: Path) {
    if (path === '/') {
      return true;
    }

    for (const p of this._cache.keys()) {
      if (p.startsWith(path + NormalizedSep)) {
        return true;
      }
    }

    return false;
  }

  protected _updateWatchers(path: Path, type: HostWatchEventType) {
    const time = new Date();
    let currentPath = path;
    let parent: Path | null = null;

    if (this._watchers.size == 0) {
      // Nothing to do if there's no watchers.
      return;
    }

    const maybeWatcher = this._watchers.get(currentPath);
    if (maybeWatcher) {
      maybeWatcher.forEach(watcher => {
        const [options, subject] = watcher;
        subject.next({ path, time, type });

        if (!options.persistent && type == HostWatchEventType.Deleted) {
          subject.complete();
          this._watchers.delete(currentPath);
        }
      });
    }

    do {
      currentPath = parent !== null ? parent : currentPath;
      parent = dirname(currentPath);

      const maybeWatcher = this._watchers.get(currentPath);
      if (maybeWatcher) {
        maybeWatcher.forEach(watcher => {
          const [options, subject] = watcher;
          if (!options.recursive) {
            return;
          }
          subject.next({ path, time, type });

          if (!options.persistent && type == HostWatchEventType.Deleted) {
            subject.complete();
            this._watchers.delete(currentPath);
          }
        });
      }
    } while (parent != currentPath);
  }

  get capabilities(): HostCapabilities {
    return { synchronous: true };
  }

  write(path: Path, content: FileBuffer): Observable<void> {
    path = this._toAbsolute(path);
    if (this._isDir(path)) {
      return _throw(new PathIsDirectoryException(path));
    }

    const existed = this._cache.has(path);
    this._cache.set(path, content);
    this._updateWatchers(path, existed ? HostWatchEventType.Changed : HostWatchEventType.Created);

    return empty<void>();
  }
  read(path: Path): Observable<FileBuffer> {
    path = this._toAbsolute(path);
    if (this._isDir(path)) {
      return _throw(new PathIsDirectoryException(path));
    }
    const maybeBuffer = this._cache.get(path);
    if (!maybeBuffer) {
      return _throw(new FileDoesNotExistException(path));
    } else {
      return observableOf(maybeBuffer);
    }
  }
  delete(path: Path): Observable<void> {
    path = this._toAbsolute(path);
    if (this._isDir(path)) {
      for (const [cachePath, _] of this._cache.entries()) {
        if (path.startsWith(cachePath + NormalizedSep)) {
          this._cache.delete(cachePath);
        }
      }
    } else {
      this._cache.delete(path);
    }
    this._updateWatchers(path, HostWatchEventType.Deleted);

    return empty();
  }
  rename(from: Path, to: Path): Observable<void> {
    from = this._toAbsolute(from);
    to = this._toAbsolute(to);
    if (!this._cache.has(from)) {
      return _throw(new FileDoesNotExistException(from));
    } else if (this._cache.has(to)) {
      return _throw(new FileAlreadyExistException(from));
    }
    if (this._isDir(from)) {
      for (const path of this._cache.keys()) {
        if (path.startsWith(from + NormalizedSep)) {
          const content = this._cache.get(path);
          if (content) {
            this._cache.set(join(to, NormalizedSep, path.slice(from.length)), content);
          }
        }
      }
    } else {
      const content = this._cache.get(from);
      if (content) {
        this._cache.delete(from);
        this._cache.set(to, content);
      }
    }

    this._updateWatchers(from, HostWatchEventType.Renamed);

    return empty();
  }

  list(path: Path): Observable<PathFragment[]> {
    path = this._toAbsolute(path);
    if (this._cache.has(path)) {
      return _throw(new PathIsFileException(path));
    }
    const fragments = split(path);
    const result = new Set<PathFragment>();
    if (path !== NormalizedRoot) {
      for (const p of this._cache.keys()) {
        if (p.startsWith(path + NormalizedSep)) {
          result.add(split(p)[fragments.length]);
        }
      }
    } else {
      for (const p of this._cache.keys()) {
        if (p.startsWith(NormalizedSep)) {
          result.add(split(p)[1]);
        }
      }
    }

    return observableOf([...result]);
  }

  exists(path: Path): Observable<boolean> {
    path = this._toAbsolute(path);

    return observableOf(this._cache.has(path) || this._isDir(path));
  }
  isDirectory(path: Path): Observable<boolean> {
    return observableOf(this._isDir(this._toAbsolute(path)));
  }
  isFile(path: Path): Observable<boolean> {
    return observableOf(this._cache.has(this._toAbsolute(path)));
  }

  stat(_path: Path): Observable<Stats<{}>> | null {
    return null;
  }

  watch(path: Path, options?: HostWatchOptions): Observable<HostWatchEvent> | null {
    path = this._toAbsolute(path);

    const subject = new Subject<HostWatchEvent>();
    let maybeWatcherArray = this._watchers.get(path);
    if (!maybeWatcherArray) {
      maybeWatcherArray = [];
      this._watchers.set(path, maybeWatcherArray);
    }

    maybeWatcherArray.push([options || {}, subject]);

    return subject.asObservable();
  }
}
