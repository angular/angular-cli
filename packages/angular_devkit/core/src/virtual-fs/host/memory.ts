/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Observable, Subject } from 'rxjs';
import {
  FileAlreadyExistException,
  FileDoesNotExistException,
  PathIsDirectoryException,
  PathIsFileException,
} from '../../exception';
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


export interface SimpleMemoryHostStats {
  readonly content: FileBuffer | null;
}

export class SimpleMemoryHost implements Host<{}> {
  protected _cache = new Map<Path, Stats<SimpleMemoryHostStats>>();
  private _watchers = new Map<Path, [HostWatchOptions, Subject<HostWatchEvent>][]>();

  protected _newDirStats() {
    return {
      inspect() { return '<Directory>'; },

      isFile() { return false; },
      isDirectory() { return true; },
      size: 0,

      atime: new Date(),
      ctime: new Date(),
      mtime: new Date(),
      birthtime: new Date(),

      content: null,
    };
  }
  protected _newFileStats(content: FileBuffer, oldStats?: Stats<SimpleMemoryHostStats>) {
    return {
      inspect() { return `<File size(${content.byteLength})>`; },

      isFile() { return true; },
      isDirectory() { return false; },
      size: content.byteLength,

      atime: oldStats ? oldStats.atime : new Date(),
      ctime: new Date(),
      mtime: new Date(),
      birthtime: oldStats ? oldStats.birthtime : new Date(),

      content,
    };
  }

  constructor() {
    this._cache.set(normalize('/'), this._newDirStats());
  }

  protected _toAbsolute(path: Path) {
    return isAbsolute(path) ? path : normalize('/' + path);
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

  /**
   * List of protected methods that give direct access outside the observables to the cache
   * and internal states.
   */
  protected _write(path: Path, content: FileBuffer): void {
    path = this._toAbsolute(path);
    const old = this._cache.get(path);
    if (old && old.isDirectory()) {
      throw new PathIsDirectoryException(path);
    }

    // Update all directories. If we find a file we know it's an invalid write.
    const fragments = split(path);
    let curr: Path = normalize('/');
    for (const fr of fragments) {
      curr = join(curr, fr);
      const maybeStats = this._cache.get(fr);
      if (maybeStats) {
        if (maybeStats.isFile()) {
          throw new PathIsFileException(curr);
        }
      } else {
        this._cache.set(curr, this._newDirStats());
      }
    }

    // Create the stats.
    const stats: Stats<SimpleMemoryHostStats> = this._newFileStats(content, old);
    this._cache.set(path, stats);
    this._updateWatchers(path, old ? HostWatchEventType.Changed : HostWatchEventType.Created);
  }
  protected _read(path: Path): FileBuffer {
    path = this._toAbsolute(path);
    const maybeStats = this._cache.get(path);
    if (!maybeStats) {
      throw new FileDoesNotExistException(path);
    } else if (maybeStats.isDirectory()) {
      throw new PathIsDirectoryException(path);
    } else if (!maybeStats.content) {
      throw new PathIsDirectoryException(path);
    } else {
      return maybeStats.content;
    }
  }
  protected _delete(path: Path): void {
    path = this._toAbsolute(path);
    if (this._isDirectory(path)) {
      for (const [cachePath] of this._cache.entries()) {
        if (cachePath.startsWith(path + NormalizedSep) || cachePath === path) {
          this._cache.delete(cachePath);
        }
      }
    } else {
      this._cache.delete(path);
    }
    this._updateWatchers(path, HostWatchEventType.Deleted);
  }
  protected _rename(from: Path, to: Path): void {
    from = this._toAbsolute(from);
    to = this._toAbsolute(to);
    if (!this._cache.has(from)) {
      throw new FileDoesNotExistException(from);
    } else if (this._cache.has(to)) {
      throw new FileAlreadyExistException(to);
    }

    if (this._isDirectory(from)) {
      for (const path of this._cache.keys()) {
        if (path.startsWith(from + NormalizedSep)) {
          const content = this._cache.get(path);
          if (content) {
            // We don't need to clone or extract the content, since we're moving files.
            this._cache.set(join(to, NormalizedSep, path.slice(from.length)), content);
          }
        }
      }
    } else {
      const content = this._cache.get(from);
      if (content) {
        const fragments = split(to);
        const newDirectories = [];
        let curr: Path = normalize('/');
        for (const fr of fragments) {
          curr = join(curr, fr);
          const maybeStats = this._cache.get(fr);
          if (maybeStats) {
            if (maybeStats.isFile()) {
              throw new PathIsFileException(curr);
            }
          } else {
            newDirectories.push(curr);
          }
        }
        for (const newDirectory of newDirectories) {
          this._cache.set(newDirectory, this._newDirStats());
        }
        this._cache.delete(from);
        this._cache.set(to, content);
      }
    }

    this._updateWatchers(from, HostWatchEventType.Renamed);
  }

  protected _list(path: Path): PathFragment[] {
    path = this._toAbsolute(path);
    if (this._isFile(path)) {
      throw new PathIsFileException(path);
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
        if (p.startsWith(NormalizedSep) && p !== NormalizedRoot) {
          result.add(split(p)[1]);
        }
      }
    }

    return [...result];
  }

  protected _exists(path: Path): boolean {
    return !!this._cache.get(this._toAbsolute(path));
  }
  protected _isDirectory(path: Path): boolean {
    const maybeStats = this._cache.get(this._toAbsolute(path));

    return maybeStats ? maybeStats.isDirectory() : false;
  }
  protected _isFile(path: Path): boolean {
    const maybeStats = this._cache.get(this._toAbsolute(path));

    return maybeStats ? maybeStats.isFile() : false;
  }

  protected _stat(path: Path): Stats<SimpleMemoryHostStats> | null {
    const maybeStats = this._cache.get(this._toAbsolute(path));

    if (!maybeStats) {
      return null;
    } else {
      return maybeStats;
    }
  }

  protected _watch(path: Path, options?: HostWatchOptions): Observable<HostWatchEvent> {
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

  write(path: Path, content: FileBuffer): Observable<void> {
    return new Observable<void>(obs => {
      this._write(path, content);
      obs.next();
      obs.complete();
    });
  }

  read(path: Path): Observable<FileBuffer> {
    return new Observable<FileBuffer>(obs => {
      const content = this._read(path);
      obs.next(content);
      obs.complete();
    });
  }

  delete(path: Path): Observable<void> {
    return new Observable<void>(obs => {
      this._delete(path);
      obs.next();
      obs.complete();
    });
  }

  rename(from: Path, to: Path): Observable<void> {
    return new Observable<void>(obs => {
      this._rename(from, to);
      obs.next();
      obs.complete();
    });
  }

  list(path: Path): Observable<PathFragment[]> {
    return new Observable<PathFragment[]>(obs => {
      obs.next(this._list(path));
      obs.complete();
    });
  }

  exists(path: Path): Observable<boolean> {
    return new Observable<boolean>(obs => {
      obs.next(this._exists(path));
      obs.complete();
    });
  }

  isDirectory(path: Path): Observable<boolean> {
    return new Observable<boolean>(obs => {
      obs.next(this._isDirectory(path));
      obs.complete();
    });
  }

  isFile(path: Path): Observable<boolean> {
    return new Observable<boolean>(obs => {
      obs.next(this._isFile(path));
      obs.complete();
    });
  }

  // Some hosts may not support stat.
  stat(path: Path): Observable<Stats<{}> | null> | null {
    return new Observable<Stats<{}> | null>(obs => {
      obs.next(this._stat(path));
      obs.complete();
    });
  }

  watch(path: Path, options?: HostWatchOptions): Observable<HostWatchEvent> | null {
    return this._watch(path, options);
  }

  reset(): void {
    this._cache.clear();
    this._watchers.clear();
  }
}
