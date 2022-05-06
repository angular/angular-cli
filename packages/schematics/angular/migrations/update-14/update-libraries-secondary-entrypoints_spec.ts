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

function createFileStructure(tree: UnitTestTree) {
  const angularConfig: WorkspaceSchema = {
    version: 1,
    projects: {
      foo: {
        root: 'projects/foo',
        sourceRoot: 'projects/foo/src',
        projectType: ProjectType.Library,
        prefix: 'lib',
        architect: {
          build: {
            builder: Builders.NgPackagr,
            options: {
              project: '',
              tsConfig: '',
            },
          },
        },
      },
      bar: {
        root: 'projects/bar',
        sourceRoot: 'projects/bar/src',
        projectType: ProjectType.Library,
        prefix: 'lib',
        architect: {
          test: {
            builder: Builders.Karma,
            options: {
              karmaConfig: '',
              tsConfig: '',
            },
          },
        },
      },
    },
  };

  tree.create('/angular.json', JSON.stringify(angularConfig, undefined, 2));

  // Library foo
  tree.create('/projects/foo/package.json', JSON.stringify({ version: '0.0.0' }, undefined, 2));
  // Library foo/secondary
  tree.create(
    '/projects/foo/secondary/package.json',
    JSON.stringify(
      { version: '0.0.0', ngPackage: { lib: { entryFile: 'src/public-api.ts' } } },
      undefined,
      2,
    ),
  );

  // Library bar
  tree.create('/projects/bar/package.json', JSON.stringify({ version: '0.0.0' }, undefined, 2));
  // Library bar/secondary
  tree.create(
    '/projects/bar/secondary/package.json',
    JSON.stringify({ version: '0.0.0' }, undefined, 2),
  );
}

describe(`Migration to update Angular libraries secondary entrypoints.`, () => {
  const schematicName = 'update-libraries-secondary-entrypoints';
  const schematicRunner = new SchematicTestRunner(
    'migrations',
    require.resolve('../migration-collection.json'),
  );

  let tree: UnitTestTree;
  beforeEach(() => {
    tree = new UnitTestTree(new EmptyTree());
    createFileStructure(tree);
  });

  describe(`when library has '@angular-devkit/build-angular:ng-packagr' as a builder`, () => {
    it(`should not delete 'package.json' of primary entry-point`, async () => {
      const newTree = await schematicRunner.runSchematicAsync(schematicName, {}, tree).toPromise();

      expect(newTree.exists('/projects/foo/package.json')).toBeTrue();
    });

    it(`should delete 'package.json' of secondary entry-point`, async () => {
      const newTree = await schematicRunner.runSchematicAsync(schematicName, {}, tree).toPromise();
      expect(newTree.exists('/projects/foo/secondary/package.json')).toBeFalse();
    });

    it(`should move ng-packagr configuration from 'package.json' to 'ng-package.json'`, async () => {
      const newTree = await schematicRunner.runSchematicAsync(schematicName, {}, tree).toPromise();
      expect(newTree.readJson('projects/foo/secondary/ng-package.json')).toEqual({
        lib: { entryFile: 'src/public-api.ts' },
      });
    });
  });

  describe(`when library doesn't have '@angular-devkit/build-angular:ng-packagr' as a builder`, () => {
    it(`should not delete 'package.json' of primary entry-point`, async () => {
      const newTree = await schematicRunner.runSchematicAsync(schematicName, {}, tree).toPromise();
      expect(newTree.exists('/projects/bar/package.json')).toBeTrue();
    });

    it(`should not delete 'package.json' of secondary entry-point`, async () => {
      const newTree = await schematicRunner.runSchematicAsync(schematicName, {}, tree).toPromise();
      expect(newTree.exists('/projects/bar/package.json')).toBeTrue();
    });

    it(`should not create ng-packagr configuration`, async () => {
      const newTree = await schematicRunner.runSchematicAsync(schematicName, {}, tree).toPromise();
      expect(newTree.exists('projects/bar/secondary/ng-package.json')).toBeFalse();
    });
  });
});
