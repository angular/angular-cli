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

function readJsonFile(tree: UnitTestTree, path: string): Record<string, Record<string, unknown>> {
  return JSON.parse(tree.readContent(path));
}

function createWorkSpaceConfig(tree: UnitTestTree) {
  const angularConfig: WorkspaceSchema = {
    version: 1,
    projects: {
      app: {
        root: '',
        sourceRoot: 'src',
        projectType: ProjectType.Library,
        prefix: 'app',
        architect: {
          build: {
            builder: Builders.NgPackagr,
            options: {
              project: 'ngpackage.json',
              tsConfig: 'tsconfig.lib.json',
            },
            configurations: {
              production: {
                tsConfig: 'tsconfig.lib.prod.json',
              },
            },
          },
        },
      },
    },
  };

  tree.create('/angular.json', JSON.stringify(angularConfig, undefined, 2));
  tree.create(
    '/tsconfig.lib.json',
    JSON.stringify(
      { angularCompilerOptions: { enableIvy: true, fullTemplateTypeCheck: true } },
      undefined,
      2,
    ),
  );
  tree.create(
    '/tsconfig.lib.prod.json',
    JSON.stringify(
      { angularCompilerOptions: { enableIvy: false, fullTemplateTypeCheck: true } },
      undefined,
      2,
    ),
  );

  tree.create(
    '/ngpackage.json',
    JSON.stringify(
      {
        lib: { entryFile: 'src/public-api.ts', amdId: 'foo', umdId: 'foo', umdModuleIds: ['foo'] },
      },
      undefined,
      2,
    ),
  );

  tree.create(
    '/package.json',
    JSON.stringify(
      {
        dependencies: { tslib: '^2.0.0' },
        ngPackage: {
          lib: {
            entryFile: 'src/public-api.ts',
            amdId: 'foo',
            umdId: 'foo',
            umdModuleIds: ['foo'],
          },
        },
      },
      undefined,
      2,
    ),
  );
}

const schematicName = 'update-libraries-v13';

describe(`Migration to update library projects. ${schematicName}`, () => {
  const schematicRunner = new SchematicTestRunner(
    'migrations',
    require.resolve('../migration-collection.json'),
  );

  let tree: UnitTestTree;
  beforeEach(() => {
    tree = new UnitTestTree(new EmptyTree());
    createWorkSpaceConfig(tree);
  });

  describe('TypeScript Config', () => {
    it(`should replace "enableIvy: false" with "compilationMode: "partial" `, async () => {
      const newTree = await schematicRunner.runSchematicAsync(schematicName, {}, tree).toPromise();
      const { angularCompilerOptions } = readJsonFile(newTree, 'tsconfig.lib.prod.json');
      expect(angularCompilerOptions.compilationMode).toBe('partial');
      expect(angularCompilerOptions.enableIvy).toBeUndefined();
    });

    it(`should not replace "enableIvy: true"`, async () => {
      const newTree = await schematicRunner.runSchematicAsync(schematicName, {}, tree).toPromise();
      const { angularCompilerOptions } = readJsonFile(newTree, 'tsconfig.lib.json');
      expect(angularCompilerOptions.enableIvy).toBeTrue();
    });
  });

  describe('Ng-packagr Config', () => {
    it(`should remove UMD related options from ng-packagr configuration referenced from angular.json`, async () => {
      const newTree = await schematicRunner.runSchematicAsync(schematicName, {}, tree).toPromise();
      const { lib } = readJsonFile(newTree, 'ngpackage.json');
      expect(lib.entryFile).toBeDefined();
      expect(lib.amdId).toBeUndefined();
      expect(lib.umdId).toBeUndefined();
      expect(lib.umdModuleIds).toBeUndefined();
    });

    it(`should remove UMD related options from un-referenced ng-packagr configuration (secondary entry-points)`, async () => {
      tree.create(
        '/testing/ng-package.json',
        JSON.stringify(
          {
            lib: {
              entryFile: 'src/public-api.ts',
              amdId: 'foo',
              umdId: 'foo',
              umdModuleIds: ['foo'],
            },
          },
          undefined,
          2,
        ),
      );

      const newTree = await schematicRunner.runSchematicAsync(schematicName, {}, tree).toPromise();
      const { lib } = readJsonFile(newTree, 'testing/ng-package.json');
      expect(lib.entryFile).toBeDefined();
      expect(lib.amdId).toBeUndefined();
      expect(lib.umdId).toBeUndefined();
      expect(lib.umdModuleIds).toBeUndefined();
    });
  });

  describe('Ng-packagr properties in package.json', () => {
    it(`should remove UMD related options from package.json`, async () => {
      const newTree = await schematicRunner.runSchematicAsync(schematicName, {}, tree).toPromise();
      const pkg = readJsonFile(newTree, 'package.json');
      expect(pkg).toEqual({
        dependencies: { tslib: '^2.0.0' },
        ngPackage: {
          lib: {
            entryFile: 'src/public-api.ts',
          },
        },
      });
    });
  });
});
