/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Observable } from 'rxjs';
import { Path, PathFragment } from '../path';


export type FileBuffer = ArrayBuffer;
export type FileBufferLike = ArrayBufferLike;

export interface HostWatchOptions {
  readonly persistent?: boolean;
  readonly recursive?: boolean;
}


export const enum HostWatchEventType {
  Changed = 0,
  Created = 1,
  Deleted = 2,
  Renamed = 3,  // Applied to the original file path.
}

export type Stats<T extends object = {}> = T & {
  isFile(): boolean;
  isDirectory(): boolean;

  readonly size: number;

  readonly atime: Date;
  readonly mtime: Date;
  readonly ctime: Date;
  readonly birthtime: Date;
};

export interface HostWatchEvent {
  readonly time: Date;
  readonly type: HostWatchEventType;
  readonly path: Path;
}

export interface HostCapabilities {
  synchronous: boolean;
}

export interface ReadonlyHost<StatsT extends object = {}> {
  readonly capabilities: HostCapabilities;

  read(path: Path): Observable<FileBuffer>;

  list(path: Path): Observable<PathFragment[]>;

  exists(path: Path): Observable<boolean>;
  isDirectory(path: Path): Observable<boolean>;
  isFile(path: Path): Observable<boolean>;

  // Some hosts may not support stats.
  stat(path: Path): Observable<Stats<StatsT> | null> | null;
}

export interface Host<StatsT extends object = {}> extends ReadonlyHost<StatsT> {
  write(path: Path, content: FileBufferLike): Observable<void>;
  delete(path: Path): Observable<void>;
  rename(from: Path, to: Path): Observable<void>;

  // Some hosts may not support watching.
  watch(path: Path, options?: HostWatchOptions): Observable<HostWatchEvent> | null;
}
