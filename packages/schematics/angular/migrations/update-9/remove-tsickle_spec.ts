/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { EmptyTree } from '@angular-devkit/schematics';
import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';

// tslint:disable:no-big-function
describe('Migration to version 9', () => {
  describe('Remove tsickle and annotateForClosureCompiler', () => {
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
          'workspace',
          {
            name: 'migration-test',
            version: '1.2.3',
            directory: '.',
          },
          tree,
        )
        .toPromise();
      tree = await schematicRunner
        .runExternalSchematicAsync(
          require.resolve('../../collection.json'),
          'library',
          {
            name: 'migration-lib',
          },
          tree,
        )
        .toPromise();
    });

    it(`should remove 'annotateForClosureCompiler' from library tsconfig`, async () => {
      const libTsConfig = 'migration-lib/tsconfig.lib.json';

      const tsconfig = {
        compilerOptions: {},
        angularCompilerOptions: {
          enableIvy: false,
          skipTemplateCodegen: true,
          annotateForClosureCompiler: true,
        },
      };

      tree.overwrite(libTsConfig, JSON.stringify(tsconfig, undefined, 2));

      const tree2 = await schematicRunner.runSchematicAsync('workspace-version-9', {}, tree.branch()).toPromise();
      const { angularCompilerOptions } = JSON.parse(tree2.readContent(libTsConfig));
      expect(angularCompilerOptions).toEqual({ enableIvy: false, skipTemplateCodegen: true });
    });

    it('should remove all dependencies on tsickle', async () => {
      const packageJson = {
        dependencies: {
          'tsickle': '0.0.0',
        },
        devDependencies: {
          'tsickle': '0.0.0',
        },
      };

      tree.overwrite('/package.json', JSON.stringify(packageJson, undefined, 2));
      const tree2 = await schematicRunner.runSchematicAsync('workspace-version-9', {}, tree.branch()).toPromise();
      const { dependencies, devDependencies } = JSON.parse(tree2.readContent('/package.json'));
      expect(dependencies['tsickle']).toBeUndefined();
      expect(devDependencies['tsickle']).toBeUndefined();
    });
  });
});
