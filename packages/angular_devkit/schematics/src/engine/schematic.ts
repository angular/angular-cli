/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { BaseException } from '@angular-devkit/core';
import { Observable, concatMap, first, map } from 'rxjs';
import { callRule } from '../rules/call';
import { Tree } from '../tree/interface';
import { ScopedTree } from '../tree/scoped';
import {
  Collection,
  Engine,
  ExecutionOptions,
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
  implements Schematic<CollectionT, SchematicT>
{
  constructor(
    private _description: SchematicDescription<CollectionT, SchematicT>,
    private _factory: RuleFactory<{}>,
    private _collection: Collection<CollectionT, SchematicT>,
    private _engine: Engine<CollectionT, SchematicT>,
  ) {
    if (!_description.name.match(/^[-@/_.a-zA-Z0-9]+$/)) {
      throw new InvalidSchematicsNameException(_description.name);
    }
  }

  get description(): SchematicDescription<CollectionT, SchematicT> {
    return this._description;
  }
  get collection(): Collection<CollectionT, SchematicT> {
    return this._collection;
  }

  call<OptionT extends object>(
    options: OptionT,
    host: Observable<Tree>,
    parentContext?: Partial<TypedSchematicContext<CollectionT, SchematicT>>,
    executionOptions?: Partial<ExecutionOptions>,
  ): Observable<Tree> {
    const context = this._engine.createContext(this, parentContext, executionOptions);

    return host.pipe(
      first(),
      concatMap((tree) =>
        this._engine
          .transformOptions(this, options, context)
          .pipe(map((o) => [tree, o] as [Tree, OptionT])),
      ),
      concatMap(([tree, transformedOptions]) => {
        let input: Tree;
        let scoped = false;
        if (executionOptions && executionOptions.scope) {
          scoped = true;
          input = new ScopedTree(tree, executionOptions.scope);
        } else {
          input = tree;
        }

        return callRule(this._factory(transformedOptions), input, context).pipe(
          map((output) => {
            if (output === input) {
              return tree;
            } else if (scoped) {
              tree.merge(output);

              return tree;
            } else {
              return output;
            }
          }),
        );
      }),
    );
  }
}
