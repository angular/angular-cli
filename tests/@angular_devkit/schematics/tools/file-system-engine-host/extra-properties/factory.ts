/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// tslint:disable-next-line:no-implicit-dependencies
import { SchematicContext, Tree } from '@angular-devkit/schematics';

export default function(options: {}) {
  return (tree: Tree, context: SchematicContext) => {
    debugger;
    // We pass information back to the test.
    tree.create(
      (context.schematic.description as any).extra,  // tslint:disable-line:no-any
      (context.schematic.collection.description as any).extra,  // tslint:disable-line:no-any
    );
  };
}

