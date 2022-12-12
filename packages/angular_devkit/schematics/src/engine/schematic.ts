/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { BaseException } from '@angular-devkit/core';
import { lastValueFrom } from 'rxjs';
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

  get description() {
    return this._description;
  }
  get collection() {
    return this._collection;
  }

  async call<OptionT extends object>(
    options: OptionT,
    host: Tree,
    parentContext?: Partial<TypedSchematicContext<CollectionT, SchematicT>>,
    executionOptions?: Partial<ExecutionOptions>,
  ): Promise<Tree> {
    const context = this._engine.createContext(this, parentContext, executionOptions);

    const transformedOptions = await lastValueFrom(
      this._engine.transformOptions(this, options, context),
    );

    let input: Tree;
    let scoped = false;
    if (executionOptions && executionOptions.scope) {
      scoped = true;
      input = new ScopedTree(host, executionOptions.scope);
    } else {
      input = host;
    }

    const output = await callRule(this._factory(transformedOptions), input, context);
    if (output === input) {
      return host;
    } else if (scoped) {
      host.merge(output);

      return host;
    } else {
      return output;
    }
  }
}
