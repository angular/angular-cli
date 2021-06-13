/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { EmptyTree } from '@angular-devkit/schematics';
import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';

describe('Migration to remove schematics old options in angular.json', () => {
  const workspacePath = '/angular.json';
  const schematicName = 'schematic-options-12';

  const schematicRunner = new SchematicTestRunner(
    'migrations',
    require.resolve('../migration-collection.json'),
  );

  let tree: UnitTestTree;

  beforeEach(async () => {
    tree = new UnitTestTree(new EmptyTree());
    tree = await schematicRunner
      .runExternalSchematicAsync(
        require.resolve('../../collection.json'),
        'ng-new',
        {
          name: 'migration-test',
          version: '1.2.3',
          directory: '.',
        },
        tree,
      )
      .toPromise();
  });

  describe('schematic options', () => {
    it('should remove `skipTests` from `@schematics/angular:module`', async () => {
      const workspace = JSON.parse(tree.readContent(workspacePath));
      workspace.schematics = {
        '@schematics/angular:module': {
          skipTests: true,
        },
      };
      tree.overwrite(workspacePath, JSON.stringify(workspace, undefined, 2));

      const tree2 = await schematicRunner
        .runSchematicAsync(schematicName, {}, tree.branch())
        .toPromise();
      const { schematics } = JSON.parse(tree2.readContent(workspacePath));
      expect(schematics['@schematics/angular:module'].skipTests).toBeUndefined();
    });

    it('should not remove `skipTests` from non `@schematics/angular:module` schematic', async () => {
      const workspace = JSON.parse(tree.readContent(workspacePath));
      workspace.schematics = {
        '@schematics/angular:component': {
          skipTests: true,
        },
        '@schematics/some-other:module': {
          skipTests: true,
        },
      };
      tree.overwrite(workspacePath, JSON.stringify(workspace, undefined, 2));

      const tree2 = await schematicRunner
        .runSchematicAsync(schematicName, {}, tree.branch())
        .toPromise();
      const { schematics } = JSON.parse(tree2.readContent(workspacePath));
      expect(schematics['@schematics/angular:component'].skipTests).toBeTrue();
      expect(schematics['@schematics/some-other:module'].skipTests).toBeTrue();
    });
  });
});
