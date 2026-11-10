/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { SchematicTestRunner, type UnitTestTree } from '@angular-devkit/schematics/testing';
import type { Schema as ApplicationOptions } from '../application/schema';
import type { Schema as GenerateLibrarySchema } from '../library/schema';
import type { Schema as WorkspaceOptions } from '../workspace/schema';
import type { Schema as GenerateEntryPointSchema } from './schema';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getJsonFileContent(tree: UnitTestTree, path: string): any {
  return tree.readJson(path);
}

describe('EntryPoint Schematic', () => {
  const schematicRunner = new SchematicTestRunner(
    '@schematics/angular',
    require.resolve('../collection.json'),
  );

  const workspaceOptions: WorkspaceOptions = {
    name: 'workspace',
    newProjectRoot: 'projects',
    version: '6.0.0',
  };

  const defaultLibraryOptions: GenerateLibrarySchema = {
    name: 'foo',
    skipPackageJson: false,
    skipTsConfig: false,
    skipInstall: false,
  };

  const defaultOptions: GenerateEntryPointSchema = {
    name: 'secondary',
    project: 'foo',
  };

  let workspaceTree: UnitTestTree;
  beforeEach(async () => {
    workspaceTree = await schematicRunner.runSchematic('workspace', workspaceOptions);
    workspaceTree = await schematicRunner.runSchematic(
      'library',
      defaultLibraryOptions,
      workspaceTree,
    );
  });

  it('should create secondary entry-point files', async () => {
    const tree = await schematicRunner.runSchematic('entry-point', defaultOptions, workspaceTree);

    expect(tree.files).toEqual(
      jasmine.arrayContaining([
        '/projects/foo/secondary/src/public-api.ts',
        '/projects/foo/secondary/src/secondary.ts',
        '/projects/foo/secondary/src/secondary.spec.ts',
      ]),
    );

    const publicApiContent = tree.readContent('/projects/foo/secondary/src/public-api.ts');
    expect(publicApiContent).toContain("export * from './secondary';");
    expect(publicApiContent).not.toContain('secondary-module');
  });

  it('should support nested secondary entry-point names', async () => {
    const tree = await schematicRunner.runSchematic(
      'entry-point',
      {
        ...defaultOptions,
        name: 'feature/sub',
      },
      workspaceTree,
    );

    expect(tree.files).toEqual(
      jasmine.arrayContaining([
        '/projects/foo/feature/sub/src/public-api.ts',
        '/projects/foo/feature/sub/src/sub.ts',
        '/projects/foo/feature/sub/src/sub.spec.ts',
      ]),
    );

    const pkgJson = getJsonFileContent(tree, '/projects/foo/package.json');
    expect(pkgJson.exports['./feature/sub']).toBe('./feature/sub/src/public-api.ts');

    const tsConfigJson = getJsonFileContent(tree, '/tsconfig.json');
    expect(tsConfigJson.compilerOptions.paths['foo/*']).toEqual(['./dist/foo/*']);
  });

  it('should support custom entryFile option', async () => {
    const tree = await schematicRunner.runSchematic(
      'entry-point',
      {
        ...defaultOptions,
        entryFile: 'my-entry',
      },
      workspaceTree,
    );

    expect(tree.files).toContain('/projects/foo/secondary/src/my-entry.ts');
    const pkgJson = getJsonFileContent(tree, '/projects/foo/package.json');
    expect(pkgJson.exports['./secondary']).toBe('./secondary/src/my-entry.ts');
  });

  it('should strip .ts suffix from entryFile option', async () => {
    const tree = await schematicRunner.runSchematic(
      'entry-point',
      {
        ...defaultOptions,
        entryFile: 'my-entry.ts',
      },
      workspaceTree,
    );

    expect(tree.files).toContain('/projects/foo/secondary/src/my-entry.ts');
    expect(tree.files).not.toContain('/projects/foo/secondary/src/my-entry.ts.ts');
    const pkgJson = getJsonFileContent(tree, '/projects/foo/package.json');
    expect(pkgJson.exports['./secondary']).toBe('./secondary/src/my-entry.ts');
  });

  it('should update library package.json exports', async () => {
    const tree = await schematicRunner.runSchematic('entry-point', defaultOptions, workspaceTree);

    const pkgJson = getJsonFileContent(tree, '/projects/foo/package.json');
    expect(pkgJson.exports).toEqual({
      '.': './src/public-api.ts',
      './secondary': './secondary/src/public-api.ts',
    });
    expect(Object.keys(pkgJson)[0]).toBe('name');
  });

  it('should convert string exports in library package.json to an exports object', async () => {
    const pkgJson = getJsonFileContent(workspaceTree, '/projects/foo/package.json');
    pkgJson.exports = './src/public-api.ts';
    workspaceTree.overwrite('/projects/foo/package.json', JSON.stringify(pkgJson, null, 2));

    const tree = await schematicRunner.runSchematic('entry-point', defaultOptions, workspaceTree);

    const updatedPkgJson = getJsonFileContent(tree, '/projects/foo/package.json');
    expect(updatedPkgJson.exports).toEqual({
      '.': './src/public-api.ts',
      './secondary': './secondary/src/public-api.ts',
    });
  });

  it('should convert array exports in library package.json to an exports object', async () => {
    const pkgJson = getJsonFileContent(workspaceTree, '/projects/foo/package.json');
    pkgJson.exports = ['./src/public-api.ts'];
    workspaceTree.overwrite('/projects/foo/package.json', JSON.stringify(pkgJson, null, 2));

    const tree = await schematicRunner.runSchematic('entry-point', defaultOptions, workspaceTree);

    const updatedPkgJson = getJsonFileContent(tree, '/projects/foo/package.json');
    expect(updatedPkgJson.exports).toEqual({
      '.': ['./src/public-api.ts'],
      './secondary': './secondary/src/public-api.ts',
    });
  });

  it('should convert conditional root exports object in library package.json to an exports object', async () => {
    const pkgJson = getJsonFileContent(workspaceTree, '/projects/foo/package.json');
    pkgJson.exports = { default: './src/public-api.ts' };
    workspaceTree.overwrite('/projects/foo/package.json', JSON.stringify(pkgJson, null, 2));

    const tree = await schematicRunner.runSchematic('entry-point', defaultOptions, workspaceTree);

    const updatedPkgJson = getJsonFileContent(tree, '/projects/foo/package.json');
    expect(updatedPkgJson.exports).toEqual({
      '.': { default: './src/public-api.ts' },
      './secondary': './secondary/src/public-api.ts',
    });
  });

  it('should add wildcard paths mapping to root tsconfig.json', async () => {
    const tree = await schematicRunner.runSchematic('entry-point', defaultOptions, workspaceTree);

    const tsConfigJson = getJsonFileContent(tree, '/tsconfig.json');
    expect(tsConfigJson.compilerOptions.paths['foo']).toEqual(['./dist/foo']);
    expect(tsConfigJson.compilerOptions.paths['foo/*']).toEqual(['./dist/foo/*']);
  });

  it('should not duplicate existing paths mapping in root tsconfig.json', async () => {
    const tsConfig = getJsonFileContent(workspaceTree, '/tsconfig.json');
    tsConfig.compilerOptions.paths['foo/*'] = ['./dist/foo/*'];
    workspaceTree.overwrite('/tsconfig.json', JSON.stringify(tsConfig, null, 2));

    const tree = await schematicRunner.runSchematic('entry-point', defaultOptions, workspaceTree);

    const tsConfigJson = getJsonFileContent(tree, '/tsconfig.json');
    expect(tsConfigJson.compilerOptions.paths['foo/*']).toEqual(['./dist/foo/*']);
  });

  it('should respect custom outputPath in angular.json for tsconfig paths mapping', async () => {
    const angularJson = getJsonFileContent(workspaceTree, '/angular.json');
    angularJson.projects.foo.architect.build.options.outputPath = 'custom-dist/foo';
    workspaceTree.overwrite('/angular.json', JSON.stringify(angularJson, null, 2));

    const tree = await schematicRunner.runSchematic('entry-point', defaultOptions, workspaceTree);

    const tsConfigJson = getJsonFileContent(tree, '/tsconfig.json');
    expect(tsConfigJson.compilerOptions.paths['foo/*']).toEqual(['./custom-dist/foo/*']);
  });

  it('should not modify root tsconfig.json when skipTsConfig is true', async () => {
    const tree = await schematicRunner.runSchematic(
      'entry-point',
      {
        ...defaultOptions,
        skipTsConfig: true,
      },
      workspaceTree,
    );

    const tsConfigJson = getJsonFileContent(tree, '/tsconfig.json');
    expect(tsConfigJson.compilerOptions.paths['foo/*']).toBeUndefined();
  });

  it('should inherit prefix from the library project in angular.json', async () => {
    let tree = await schematicRunner.runSchematic(
      'library',
      {
        ...defaultLibraryOptions,
        name: 'prefixed-lib',
        prefix: 'custom',
      },
      workspaceTree,
    );

    tree = await schematicRunner.runSchematic(
      'entry-point',
      {
        name: 'secondary',
        project: 'prefixed-lib',
      },
      tree,
    );

    const componentContent = tree.readContent('/projects/prefixed-lib/secondary/src/secondary.ts');
    expect(componentContent).toContain("selector: 'custom-secondary'");
  });

  it('should fallback to "lib" prefix when project prefix is empty in angular.json', async () => {
    const angularJson = getJsonFileContent(workspaceTree, '/angular.json');
    angularJson.projects.foo.prefix = '';
    workspaceTree.overwrite('/angular.json', JSON.stringify(angularJson, null, 2));

    const tree = await schematicRunner.runSchematic('entry-point', defaultOptions, workspaceTree);

    const componentContent = tree.readContent('/projects/foo/secondary/src/secondary.ts');
    expect(componentContent).toContain("selector: 'lib-secondary'");
  });

  it('should allow overriding prefix via option', async () => {
    const tree = await schematicRunner.runSchematic(
      'entry-point',
      {
        ...defaultOptions,
        prefix: 'override',
      },
      workspaceTree,
    );

    const componentContent = tree.readContent('/projects/foo/secondary/src/secondary.ts');
    expect(componentContent).toContain("selector: 'override-secondary'");
  });

  it('should support scoped libraries', async () => {
    let tree = await schematicRunner.runSchematic(
      'library',
      {
        ...defaultLibraryOptions,
        name: '@myScope/myLib',
      },
      workspaceTree,
    );

    tree = await schematicRunner.runSchematic(
      'entry-point',
      {
        name: 'secondary',
        project: '@myScope/myLib',
      },
      tree,
    );

    expect(tree.files).toEqual(
      jasmine.arrayContaining([
        '/projects/my-scope/my-lib/secondary/src/public-api.ts',
        '/projects/my-scope/my-lib/secondary/src/secondary.ts',
        '/projects/my-scope/my-lib/secondary/src/secondary.spec.ts',
      ]),
    );

    const pkgJson = getJsonFileContent(tree, '/projects/my-scope/my-lib/package.json');
    expect(pkgJson.exports).toEqual({
      '.': './src/public-api.ts',
      './secondary': './secondary/src/public-api.ts',
    });

    const tsConfigJson = getJsonFileContent(tree, '/tsconfig.json');
    expect(tsConfigJson.compilerOptions.paths['@my-scope/my-lib/*']).toEqual([
      './dist/my-scope/my-lib/*',
    ]);
  });

  it('should respect skipTests option', async () => {
    const tree = await schematicRunner.runSchematic(
      'entry-point',
      {
        ...defaultOptions,
        skipTests: true,
      },
      workspaceTree,
    );

    expect(tree.files).toContain('/projects/foo/secondary/src/secondary.ts');
    expect(tree.files).not.toContain('/projects/foo/secondary/src/secondary.spec.ts');
  });

  it('should not be affected by workspace component schematic type and exportDefault defaults', async () => {
    const angularJson = getJsonFileContent(workspaceTree, '/angular.json');
    angularJson.schematics = {
      '@schematics/angular:component': {
        type: 'component',
        exportDefault: true,
      },
    };
    workspaceTree.overwrite('/angular.json', JSON.stringify(angularJson, null, 2));

    const tree = await schematicRunner.runSchematic('entry-point', defaultOptions, workspaceTree);

    expect(tree.files).toContain('/projects/foo/secondary/src/secondary.ts');
    const componentContent = tree.readContent('/projects/foo/secondary/src/secondary.ts');
    expect(componentContent).toContain('export class Secondary');
    expect(componentContent).not.toContain('export default');
  });

  describe('standalone=false', () => {
    it('should create an NgModule and export it in the entry file', async () => {
      const tree = await schematicRunner.runSchematic(
        'entry-point',
        {
          ...defaultOptions,
          standalone: false,
        },
        workspaceTree,
      );

      expect(tree.files).toEqual(
        jasmine.arrayContaining([
          '/projects/foo/secondary/src/public-api.ts',
          '/projects/foo/secondary/src/secondary-module.ts',
          '/projects/foo/secondary/src/secondary.ts',
          '/projects/foo/secondary/src/secondary.spec.ts',
        ]),
      );

      const publicApiContent = tree.readContent('/projects/foo/secondary/src/public-api.ts');
      expect(publicApiContent).toContain("export * from './secondary';");
      expect(publicApiContent).toContain("export * from './secondary-module';");
    });
  });

  describe('error handling', () => {
    it('should throw if the project does not exist', async () => {
      await expectAsync(
        schematicRunner.runSchematic(
          'entry-point',
          {
            name: 'secondary',
            project: 'non-existent',
          },
          workspaceTree,
        ),
      ).toBeRejectedWithError('Project "non-existent" does not exist.');
    });

    it('should throw if the project is not a library project', async () => {
      const appOptions: ApplicationOptions = {
        name: 'my-app',
        skipInstall: true,
      };
      const tree = await schematicRunner.runSchematic('application', appOptions, workspaceTree);

      await expectAsync(
        schematicRunner.runSchematic(
          'entry-point',
          {
            name: 'secondary',
            project: 'my-app',
          },
          tree,
        ),
      ).toBeRejectedWithError('Project "my-app" is not a library project.');
    });

    for (const builder of [
      '@angular/build:ng-packagr',
      '@angular-devkit/build-angular:ng-packagr',
    ]) {
      it(`should throw if the library project uses ${builder}`, async () => {
        const angularJson = getJsonFileContent(workspaceTree, '/angular.json');
        angularJson.projects.foo.architect.build.builder = builder;
        workspaceTree.overwrite('/angular.json', JSON.stringify(angularJson, null, 2));

        await expectAsync(
          schematicRunner.runSchematic('entry-point', defaultOptions, workspaceTree),
        ).toBeRejectedWithError(
          `Project "foo" is using the "${builder}" builder, which is not supported by the entry-point schematic. ` +
            'Please migrate to "@angular/build:library" before generating entry points.',
        );
      });
    }

    it('should allow library projects using a custom builder', async () => {
      const angularJson = getJsonFileContent(workspaceTree, '/angular.json');
      angularJson.projects.foo.architect.build.builder = '@custom/builders:library';
      workspaceTree.overwrite('/angular.json', JSON.stringify(angularJson, null, 2));

      const tree = await schematicRunner.runSchematic('entry-point', defaultOptions, workspaceTree);
      expect(tree.files).toContain('/projects/foo/secondary/src/public-api.ts');
    });

    it('should allow library projects with no build target', async () => {
      const angularJson = getJsonFileContent(workspaceTree, '/angular.json');
      delete angularJson.projects.foo.architect.build;
      workspaceTree.overwrite('/angular.json', JSON.stringify(angularJson, null, 2));

      const tree = await schematicRunner.runSchematic('entry-point', defaultOptions, workspaceTree);
      expect(tree.files).toContain('/projects/foo/secondary/src/public-api.ts');
      const tsConfigJson = getJsonFileContent(tree, '/tsconfig.json');
      expect(tsConfigJson.compilerOptions.paths['foo/*']).toEqual(['./dist/foo/*']);
    });

    it('should throw if the library package.json is missing', async () => {
      workspaceTree.delete('/projects/foo/package.json');

      await expectAsync(
        schematicRunner.runSchematic('entry-point', defaultOptions, workspaceTree),
      ).toBeRejectedWithError('Could not find package.json at "projects/foo/package.json".');
    });

    it('should throw if the entry-point name is "package.json"', async () => {
      await expectAsync(
        schematicRunner.runSchematic(
          'entry-point',
          {
            name: 'package.json',
            project: 'foo',
          },
          workspaceTree,
        ),
      ).toBeRejectedWithError('Entry point name "package.json" is reserved.');
    });

    it('should reject invalid entry-point names via schema validation', async () => {
      for (const invalidName of ['.', '../foo', 'foo..bar', '/secondary', 'secondary/', './sub']) {
        await expectAsync(
          schematicRunner.runSchematic(
            'entry-point',
            {
              name: invalidName,
              project: 'foo',
            },
            workspaceTree,
          ),
        ).toBeRejected();
      }
    });

    it('should throw if the entry point already exists in package.json exports', async () => {
      const tree = await schematicRunner.runSchematic('entry-point', defaultOptions, workspaceTree);

      await expectAsync(
        schematicRunner.runSchematic('entry-point', defaultOptions, tree),
      ).toBeRejectedWithError(
        'Entry point "./secondary" already exists in "projects/foo/package.json".',
      );
    });
  });
});
