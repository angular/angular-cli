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
describe('Migration to version 8', () => {
  describe('Migrate ES5 projects to enable differential loading', () => {
    const tsConfigPath = '/tsconfig.json';
    const oldTsConfig = {
      compilerOptions: {
        module: 'es2015',
        moduleResolution: 'node',
        typeRoots: ['node_modules/@types'],
      },
    };

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
      tree.overwrite(tsConfigPath, JSON.stringify(oldTsConfig, null, 2));
    });

    it(`should update 'target' to es2015 when property exists`, async () => {
      const tree2 = await schematicRunner.runSchematicAsync('migration-07', {}, tree.branch()).toPromise();
      const { target } = JSON.parse(tree2.readContent(tsConfigPath)).compilerOptions;
      expect(target).toBe('es2015');
    });

    it(`should create 'target' property when doesn't exists`, async () => {
      const tree2 = await schematicRunner.runSchematicAsync('migration-07', {}, tree.branch()).toPromise();
      const compilerOptions = {
        ...oldTsConfig.compilerOptions,
        target: undefined,
      };

      tree.overwrite(tsConfigPath, JSON.stringify({ compilerOptions }, null, 2));
      const { target } = JSON.parse(tree2.readContent(tsConfigPath)).compilerOptions;
      expect(target).toBe('es2015');
    });

    it(`should update 'module' to esnext when property exists`, async () => {
      const tree2 = await schematicRunner.runSchematicAsync('migration-07', {}, tree.branch()).toPromise();
      const { module } = JSON.parse(tree2.readContent(tsConfigPath)).compilerOptions;
      expect(module).toBe('esnext');
    });

    it(`should create 'module' property when doesn't exists`, async () => {
      const compilerOptions = {
        ...oldTsConfig.compilerOptions,
        module: undefined,
      };

      tree.overwrite(tsConfigPath, JSON.stringify({ compilerOptions }, null, 2));
      const tree2 = await schematicRunner.runSchematicAsync('migration-07', {}, tree.branch()).toPromise();
      const { module } = JSON.parse(tree2.readContent(tsConfigPath)).compilerOptions;
      expect(module).toBe('esnext');
    });

    it(`should create 'downlevelIteration' property when doesn't exists`, async () => {
      const compilerOptions = {
        ...oldTsConfig.compilerOptions,
      };

      tree.overwrite(tsConfigPath, JSON.stringify({ compilerOptions }, null, 2));
      const tree2 = await schematicRunner.runSchematicAsync('migration-07', {}, tree.branch()).toPromise();
      const { downlevelIteration } = JSON.parse(tree2.readContent(tsConfigPath)).compilerOptions;
      expect(downlevelIteration).toBe(true);
    });

    it(`should update 'downlevelIteration' to true when it's false`, async () => {
      const compilerOptions = {
        ...oldTsConfig.compilerOptions,
        downlevelIteration: false,
      };

      tree.overwrite(tsConfigPath, JSON.stringify({ compilerOptions }, null, 2));
      const tree2 = await schematicRunner.runSchematicAsync('migration-07', {}, tree.branch()).toPromise();
      const { downlevelIteration } = JSON.parse(tree2.readContent(tsConfigPath)).compilerOptions;
      expect(downlevelIteration).toBe(true);
    });

    it(`should create browserslist file if it doesn't exist`, async () => {
      tree.delete('/browserslist');
      const tree2 = await schematicRunner.runSchematicAsync('migration-07', {}, tree.branch()).toPromise();
      expect(tree2.exists('/browserslist')).toBe(true);
    });

    it('should move browserslist file if it exists in the sourceRoot', async () => {
      tree.create('/src/browserslist', 'last 2 Chrome versions');
      tree.delete('/browserslist');
      const tree2 = await schematicRunner.runSchematicAsync('migration-07', {}, tree.branch()).toPromise();
      expect(tree2.exists('/browserslist')).toBe(true);
    });

    it(`should remove 'target' and 'module' from non workspace extended tsconfig.json`, async () => {
      const appTsConfig = '/tsconfig.app.json';
      const specsTsConfig = '/tsconfig.spec.json';
      const tsConfig = JSON.stringify(
        {
          extends: '../../tsconfig.json',
          compilerOptions: {
            moduleResolution: 'node',
            target: 'es2015',
            module: 'es2015',
          },
        },
        null,
        2,
      );

      tree.overwrite(appTsConfig, tsConfig);
      tree.overwrite(specsTsConfig, tsConfig);

      const tree2 = await schematicRunner.runSchematicAsync('migration-07', {}, tree.branch()).toPromise();
      const { compilerOptions: appCompilerOptions } = JSON.parse(tree2.readContent(appTsConfig));
      expect(appCompilerOptions.target).toBeUndefined();
      expect(appCompilerOptions.module).toBeUndefined();

      const { compilerOptions: specsCompilerOptions } = JSON.parse(
        tree2.readContent(specsTsConfig),
      );
      expect(specsCompilerOptions.target).toBeUndefined();
      expect(specsCompilerOptions.module).toBeUndefined();
    });

    it(`should update 'target' and 'module' to non workspace non-extended tsconfig.json`, async () => {
      const appTsConfig = '/tsconfig.app.json';
      const tsConfig = JSON.stringify(
        {
          compilerOptions: {
            moduleResolution: 'node',
            target: 'es5',
            module: 'es5',
          },
        },
        null,
        2,
      );

      tree.overwrite(appTsConfig, tsConfig);

      const tree2 = await schematicRunner.runSchematicAsync('migration-07', {}, tree.branch()).toPromise();
      const { compilerOptions: appCompilerOptions } = JSON.parse(tree2.readContent(appTsConfig));
      expect(appCompilerOptions.target).toBe('es2015');
      expect(appCompilerOptions.module).toBe('esnext');
    });

    it(`should add 'target' and 'module' to non workspace non-extended tsconfig.json`, async () => {
      const appTsConfig = '/tsconfig.app.json';
      const tsConfig = JSON.stringify(
        {
          compilerOptions: {
            moduleResolution: 'node',
          },
        },
        null,
        2,
      );

      tree.overwrite(appTsConfig, tsConfig);

      const tree2 = await schematicRunner.runSchematicAsync('migration-07', {}, tree.branch()).toPromise();
      const { compilerOptions: appCompilerOptions } = JSON.parse(tree2.readContent(appTsConfig));
      expect(appCompilerOptions.target).toBe('es2015');
      expect(appCompilerOptions.module).toBe('esnext');
    });

    it(`should not update projects which browser builder is not 'build-angular:browser'`, async () => {
      tree.delete('/browserslist');
      const config = JSON.parse(tree.readContent('angular.json'));
      config.projects['migration-test'].architect.build.builder = '@dummy/builders:browser';

      tree.overwrite('angular.json', JSON.stringify(config));
      const tree2 = await schematicRunner.runSchematicAsync('migration-07', {}, tree.branch()).toPromise();
      expect(tree2.exists('/browserslist')).toBe(false);
    });

    it(`should move 'browserslist' to root when 'sourceRoot' is not defined`, async () => {
      tree.rename('/browserslist', '/src/browserslist');
      expect(tree.exists('/src/browserslist')).toBe(true);

      const config = JSON.parse(tree.readContent('angular.json'));
      config.projects['migration-test'].sourceRoot = undefined;

      tree.overwrite('angular.json', JSON.stringify(config));
      const tree2 = await schematicRunner.runSchematicAsync('migration-07', {}, tree.branch()).toPromise();
      expect(tree2.exists('/src/browserslist')).toBe(false);
      expect(tree2.exists('/browserslist')).toBe(true);
    });
  });
});
