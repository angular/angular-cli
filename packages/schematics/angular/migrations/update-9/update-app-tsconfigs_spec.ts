/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { EmptyTree } from '@angular-devkit/schematics';
import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';

// tslint:disable-next-line: no-any
function overrideJsonFile(tree: UnitTestTree, path: string, newContent: object) {
  tree.overwrite(path, JSON.stringify(newContent, undefined, 2));
}

const defaultTsConfigOptions = {
  extends: './tsconfig.json',
  compilerOptions: {
    outDir: './out-tsc/app',
    types: [],
  },
  exclude: [
    'src/test.ts',
    'src/**/*.spec.ts',
  ],
  angularCompilerOptions: {
    enableIvy: true,
  },
};

// tslint:disable:no-big-function
describe('Migration to version 9', () => {
  describe('Update applications tsconfig', () => {
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

    it('should update apps tsConfig with stricter files inclusions', async () => {
      overrideJsonFile(tree, 'tsconfig.app.json', defaultTsConfigOptions);
      const tree2 = await schematicRunner.runSchematicAsync('migration-09', {}, tree.branch()).toPromise();
      const { exclude, files, include } = JSON.parse(tree2.readContent('tsconfig.app.json'));
      expect(exclude).toBeUndefined();
      expect(files).toEqual(['src/main.ts', 'src/polyfills.ts']);
      expect(include).toEqual(['src/**/*.d.ts']);
    });

    it('should not update apps tsConfig when tsconfig has include', async () => {
      const tsConfigContent = {
        ...defaultTsConfigOptions,
        include: ['foo.ts'],
      };

      overrideJsonFile(tree, 'tsconfig.app.json', tsConfigContent);

      const tree2 = await schematicRunner.runSchematicAsync('migration-09', {}, tree.branch()).toPromise();
      const { files, include } = JSON.parse(tree2.readContent('tsconfig.app.json'));
      expect(files).toEqual(undefined);
      expect(include).toEqual(['foo.ts']);
    });

    it(`should remove angularCompilerOptions when enableIvy is true and it's the only option`, async () => {
      overrideJsonFile(tree, 'tsconfig.app.json', defaultTsConfigOptions);
      const tree2 = await schematicRunner.runSchematicAsync('migration-09', {}, tree.branch()).toPromise();
      const { angularCompilerOptions } = JSON.parse(tree2.readContent('tsconfig.app.json'));
      expect(angularCompilerOptions).toBeUndefined();
    });

    it('should remove enableIvy only when true and there are other angularCompilerOptions', async () => {
      const tsConfigContent = {
        ...defaultTsConfigOptions,
        angularCompilerOptions: {
          enableIvy: true,
          fullTemplateTypeCheck: true,
        },
      };

      overrideJsonFile(tree, 'tsconfig.app.json', tsConfigContent);
      const tree2 = await schematicRunner.runSchematicAsync('migration-09', {}, tree.branch()).toPromise();
      const { angularCompilerOptions } = JSON.parse(tree2.readContent('tsconfig.app.json'));
      expect(angularCompilerOptions.enableIvy).toBeUndefined();
      expect(angularCompilerOptions.fullTemplateTypeCheck).toBe(true);
    });

    it('should note remove enableIvy is set to false', async () => {
      const tsConfigContent = {
        ...defaultTsConfigOptions,
        angularCompilerOptions: {
          enableIvy: false,
          fullTemplateTypeCheck: true,
        },
      };

      overrideJsonFile(tree, 'tsconfig.app.json', tsConfigContent);
      const tree2 = await schematicRunner.runSchematicAsync('migration-09', {}, tree.branch()).toPromise();
      const { angularCompilerOptions } = JSON.parse(tree2.readContent('tsconfig.app.json'));
      expect(angularCompilerOptions.enableIvy).toBe(false);
      expect(angularCompilerOptions.fullTemplateTypeCheck).toBe(true);
    });
  });
});
