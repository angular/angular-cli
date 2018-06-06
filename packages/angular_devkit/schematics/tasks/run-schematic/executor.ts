/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { SchematicContext, TaskExecutor } from '../../src';
import { RunSchematicTaskOptions } from './options';


export default function(): TaskExecutor<RunSchematicTaskOptions<{}>> {
  return (options: RunSchematicTaskOptions<{}>, context: SchematicContext) => {
    const maybeWorkflow = context.engine.workflow;
    const collection = options.collection || context.schematic.collection.description.name;

    if (!maybeWorkflow) {
      throw new Error('Need Workflow to support executing schematics as post tasks.');
    }

    return maybeWorkflow.execute({
      collection: collection,
      schematic: options.name,
      options: options.options,
      // Allow private when calling from the same collection.
      allowPrivate: collection == context.schematic.collection.description.name,
    });
  };
}
