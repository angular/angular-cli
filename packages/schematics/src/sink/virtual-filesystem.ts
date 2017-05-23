import {SimpleSinkBase} from './sink';
import {CreateFileAction} from '../tree/action';
import {FileDoesNotExistException} from '../exception/exception';
import {UpdateBuffer} from '../utility/update-buffer';

import {Observable} from 'rxjs/Observable';
import 'rxjs/add/observable/merge';
import 'rxjs/add/operator/reduce';


export interface VirtualFileSystemSinkHost {
  write(path: string, content: Buffer): Observable<void>;
  delete(path: string): Observable<void>;
  exists(path: string): Observable<boolean>;
  rename(path: string, to: string): Observable<void>;
}


export abstract class VirtualFileSystemSink extends SimpleSinkBase {
  protected _filesToDelete = new Set<string>();
  protected _filesToRename = new Set<[string, string]>();
  protected _filesToCreate = new Map<string, UpdateBuffer>();
  protected _filesToUpdate = new Map<string, UpdateBuffer>();

  constructor(protected _host: VirtualFileSystemSinkHost, protected _force = false) { super(); }

  protected _validateCreateAction(action: CreateFileAction): Observable<void> {
    return this._force ? Observable.empty<void>() : super._validateCreateAction(action);
  }

  protected _readFile(p: string): Observable<UpdateBuffer> {
    const maybeCreate = this._filesToCreate.get(p);
    if (maybeCreate) {
      return Observable.of(maybeCreate);
    }

    const maybeUpdate = this._filesToUpdate.get(p);
    if (maybeUpdate) {
      return Observable.of(maybeUpdate);
    }

    throw new FileDoesNotExistException(p);
  }

  protected _validateFileExists(p: string): Observable<boolean> {
    if (this._filesToCreate.has(p) || this._filesToUpdate.has(p)) {
      return Observable.of(true);
    } else if (this._filesToDelete.has(p)) {
      return Observable.of(false);
    } else {
      return this._host.exists(p);
    }
  }

  protected _overwriteFile(path: string, content: Buffer): Observable<void> {
    this._filesToUpdate.set(path, new UpdateBuffer(content));
    return Observable.empty<void>();
  }
  protected _createFile(path: string, content: Buffer): Observable<void> {
    this._filesToCreate.set(path, new UpdateBuffer(content));
    return Observable.empty<void>();
  }
  protected _renameFile(from: string, to: string): Observable<void> {
    this._filesToRename.add([from, to]);

    return this._readFile(from)
      .do(buffer => this._filesToCreate.set(to, buffer))
      .do(() => this._filesToDelete.add(from))
      .map(() => {});
  }
  protected _deleteFile(path: string): Observable<void> {
    if (this._filesToCreate.has(path)) {
      this._filesToCreate.delete(path);
      this._filesToUpdate.delete(path);
    } else {
      this._filesToDelete.add(path);
    }
    return Observable.empty<void>();
  }

  _done() {
    // Really commit everything to the actual filesystem.
    return Observable.concat<any>(
      Observable.from([...this._filesToDelete.values()])
        .concatMap(path => this._host.delete(path)),
      Observable.from([...this._filesToCreate.entries()])
        .concatMap(([path, buffer]) => this._host.write(path, buffer.generate())),
      Observable.from([...this._filesToRename.entries()])
        .concatMap(([_, [path, to]]) => this._host.rename(path, to)),
      Observable.from([...this._filesToUpdate.entries()])
        .concatMap(([path, buffer]) => this._host.write(path, buffer.generate()))
    ).reduce(() => {});
  }
}
