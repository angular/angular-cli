/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { EmptyTree } from '@angular-devkit/schematics';
import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import { ProjectType, WorkspaceSchema } from '../../utility/workspace-models';

describe(`Migration to replace 'defaultCollection' option.`, () => {
  const schematicName = 'replace-default-collection-option';
  const schematicRunner = new SchematicTestRunner(
    'migrations',
    require.resolve('../migration-collection.json'),
  );

  let tree: UnitTestTree;
  beforeEach(() => {
    tree = new UnitTestTree(new EmptyTree());
  });

  it(`should replace 'defaultCollection' with 'schematicCollections' at the root level`, async () => {
    const angularConfig = {
      version: 1,
      projects: {},
      cli: {
        defaultCollection: 'foo',
      },
    };

    tree.create('/angular.json', JSON.stringify(angularConfig, undefined, 2));
    const newTree = await schematicRunner.runSchematic(schematicName, {}, tree);
    const { cli } = JSON.parse(newTree.readContent('/angular.json'));

    expect(cli.defaultCollection).toBeUndefined();
    expect(cli.schematicCollections).toEqual(['foo']);
  });

  it(`should not error when 'cli' is not defined`, async () => {
    const angularConfig: WorkspaceSchema = {
      version: 1,
      projects: {},
    };

    tree.create('/angular.json', JSON.stringify(angularConfig, undefined, 2));
    const newTree = await schematicRunner.runSchematic(schematicName, {}, tree);
    const { cli } = JSON.parse(newTree.readContent('/angular.json'));

    expect(cli).toBeUndefined();
  });

  it(`should replace 'defaultCollection' with 'schematicCollections' at the project level`, async () => {
    const angularConfig = {
      version: 1,
      cli: {
        defaultCollection: 'foo',
      },
      projects: {
        test: {
          sourceRoot: '',
          root: '',
          prefix: '',
          projectType: ProjectType.Application,
          cli: {
            defaultCollection: 'bar',
          },
        },
      },
    };

    tree.create('/angular.json', JSON.stringify(angularConfig, undefined, 2));
    const newTree = await schematicRunner.runSchematic(schematicName, {}, tree);
    const {
      projects: { test },
    } = JSON.parse(newTree.readContent('/angular.json'));

    expect(test.cli.defaultCollection).toBeUndefined();
    expect(test.cli.schematicCollections).toEqual(['bar']);
  });

  it(`should not replace 'defaultCollection' with 'schematicCollections', when it is already defined`, async () => {
    const angularConfig = {
      version: 1,
      projects: {},
      cli: {
        defaultCollection: 'foo',
        schematicCollections: ['bar'],
      },
    };

    tree.create('/angular.json', JSON.stringify(angularConfig, undefined, 2));
    const newTree = await schematicRunner.runSchematic(schematicName, {}, tree);
    const { cli } = JSON.parse(newTree.readContent('/angular.json'));

    expect(cli.defaultCollection).toBeUndefined();
    expect(cli.schematicCollections).toEqual(['bar']);
  });
});
