/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {SchematicContextImpl} from './context';
import {Collection, ResolvedSchematicDescription, Schematic, SchematicContext} from './interface';
import {MergeStrategy, Tree} from '../tree/interface';
import {BaseException} from '../exception/exception';

import {Observable} from 'rxjs/Observable';
import 'rxjs/add/observable/fromPromise';
import 'rxjs/add/observable/of';
import 'rxjs/add/operator/concatMap';


export class InvalidSchematicsNameException extends BaseException {
  constructor(path: string, name: string) {
    super(`Schematics at path "${path}" has invalid name "${name}".`);
  }
}


export class SchematicImpl implements Schematic {
  constructor(private _descriptor: ResolvedSchematicDescription,
              private _collection: Collection) {
    if (!_descriptor.name.match(/^[-_.a-zA-Z0-9]+$/)) {
      throw new InvalidSchematicsNameException(_descriptor.path, _descriptor.name);
    }
  }

  get name() { return this._descriptor.name; }
  get description() { return this._descriptor.description; }
  get path() { return this._descriptor.path; }
  get collection() { return this._collection; }

  call(host: Observable<Tree>, parentContext: Partial<SchematicContext>): Observable<Tree> {
    const context = new SchematicContextImpl(this, host,
        parentContext.strategy || MergeStrategy.Default);
    return host.concatMap(tree => {
      const result = this._descriptor.rule(tree, context);
      if (result instanceof Observable) {
        return result;
      } else {
        return Observable.of(result);
      }
    });
  }
}
