/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Observable } from 'rxjs';
import { Path, PathFragment, join, normalize } from '../path';
import { fileBufferToString, stringToFileBuffer } from './buffer';
import { FileBuffer, HostWatchEvent, HostWatchOptions, Stats } from './interface';
import { SimpleMemoryHost, SimpleMemoryHostStats } from './memory';
import { SyncDelegateHost } from './sync';

export namespace test {

  export type TestLogRecord = {
    kind: 'write' | 'read' | 'delete' | 'list' | 'exists' | 'isDirectory' | 'isFile' | 'stat'
    | 'watch';
    path: Path;
  } | {
    kind: 'rename';
    from: Path;
    to: Path;
  };


  export class TestHost extends SimpleMemoryHost {
    protected _records: TestLogRecord[] = [];
    protected _sync: SyncDelegateHost<{}>;

    constructor(map: { [path: string]: string } = {}) {
      super();

      for (const filePath of Object.getOwnPropertyNames(map)) {
        this._write(normalize(filePath), stringToFileBuffer(map[filePath]));
      }
    }

    get records(): TestLogRecord[] {
      return [...this._records];
    }
    clearRecords() {
      this._records = [];
    }

    get files(): Path[] {
      const sync = this.sync;
      function _visit(p: Path): Path[] {
        return sync.list(p)
          .map(fragment => join(p, fragment))
          .reduce((files, path) => {
            if (sync.isDirectory(path)) {
              return files.concat(_visit(path));
            } else {
              return files.concat(path);
            }
          }, [] as Path[]);
      }

      return _visit(normalize('/'));
    }

    get sync() {
      if (!this._sync) {
        this._sync = new SyncDelegateHost<{}>(this);
      }

      return this._sync;
    }

    clone() {
      const newHost = new TestHost();
      newHost._cache = new Map(this._cache);

      return newHost;
    }

    // Override parents functions to keep a record of all operators that were done.
    protected _write(path: Path, content: FileBuffer) {
      this._records.push({ kind: 'write', path });

      return super._write(path, content);
    }
    protected _read(path: Path) {
      this._records.push({ kind: 'read', path });

      return super._read(path);
    }
    protected _delete(path: Path) {
      this._records.push({ kind: 'delete', path });

      return super._delete(path);
    }
    protected _rename(from: Path, to: Path) {
      this._records.push({ kind: 'rename', from, to });

      return super._rename(from, to);
    }
    protected _list(path: Path): PathFragment[] {
      this._records.push({ kind: 'list', path });

      return super._list(path);
    }
    protected _exists(path: Path) {
      this._records.push({ kind: 'exists', path });

      return super._exists(path);
    }
    protected _isDirectory(path: Path) {
      this._records.push({ kind: 'isDirectory', path });

      return super._isDirectory(path);
    }
    protected _isFile(path: Path) {
      this._records.push({ kind: 'isFile', path });

      return super._isFile(path);
    }
    protected _stat(path: Path): Stats<SimpleMemoryHostStats> | null {
      this._records.push({ kind: 'stat', path });

      return super._stat(path);
    }
    protected _watch(path: Path, options?: HostWatchOptions): Observable<HostWatchEvent> {
      this._records.push({ kind: 'watch', path });

      return super._watch(path, options);
    }

    $write(path: string, content: string) {
      return super._write(normalize(path), stringToFileBuffer(content));
    }

    $read(path: string): string {
      return fileBufferToString(super._read(normalize(path)));
    }

    $list(path: string): PathFragment[] {
      return super._list(normalize(path));
    }

    $exists(path: string) {
      return super._exists(normalize(path));
    }

    $isDirectory(path: string) {
      return super._isDirectory(normalize(path));
    }

    $isFile(path: string) {
      return super._isFile(normalize(path));
    }
  }

}
