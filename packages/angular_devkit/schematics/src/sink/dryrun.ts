/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { normalize, virtualFs } from '@angular-devkit/core';
import { NodeJsSyncHost } from '@angular-devkit/core/node';
import { Observable, Subject, of } from 'rxjs';
import { HostSink } from './host';

export interface DryRunErrorEvent {
  kind: 'error';
  description: 'alreadyExist' | 'doesNotExist';
  path: string;
}
export interface DryRunDeleteEvent {
  kind: 'delete';
  path: string;
}
export interface DryRunCreateEvent {
  kind: 'create';
  path: string;
  content: ArrayBufferLike;
}
export interface DryRunUpdateEvent {
  kind: 'update';
  path: string;
  content: ArrayBufferLike;
}
export interface DryRunRenameEvent {
  kind: 'rename';
  path: string;
  to: string;
}

export type DryRunEvent =
  | DryRunErrorEvent
  | DryRunDeleteEvent
  | DryRunCreateEvent
  | DryRunUpdateEvent
  | DryRunRenameEvent;

export class DryRunSink extends HostSink {
  protected _subject: Subject<DryRunEvent> = new Subject();
  protected _fileDoesNotExistExceptionSet: Set<string> = new Set();
  protected _fileAlreadyExistExceptionSet: Set<string> = new Set();

  readonly reporter: Observable<DryRunEvent> = this._subject.asObservable();

  /**
   * @param {host} dir The host to use to output. This should be scoped.
   * @param {boolean} force Whether to force overwriting files that already exist.
   */
  constructor(host: virtualFs.Host, force?: boolean);

  constructor(host: virtualFs.Host | string, force = false) {
    super(
      typeof host == 'string'
        ? new virtualFs.ScopedHost(new NodeJsSyncHost(), normalize(host))
        : host,
      force,
    );
  }

  protected override _fileAlreadyExistException(path: string): void {
    this._fileAlreadyExistExceptionSet.add(path);
  }
  protected override _fileDoesNotExistException(path: string): void {
    this._fileDoesNotExistExceptionSet.add(path);
  }

  override _done(): Observable<void> {
    this._fileAlreadyExistExceptionSet.forEach((path) => {
      this._subject.next({
        kind: 'error',
        description: 'alreadyExist',
        path,
      });
    });
    this._fileDoesNotExistExceptionSet.forEach((path) => {
      this._subject.next({
        kind: 'error',
        description: 'doesNotExist',
        path,
      });
    });

    this._filesToDelete.forEach((path) => {
      // Check if this is a renaming.
      for (const [from] of this._filesToRename) {
        if (from == path) {
          // The event is sent later on.
          return;
        }
      }

      this._subject.next({ kind: 'delete', path });
    });
    this._filesToRename.forEach(([path, to]) => {
      this._subject.next({ kind: 'rename', path, to });
    });
    this._filesToCreate.forEach((content, path) => {
      // Check if this is a renaming.
      for (const [, to] of this._filesToRename) {
        if (to == path) {
          // The event is sent later on.
          return;
        }
      }
      if (
        this._fileAlreadyExistExceptionSet.has(path) ||
        this._fileDoesNotExistExceptionSet.has(path)
      ) {
        return;
      }

      this._subject.next({ kind: 'create', path, content });
    });
    this._filesToUpdate.forEach((content, path) => {
      this._subject.next({ kind: 'update', path, content });
    });

    this._subject.complete();

    return of<void>(undefined);
  }
}
