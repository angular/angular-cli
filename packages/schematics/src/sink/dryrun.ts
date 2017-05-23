import {FileSystemSink} from './filesystem';

import {Observable} from 'rxjs';
import {Subject} from 'rxjs';



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
  content: Buffer;
}
export interface DryRunUpdateEvent {
  kind: 'update';
  path: string;
  content: Buffer;
}
export interface DryRunRenameEvent {
  kind: 'rename';
  path: string;
  to: string;
}

export type DryRunEvent = DryRunErrorEvent
                        | DryRunDeleteEvent
                        | DryRunCreateEvent
                        | DryRunUpdateEvent
                        | DryRunRenameEvent;


export class DryRunSink extends FileSystemSink {
  protected _subject = new Subject<DryRunEvent>();
  protected _fileDoesNotExistExceptionSet = new Set<string>();
  protected _fileAlreadyExistExceptionSet = new Set<string>();

  readonly reporter: Observable<DryRunEvent> = this._subject.asObservable();

  constructor(root = '', force = false) { super(root, force); }

  protected _fileAlreadyExistException(path: string): void {
    this._fileAlreadyExistExceptionSet.add(path);
  }
  protected _fileDoesNotExistException(path: string): void {
    this._fileDoesNotExistExceptionSet.add(path);
  }

  _done() {
    this._fileAlreadyExistExceptionSet.forEach(path => {
      this._subject.next({
        kind: 'error',
        description: 'alreadyExist',
        path
      });
    });
    this._fileDoesNotExistExceptionSet.forEach(path => {
      this._subject.next({
        kind: 'error',
        description: 'doesNotExist',
        path
      });
    });

    this._filesToDelete.forEach(path => {
      // Check if this is a renaming.
      for (const [from, _] of this._filesToRename) {
        if (from == path) {
          // The event is sent later on.
          return;
        }
      }

      const content = null;
      this._subject.next({ kind: 'delete', path, content });
    });
    this._filesToCreate.forEach((content, path) => {
      // Check if this is a renaming.
      for (const [_, to] of this._filesToRename) {
        if (to == path) {
          // The event is sent later on.
          return;
        }
      }
      if (this._fileAlreadyExistExceptionSet.has(path)
          || this._fileDoesNotExistExceptionSet.has(path)) {
        return;
      }

      this._subject.next({ kind: 'create', path, content: content.generate() });
    });
    this._filesToUpdate.forEach((content, path) => {
      this._subject.next({ kind: 'update', path, content: content.generate() });
    });
    this._filesToRename.forEach(([path, to]) => {
      this._subject.next({ kind: 'rename', path, to, content: null });
    });

    this._subject.complete();
    return Observable.empty<void>();
  }
}

