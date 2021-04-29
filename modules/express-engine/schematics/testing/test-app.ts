/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';

/** Path to the collection file for the NgUniversal schematics */
export const collectionPath = require.resolve('../collection.json');

/** Create a base app used for testing. */
export async function createTestApp(appOptions = {}): Promise<UnitTestTree> {
  const baseRunner = new SchematicTestRunner('universal-schematics', collectionPath);

  const tree = await baseRunner
    .runExternalSchematicAsync('@schematics/angular', 'workspace', {
      name: 'workspace',
      version: '6.0.0',
      newProjectRoot: 'projects',
    })
    .toPromise();

  return baseRunner
    .runExternalSchematicAsync(
      '@schematics/angular',
      'application',
      {
        ...appOptions,
        name: 'test-app',
      },
      tree,
    )
    .toPromise();
}
