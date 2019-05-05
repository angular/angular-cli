/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { EmptyTree } from '@angular-devkit/schematics';
import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';


describe('Migration to version 8', () => {
  describe('Migrate ES5 projects to enable differential loading', () => {
    const tsConfigPath = '/tsconfig.json';
    const oldTsConfig = {
      compilerOptions: {
        module: 'es2015',
        moduleResolution: 'node',
        typeRoots: [
          'node_modules/@types',
        ],
      },
    };

    const schematicRunner = new SchematicTestRunner(
      'migrations',
      require.resolve('../migration-collection.json'),
    );

    let tree: UnitTestTree;

    beforeEach(async () => {
      tree = new UnitTestTree(new EmptyTree());
      tree = await schematicRunner.runExternalSchematicAsync(
        require.resolve('../../collection.json'), 'ng-new',
        {
          name: 'migration-test',
          version: '1.2.3',
          directory: '.',
        },
        tree,
      ).toPromise();
      tree.overwrite(tsConfigPath, JSON.stringify(oldTsConfig, null, 2));
    });

    it(`should update 'target' to es2015 when property exists`, () => {
      const tree2 = schematicRunner.runSchematic('migration-07', {}, tree.branch());
      const { target } = JSON.parse(tree2.readContent(tsConfigPath)).compilerOptions;
      expect(target).toBe('es2015');
    });

    it(`should create 'target' property when doesn't exists`, () => {
      const tree2 = schematicRunner.runSchematic('migration-07', {}, tree.branch());
      const compilerOptions = {
        ...oldTsConfig.compilerOptions,
        target: undefined,
      };

      tree.overwrite(tsConfigPath, JSON.stringify({ compilerOptions }, null, 2));
      const { target } = JSON.parse(tree2.readContent(tsConfigPath)).compilerOptions;
      expect(target).toBe('es2015');
    });

    it(`should update 'module' to esnext when property exists`, () => {
      const tree2 = schematicRunner.runSchematic('migration-07', {}, tree.branch());
      const { module } = JSON.parse(tree2.readContent(tsConfigPath)).compilerOptions;
      expect(module).toBe('esnext');
    });

    it(`should create 'module' property when doesn't exists`, () => {
      const compilerOptions = {
        ...oldTsConfig.compilerOptions,
        module: undefined,
      };

      tree.overwrite(tsConfigPath, JSON.stringify({ compilerOptions }, null, 2));
      const tree2 = schematicRunner.runSchematic('migration-07', {}, tree.branch());
      const { module } = JSON.parse(tree2.readContent(tsConfigPath)).compilerOptions;
      expect(module).toBe('esnext');
    });

    it(`should update browserslist file to add an non evergreen browser`, () => {
      const tree2 = schematicRunner.runSchematic('migration-07', {}, tree.branch());
      expect(tree2.readContent('/browserslist')).toContain('Chrome 41');
    });

    it(`should create browserslist file if it doesn't exist`, () => {
      tree.delete('/browserslist');
      const tree2 = schematicRunner.runSchematic('migration-07', {}, tree.branch());
      expect(tree2.exists('/browserslist')).toBe(true);
      expect(tree2.readContent('/browserslist'))
        .toContain('Support for Googlebot');
    });

    it('should move browserslist file if it exists in the sourceRoot', () => {
      tree.create('/src/browserslist', 'last 2 Chrome versions');
      tree.delete('/browserslist');
      const tree2 = schematicRunner.runSchematic('migration-07', {}, tree.branch());
      expect(tree2.exists('/browserslist')).toBe(true);
      const content = tree2.readContent('/browserslist');
      expect(content).toContain('Chrome 41');
      expect(content).toContain('last 2 Chrome versions');
    });

    it(`should remove 'target' and 'module' from non workspace tsconfig.json`, () => {
      const appTsConfig = '/tsconfig.app.json';
      const specsTsConfig = '/tsconfig.spec.json';
      const compilerOptions = {
        ...oldTsConfig.compilerOptions,
        target: 'es2015',
        module: 'es2015',
      };

      tree.overwrite(appTsConfig, JSON.stringify({ compilerOptions }, null, 2));
      const tree2 = schematicRunner.runSchematic('migration-07', {}, tree.branch());
      const { compilerOptions: appCompilerOptions } = JSON.parse(tree2.readContent(appTsConfig));
      expect(appCompilerOptions.target).toBeUndefined();
      expect(appCompilerOptions.module).toBeUndefined();

      const { compilerOptions: specsCompilerOptions }
        = JSON.parse(tree2.readContent(specsTsConfig));
      expect(specsCompilerOptions.target).toBeUndefined();
      expect(specsCompilerOptions.module).toBeUndefined();
    });
  });
});
