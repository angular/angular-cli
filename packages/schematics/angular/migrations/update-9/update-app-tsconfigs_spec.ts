/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { EmptyTree } from '@angular-devkit/schematics';
import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import { getWorkspaceTargets, updateWorkspaceTargets } from './update-workspace-config_spec';

// tslint:disable-next-line: no-any
function overrideJsonFile(tree: UnitTestTree, path: string, newContent: object) {
  tree.overwrite(path, JSON.stringify(newContent, undefined, 2));
}

const defaultTsConfigOptions = {
  extends: './tsconfig.json',
  compilerOptions: {
    module: 'es2015',
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
      const tree2 = await schematicRunner.runSchematicAsync('workspace-version-9', {}, tree.branch()).toPromise();
      const { exclude, files, include } = JSON.parse(tree2.readContent('tsconfig.app.json'));
      expect(exclude).toBeUndefined();
      expect(files).toEqual(['src/main.ts', 'src/polyfills.ts']);
      expect(include).toEqual(['src/**/*.d.ts']);
    });

    it('should resolve paths correctly even if they are using windows separators', async () => {
      const tree2 = await schematicRunner
        .runExternalSchematicAsync(
          require.resolve('../../collection.json'),
          'application',
          {
            name: 'another-app',
          },
          tree,
        )
        .toPromise();

      const tsCfgPath = 'projects/another-app/tsconfig.app.json';
      overrideJsonFile(tree2, tsCfgPath, defaultTsConfigOptions);
      const config = getWorkspaceTargets(tree2, 'another-app');
      config.build.options.main = 'projects\\another-app\\src\\main.ts';
      config.build.options.polyfills = 'projects\\another-app\\src\\polyfills.ts';
      config.build.options.tsConfig = 'projects\\another-app\\tsconfig.app.json';
      updateWorkspaceTargets(tree2, config, 'another-app');

      const tree3 = await schematicRunner.runSchematicAsync('workspace-version-9', {}, tree2.branch()).toPromise();
      const { exclude, files } = JSON.parse(tree3.readContent(tsCfgPath));
      expect(exclude).toBeUndefined();
      expect(files).toEqual(['src/main.ts', 'src/polyfills.ts']);
    });

    it('should update apps tsConfig when tsconfig has include', async () => {
      const tsConfigContent = {
        ...defaultTsConfigOptions,
        include: ['foo.ts'],
      };

      overrideJsonFile(tree, 'tsconfig.app.json', tsConfigContent);

      const tree2 = await schematicRunner.runSchematicAsync('workspace-version-9', {}, tree.branch()).toPromise();
      const { files, include } = JSON.parse(tree2.readContent('tsconfig.app.json'));
      expect(files).toEqual(['src/main.ts', 'src/polyfills.ts']);
      expect(include).toEqual(['foo.ts']);
    });

    it(`should update include '**/*.ts' in apps tsConfig to '**/*.d.ts'`, async () => {
      const tsConfigContent = {
        ...defaultTsConfigOptions,
        include: ['src/**/*.ts'],
        exclude: ['test.ts'],
      };

      overrideJsonFile(tree, 'tsconfig.app.json', tsConfigContent);

      const tree2 = await schematicRunner.runSchematicAsync('workspace-version-9', {}, tree.branch()).toPromise();
      const { files, include, exclude } = JSON.parse(tree2.readContent('tsconfig.app.json'));
      expect(files).toEqual(['src/main.ts', 'src/polyfills.ts']);
      expect(include).toEqual(['src/**/*.d.ts']);
      expect(exclude).toBeUndefined();
    });

    it(`should update include '**/*.ts' in apps tsConfig to '**/*.d.ts' when includes contains multiple elements`, async () => {
      const tsConfigContent = {
        ...defaultTsConfigOptions,
        include: ['foo.ts', 'src/**/*.ts'],
      };

      overrideJsonFile(tree, 'tsconfig.app.json', tsConfigContent);

      const tree2 = await schematicRunner.runSchematicAsync('workspace-version-9', {}, tree.branch()).toPromise();
      const { files, include, exclude } = JSON.parse(tree2.readContent('tsconfig.app.json'));
      expect(files).toEqual(['src/main.ts', 'src/polyfills.ts']);
      expect(include).toEqual(['foo.ts', 'src/**/*.d.ts']);
      expect(exclude).toBeUndefined();
    });

    it(`should remove angularCompilerOptions when enableIvy is true and it's the only option`, async () => {
      overrideJsonFile(tree, 'tsconfig.app.json', defaultTsConfigOptions);
      const tree2 = await schematicRunner.runSchematicAsync('workspace-version-9', {}, tree.branch()).toPromise();
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
      const tree2 = await schematicRunner.runSchematicAsync('workspace-version-9', {}, tree.branch()).toPromise();
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
      const tree2 = await schematicRunner.runSchematicAsync('workspace-version-9', {}, tree.branch()).toPromise();
      const { angularCompilerOptions } = JSON.parse(tree2.readContent('tsconfig.app.json'));
      expect(angularCompilerOptions.enableIvy).toBe(false);
      expect(angularCompilerOptions.fullTemplateTypeCheck).toBe(true);
    });

    it(`should remove 'module' if in an extended configuration`, async () => {
      const tsConfigContent = {
        ...defaultTsConfigOptions,
        angularCompilerOptions: {
          enableIvy: true,
          fullTemplateTypeCheck: true,
        },
      };

      overrideJsonFile(tree, 'tsconfig.app.json', tsConfigContent);
      const tree2 = await schematicRunner.runSchematicAsync('workspace-version-9', {}, tree.branch()).toPromise();
      const { compilerOptions } = JSON.parse(tree2.readContent('tsconfig.app.json'));
      expect(compilerOptions.module).toBeUndefined();

      const { compilerOptions: workspaceCompilerOptions } = JSON.parse(tree2.readContent('tsconfig.json'));
      expect(workspaceCompilerOptions.module).toBe('esnext');
    });

    it(`should set 'module' to 'esnext' if app tsconfig is not extended`, async () => {
      const tsConfigContent = {
        ...defaultTsConfigOptions,
        extends: undefined,
        angularCompilerOptions: {
          enableIvy: true,
          fullTemplateTypeCheck: true,
        },
      };

      overrideJsonFile(tree, 'tsconfig.app.json', tsConfigContent);
      const tree2 = await schematicRunner.runSchematicAsync('workspace-version-9', {}, tree.branch()).toPromise();
      const { compilerOptions } = JSON.parse(tree2.readContent('tsconfig.app.json'));
      expect(compilerOptions.module).toBe('esnext');
    });

    it(`should set 'module' to 'commonjs' in server tsconfig`, async () => {
      const tsConfigContent = {
        ...defaultTsConfigOptions,
        compilerOptions: {
          module: 'es2015',
          outDir: './out-tsc/server',
        },
        angularCompilerOptions: {
          enableIvy: true,
        },
      };

      tree = await schematicRunner
        .runExternalSchematicAsync(
          require.resolve('../../collection.json'),
          'universal',
          {
            clientProject: 'migration-test',
          },
          tree,
        )
        .toPromise();

      overrideJsonFile(tree, 'tsconfig.server.json', tsConfigContent);
      const tree2 = await schematicRunner.runSchematicAsync('workspace-version-9', {}, tree.branch()).toPromise();
      const { compilerOptions } = JSON.parse(tree2.readContent('tsconfig.server.json'));
      expect(compilerOptions.module).toBe('commonjs');
    });

    it(`should set 'module' to 'esnext' in workspace tsconfig`, async () => {
      const tsConfigContent = {
        ...defaultTsConfigOptions,
        extends: undefined,
      };

      overrideJsonFile(tree, 'tsconfig.json', tsConfigContent);
      const tree2 = await schematicRunner.runSchematicAsync('workspace-version-9', {}, tree.branch()).toPromise();
      const { compilerOptions } = JSON.parse(tree2.readContent('tsconfig.json'));
      expect(compilerOptions.module).toBe('esnext');
    });
  });
});
