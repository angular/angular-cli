/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { EmptyTree } from '@angular-devkit/schematics';
import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';

describe(`Migration to remove 'defaultProject' option.`, () => {
  const schematicName = 'remove-default-project-option';
  const schematicRunner = new SchematicTestRunner(
    'migrations',
    require.resolve('../migration-collection.json'),
  );

  let tree: UnitTestTree;
  beforeEach(() => {
    tree = new UnitTestTree(new EmptyTree());
  });

  it(`should remove 'defaultProject'`, async () => {
    const angularConfig = {
      version: 1,
      projects: {},
      defaultProject: 'foo',
    };

    tree.create('/angular.json', JSON.stringify(angularConfig, undefined, 2));
    const newTree = await schematicRunner.runSchematic(schematicName, {}, tree);
    const { defaultProject } = JSON.parse(newTree.readContent('/angular.json'));

    expect(defaultProject).toBeUndefined();
  });

  it(`should not error when 'defaultProject' is not defined`, async () => {
    const angularConfig = {
      version: 1,
      projects: {},
    };

    tree.create('/angular.json', JSON.stringify(angularConfig, undefined, 2));
    const newTree = await schematicRunner.runSchematic(schematicName, {}, tree);
    const { defaultProject } = JSON.parse(newTree.readContent('/angular.json'));

    expect(defaultProject).toBeUndefined();
  });
});
