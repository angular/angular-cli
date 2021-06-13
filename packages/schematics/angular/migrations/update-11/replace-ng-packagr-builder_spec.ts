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
            builder: Builders.DeprecatedNgPackagr,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any,
        },
      },
    },
  };

  tree.create('/angular.json', JSON.stringify(angularConfig, undefined, 2));
}

describe(`Migration to replace '@angular-devkit/build-ng-packagr' builder`, () => {
  const schematicName = 'replace-ng-packagr-builder';

  const schematicRunner = new SchematicTestRunner(
    'migrations',
    require.resolve('../migration-collection.json'),
  );

  let tree: UnitTestTree;
  beforeEach(() => {
    tree = new UnitTestTree(new EmptyTree());
    createWorkSpaceConfig(tree);
    tree.create(
      '/package.json',
      JSON.stringify(
        {
          devDependencies: {
            '@angular/compiler-cli': '0.0.0',
            '@angular-devkit/build-ng-packagr': '0.0.0',
          },
        },
        undefined,
        2,
      ),
    );
  });

  it(`should remove '@angular-devkit/build-ng-packagr' from devDependencies`, async () => {
    const newTree = await schematicRunner.runSchematicAsync(schematicName, {}, tree).toPromise();
    const { devDependencies } = JSON.parse(newTree.readContent('/package.json'));
    expect(devDependencies['@angular-devkit/build-ng-packagr']).toBeUndefined();
  });

  it(`should add '@angular-devkit/build-angular' to devDependencies`, async () => {
    const newTree = await schematicRunner.runSchematicAsync(schematicName, {}, tree).toPromise();
    const { devDependencies } = JSON.parse(newTree.readContent('/package.json'));
    expect(devDependencies['@angular-devkit/build-angular']).toBeTruthy();
  });

  it('should update library builder target', async () => {
    const newTree = await schematicRunner.runSchematicAsync(schematicName, {}, tree).toPromise();
    const {
      projects: { lib },
    } = JSON.parse(newTree.readContent('/angular.json'));
    expect(lib.architect.build.builder).toBe('@angular-devkit/build-angular:ng-packagr');
  });
});
