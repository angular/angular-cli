/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { ExecutionOptions, Rule, SchematicContext } from '../engine/interface';
import { MergeStrategy, Tree } from '../tree/interface';
import { branch } from '../tree/static';

/**
 * Run a schematic from a separate collection.
 *
 * @param collectionName The name of the collection that contains the schematic to run.
 * @param schematicName The name of the schematic to run.
 * @param options The options to pass as input to the RuleFactory.
 */
export function externalSchematic<OptionT extends object>(
  collectionName: string,
  schematicName: string,
  options: OptionT,
  executionOptions?: Partial<ExecutionOptions>,
): Rule {
  return async (input: Tree, context: SchematicContext) => {
    const collection = context.engine.createCollection(
      collectionName,
      context.schematic.collection,
    );
    const schematic = collection.createSchematic(schematicName);
    const tree = await schematic.call(options, branch(input), context, executionOptions);
    input.merge(tree, MergeStrategy.AllowOverwriteConflict);

    return input;
  };
}

/**
 * Run a schematic from the same collection.
 *
 * @param schematicName The name of the schematic to run.
 * @param options The options to pass as input to the RuleFactory.
 */
export function schematic<OptionT extends object>(
  schematicName: string,
  options: OptionT,
  executionOptions?: Partial<ExecutionOptions>,
): Rule {
  return async (input: Tree, context: SchematicContext) => {
    const collection = context.schematic.collection;
    const schematic = collection.createSchematic(schematicName, true);

    const tree = await schematic.call(options, branch(input), context, executionOptions);
    input.merge(tree, MergeStrategy.AllowOverwriteConflict);

    return input;
  };
}
