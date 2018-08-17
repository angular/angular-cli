/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { of as observableOf } from 'rxjs';
import { last, map } from 'rxjs/operators';
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
  return (input: Tree, context: SchematicContext) => {
    const collection = context.engine.createCollection(collectionName);
    const schematic = collection.createSchematic(schematicName);

    return schematic.call(options, observableOf(branch(input)), context, executionOptions);
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
  return (input: Tree, context: SchematicContext) => {
    const collection = context.schematic.collection;
    const schematic = collection.createSchematic(schematicName, true);

    return schematic.call(options, observableOf(branch(input)), context, executionOptions).pipe(
      last(),
      map(x => {
        // We allow overwrite conflict here because they're the only merge conflict we particularly
        // don't want to deal with; the input tree might have an OVERWRITE which the sub
        input.merge(x, MergeStrategy.AllowOverwriteConflict);

        return input;
      }),
    );
  };
}
