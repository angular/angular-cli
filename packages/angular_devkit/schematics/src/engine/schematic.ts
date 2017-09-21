/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { BaseException } from '@angular-devkit/core';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/observable/of';
import 'rxjs/add/operator/concatMap';
import { Tree } from '../tree/interface';
import {
  Collection,
  Engine,
  RuleFactory,
  Schematic,
  SchematicDescription,
  TypedSchematicContext,
} from './interface';


export class InvalidSchematicsNameException extends BaseException {
  constructor(name: string) {
    super(`Schematics has invalid name: "${name}".`);
  }
}


export class SchematicImpl<CollectionT extends object, SchematicT extends object>
    implements Schematic<CollectionT, SchematicT> {

  constructor(private _description: SchematicDescription<CollectionT, SchematicT>,
              private _factory: RuleFactory<any>,  // tslint:disable-line:no-any
              private _collection: Collection<CollectionT, SchematicT>,
              private _engine: Engine<CollectionT, SchematicT>) {
    if (!_description.name.match(/^[-_.a-zA-Z0-9]+$/)) {
      throw new InvalidSchematicsNameException(_description.name);
    }
  }

  get description() { return this._description; }
  get collection() { return this._collection; }

  call<OptionT extends object>(options: OptionT, host: Observable<Tree>): Observable<Tree> {
    const context: TypedSchematicContext<CollectionT, SchematicT> = {
      engine: this._engine,
      schematic: this,
      strategy: this._engine.defaultMergeStrategy,
    };

    return host.concatMap(tree => {
      const transformedOptions = this._engine.transformOptions(this, options);

      const result = this._factory(transformedOptions)(tree, context);
      if (result instanceof Observable) {
        return result;
      } else {
        return Observable.of(result);
      }
    });
  }
}
