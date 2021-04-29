/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { EmptyTree } from '@angular-devkit/schematics';
import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import { Builders, ProjectType, WorkspaceSchema } from '../../utility/workspace-models';

function createWorkSpaceConfig(tree: UnitTestTree) {
  const angularConfig: WorkspaceSchema = {
    version: 1,
    projects: {
      lib: {
        root: '/project/lib',
        sourceRoot: '/project/lib/src',
        projectType: ProjectType.Library,
        prefix: 'lib',
        architect: {
          build: {
            builder: Builders.NgPackagr,
            options: {
              tsConfig: 'projects/lib/tsconfig.lib.json',
            },
            configurations: {
              production: {
                tsConfig: 'projects/lib/tsconfig.lib.prod.json',
              },
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any,
        },
      },
    },
  };

  tree.create('/angular.json', JSON.stringify(angularConfig, undefined, 2));
}

describe(`Migration to add 'declarationMap' compiler option`, () => {
  const schematicName = 'add-declaration-map-compiler-option';

  const schematicRunner = new SchematicTestRunner(
    'migrations',
    require.resolve('../migration-collection.json'),
  );

  let tree: UnitTestTree;
  beforeEach(() => {
    tree = new UnitTestTree(new EmptyTree());
    createWorkSpaceConfig(tree);
    const tsConfig = JSON.stringify({ compilerOptions: {} }, undefined, 2);
    tree.create('/projects/lib/tsconfig.lib.json', tsConfig);
    tree.create('/projects/lib/tsconfig.lib.prod.json', tsConfig);
  });

  it(`should be added with a value of 'false' in a prod tsconfig`, async () => {
    const newTree = await schematicRunner.runSchematicAsync(schematicName, {}, tree).toPromise();
    const { compilerOptions } = JSON.parse(
      newTree.readContent('/projects/lib/tsconfig.lib.prod.json'),
    );
    expect(compilerOptions.declarationMap).toBeFalse();
  });

  it(`should be added with a value of 'true' in a non prod tsconfig`, async () => {
    const newTree = await schematicRunner.runSchematicAsync(schematicName, {}, tree).toPromise();
    const { compilerOptions } = JSON.parse(newTree.readContent('/projects/lib/tsconfig.lib.json'));
    expect(compilerOptions.declarationMap).toBeTrue();
  });

  it('should not be overriden when already set', async () => {
    const tsConfigPath = '/projects/lib/tsconfig.lib.json';
    tree.overwrite(
      tsConfigPath,
      JSON.stringify(
        {
          compilerOptions: {
            declarationMap: false,
          },
        },
        undefined,
        2,
      ),
    );

    const newTree = await schematicRunner.runSchematicAsync(schematicName, {}, tree).toPromise();
    const { compilerOptions } = JSON.parse(newTree.readContent(tsConfigPath));
    expect(compilerOptions.declarationMap).toBeFalse();
  });
});
