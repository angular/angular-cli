/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {
  Collection,
  Engine,
  RuleFactory,
  Schematic,
  SchematicDescription,
  TypedSchematicContext
} from './interface';
import {Tree} from '../tree/interface';
import {BaseException} from '../exception/exception';

import {Observable} from 'rxjs/Observable';
import 'rxjs/add/observable/fromPromise';
import 'rxjs/add/observable/of';
import 'rxjs/add/operator/concatMap';


export class InvalidSchematicsNameException extends BaseException {
  constructor(name: string) {
    super(`Schematics has invalid name: "${name}".`);
  }
}


export class SchematicImpl<CollectionT, SchematicT> implements Schematic<CollectionT, SchematicT> {
  constructor(private _description: SchematicDescription<CollectionT, SchematicT>,
              private _factory: RuleFactory<any>,
              private _collection: Collection<CollectionT, SchematicT>,
              private _engine: Engine<CollectionT, SchematicT>) {
    if (!_description.name.match(/^[-_.a-zA-Z0-9]+$/)) {
      throw new InvalidSchematicsNameException(_description.name);
    }
  }

  get description() { return this._description; }
  get collection() { return this._collection; }

  call<OptionT>(options: OptionT, host: Observable<Tree>): Observable<Tree> {
    let context: TypedSchematicContext<CollectionT, SchematicT> = {
      engine: this._engine,
      schematic: this,
      host,
      strategy: this._engine.defaultMergeStrategy
    };

    return host.concatMap(tree => {
      const result = this._factory(options)(tree, context);
      if (result instanceof Observable) {
        return result;
      } else {
        return Observable.of(result);
      }
    });
  }
}
