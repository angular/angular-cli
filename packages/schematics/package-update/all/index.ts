/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Rule, SchematicContext, Tree, chain, schematic } from '@angular-devkit/schematics';
import { SchematicsUpdateSchema } from '../schema';


export default function(options: SchematicsUpdateSchema): Rule {
  return (tree: Tree, context: SchematicContext) => {
    return chain(
      context.schematic.collection.listSchematics()
        .filter(name => name != context.schematic.description.name)
        .map(name => schematic(name, options)),
    )(tree, context);
  };
}
