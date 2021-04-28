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

function createWorkSpaceConfig(tree: UnitTestTree) {
  const angularConfig: WorkspaceSchema = {
    version: 1,
    projects: {
      lib: {
        root: '/project/lib',
        sourceRoot: '/project/lib/src',
        projectType: ProjectType.Library,
        prefix: 'lib',
        architect: {},
      },
    },
  };

  tree.create('/angular.json', JSON.stringify(angularConfig, undefined, 2));
}

describe(`Migration to add tslib as a direct dependency in library projects`, () => {
  const schematicName = 'update-libraries-tslib';

  const schematicRunner = new SchematicTestRunner(
    'migrations',
    require.resolve('../migration-collection.json'),
  );

  let tree: UnitTestTree;
  beforeEach(() => {
    tree = new UnitTestTree(new EmptyTree());
    createWorkSpaceConfig(tree);

    tree.create(
      '/project/lib/package.json',
      JSON.stringify(
        {
          peerDependencies: {
            '@angular/common': '^9.0.0',
            '@angular/core': '^9.0.0',
            'tslib': '1.0.0',
          },
        },
        undefined,
        2,
      ),
    );
  });

  it(`should update tslib to version 2 as a direct dependency`, async () => {
    const newTree = await schematicRunner.runSchematicAsync(schematicName, {}, tree).toPromise();
    const { peerDependencies, dependencies } = JSON.parse(
      newTree.readContent('/project/lib/package.json'),
    );
    expect(peerDependencies['tslib']).toBeUndefined();
    expect(dependencies['tslib']).toBe('^2.0.0');
  });
});
