/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { EmptyTree } from '@angular-devkit/schematics';
import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import { Builders, ProjectType, type WorkspaceSchema } from '../../utility/workspace-models';

function createWorkspaceConfig(tree: UnitTestTree) {
  const angularConfig: WorkspaceSchema = {
    version: 1,
    projects: {
      'my-lib': {
        root: 'projects/my-lib',
        sourceRoot: 'projects/my-lib/src',
        projectType: ProjectType.Library,
        prefix: 'lib',
        architect: {
          build: {
            builder: Builders.NgPackagr,
            options: {
              project: 'projects/my-lib/ng-package.json',
              tsConfig: 'projects/my-lib/tsconfig.lib.json',
            },
            configurations: {
              production: {
                tsConfig: 'projects/my-lib/tsconfig.lib.prod.json',
              },
            },
          },
        },
      },
    },
  };

  tree.create('/angular.json', JSON.stringify(angularConfig, undefined, 2));
  tree.create(
    '/package.json',
    JSON.stringify(
      {
        devDependencies: {
          'ng-packagr': '^18.0.0',
        },
      },
      undefined,
      2,
    ),
  );
  tree.create(
    '/projects/my-lib/package.json',
    JSON.stringify(
      {
        name: 'my-lib',
        version: '0.0.1',
        dependencies: {
          tslib: '^2.3.0',
        },
      },
      undefined,
      2,
    ),
  );
  tree.create(
    '/projects/my-lib/ng-package.json',
    JSON.stringify(
      {
        dest: '../../dist/my-lib',
        lib: {
          entryFile: 'src/public-api.ts',
        },
      },
      undefined,
      2,
    ),
  );
}

describe('Migration to use the library builder', () => {
  const schematicName = 'use-library-builder';
  const schematicRunner = new SchematicTestRunner(
    'migrations',
    require.resolve('../migration-collection.json'),
  );

  let tree: UnitTestTree;
  beforeEach(() => {
    tree = new UnitTestTree(new EmptyTree());
    createWorkspaceConfig(tree);
  });

  it('should migrate library project using ng-packagr to @angular/build:library', async () => {
    const newTree = await schematicRunner.runSchematic(schematicName, {}, tree);
    const {
      projects: { 'my-lib': lib },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } = newTree.readJson('/angular.json') as any;

    const { builder, options, configurations } = lib.architect['build'];
    expect(builder).toBe(Builders.BuildLibrary);
    expect(options.project).toBeUndefined();
    expect(options.entryPoints).toBeUndefined();
    expect(options.tsConfig).toBe('projects/my-lib/tsconfig.lib.json');
    expect(options.outputPath).toBe('dist/my-lib');
    expect(configurations.development).toEqual({
      compilationMode: 'full',
      declarationMap: true,
    });

    const libPkg = newTree.readJson('/projects/my-lib/package.json') as {
      dependencies: unknown;
      exports: unknown;
    };
    expect(libPkg.dependencies).toBeUndefined();
    expect(libPkg.exports).toEqual({
      '.': './src/public-api.ts',
    });

    expect(newTree.exists('/projects/my-lib/ng-package.json')).toBe(false);
  });

  it('should migrate @angular/build:ng-packagr and promote tsConfig from development configuration', async () => {
    const angularJson = JSON.parse(tree.readContent('/angular.json'));
    angularJson.projects['my-lib'].architect.build = {
      builder: Builders.BuildNgPackagr,
      configurations: {
        production: {
          tsConfig: 'projects/my-lib/tsconfig.lib.prod.json',
        },
        development: {
          tsConfig: 'projects/my-lib/tsconfig.lib.json',
        },
      },
    };
    tree.overwrite('/angular.json', JSON.stringify(angularJson, undefined, 2));

    const newTree = await schematicRunner.runSchematic(schematicName, {}, tree);
    const {
      projects: { 'my-lib': lib },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } = newTree.readJson('/angular.json') as any;

    const { builder, options, configurations } = lib.architect['build'];
    expect(builder).toBe(Builders.BuildLibrary);
    expect(options.tsConfig).toBe('projects/my-lib/tsconfig.lib.json');
    expect(configurations.development).toEqual({
      compilationMode: 'full',
      declarationMap: true,
    });
  });

  it('should discover and migrate secondary entry points into package.json exports', async () => {
    tree.create(
      '/projects/my-lib/testing/ng-package.json',
      JSON.stringify(
        {
          lib: {
            entryFile: 'src/public-api.ts',
          },
        },
        undefined,
        2,
      ),
    );
    tree.create(
      '/projects/my-lib/schematics/package.json',
      JSON.stringify(
        {
          ngPackage: {
            lib: {
              entryFile: 'index.ts',
            },
          },
        },
        undefined,
        2,
      ),
    );

    const newTree = await schematicRunner.runSchematic(schematicName, {}, tree);
    const {
      projects: { 'my-lib': lib },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } = newTree.readJson('/angular.json') as any;

    const { options } = lib.architect['build'];
    expect(options.entryPoints).toBeUndefined();

    const libPkg = newTree.readJson('/projects/my-lib/package.json') as { exports: unknown };
    expect(libPkg.exports).toEqual({
      '.': './src/public-api.ts',
      './schematics': './schematics/index.ts',
      './testing': './testing/src/public-api.ts',
    });

    expect(newTree.exists('/projects/my-lib/testing/ng-package.json')).toBe(false);
    expect(newTree.exists('/projects/my-lib/schematics/package.json')).toBe(false);
  });

  it('should preserve existing custom exports in package.json when adding entry points', async () => {
    tree.overwrite(
      '/projects/my-lib/package.json',
      JSON.stringify(
        {
          name: 'my-lib',
          version: '0.0.1',
          exports: {
            './theming': {
              sass: './src/_theming.scss',
            },
          },
        },
        undefined,
        2,
      ),
    );

    const newTree = await schematicRunner.runSchematic(schematicName, {}, tree);
    const libPkg = newTree.readJson('/projects/my-lib/package.json') as { exports: unknown };
    expect(libPkg.exports).toEqual({
      './theming': {
        sass: './src/_theming.scss',
      },
      '.': './src/public-api.ts',
    });
  });

  it('should preserve root condition-only exports in package.json', async () => {
    tree.overwrite(
      '/projects/my-lib/package.json',
      JSON.stringify(
        {
          name: 'my-lib',
          version: '0.0.1',
          exports: {
            sass: './src/_index.scss',
          },
        },
        undefined,
        2,
      ),
    );

    const newTree = await schematicRunner.runSchematic(schematicName, {}, tree);
    const libPkg = newTree.readJson('/projects/my-lib/package.json') as { exports: unknown };
    expect(libPkg.exports).toEqual({
      '.': {
        sass: './src/_index.scss',
        default: './src/public-api.ts',
      },
    });
  });

  it('should migrate assets, styleIncludePaths, and sass options from ng-package.json', async () => {
    tree.overwrite(
      '/projects/my-lib/ng-package.json',
      JSON.stringify(
        {
          dest: '../../dist/my-lib',
          assets: ['CHANGELOG.md'],
          allowedNonPeerDependencies: ['lodash-es'],
          inlineStyleLanguage: 'scss',
          keepLifecycleScripts: true,
          deleteDestPath: false,
          lib: {
            entryFile: 'src/public-api.ts',
            styleIncludePaths: ['../theme'],
            sass: {
              silenceDeprecations: ['import'],
            },
          },
        },
        undefined,
        2,
      ),
    );

    const newTree = await schematicRunner.runSchematic(schematicName, {}, tree);
    const {
      projects: { 'my-lib': lib },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } = newTree.readJson('/angular.json') as any;

    const { options } = lib.architect['build'];
    expect(options.assets).toEqual(['projects/my-lib/CHANGELOG.md']);
    expect(options.allowedNonPeerDependencies).toEqual(['lodash-es']);
    expect(options.inlineStyleLanguage).toBe('scss');
    expect(options.keepLifecycleScripts).toBe(true);
    expect(options.deleteOutputPath).toBe(false);
    expect(options.stylePreprocessorOptions).toEqual({
      includePaths: ['projects/theme'],
      sass: {
        silenceDeprecations: ['import'],
      },
    });
  });

  it('should migrate package.json with ngPackage configuration', async () => {
    tree.overwrite(
      '/projects/my-lib/package.json',
      JSON.stringify(
        {
          name: 'my-lib',
          ngPackage: {
            lib: {
              entryFile: 'src/public-api.ts',
            },
          },
        },
        undefined,
        2,
      ),
    );

    // Point angular.json to package.json
    const angularJson = JSON.parse(tree.readContent('/angular.json'));
    angularJson.projects['my-lib'].architect.build.options.project = 'projects/my-lib/package.json';
    tree.overwrite('/angular.json', JSON.stringify(angularJson, undefined, 2));

    const newTree = await schematicRunner.runSchematic(schematicName, {}, tree);
    const libPkg = newTree.readJson('/projects/my-lib/package.json') as {
      ngPackage?: unknown;
      name: string;
      exports: unknown;
    };
    expect(libPkg.ngPackage).toBeUndefined();
    expect(libPkg.name).toBe('my-lib');
    expect(libPkg.exports).toEqual({
      '.': './src/public-api.ts',
    });
  });

  it('should skip libraries with JavaScript ng-packagr config files and retain ng-packagr dependency', async () => {
    const angularJson = JSON.parse(tree.readContent('/angular.json'));
    angularJson.projects['my-lib'].architect.build.options.project =
      'projects/my-lib/ng-package.cjs';
    tree.overwrite('/angular.json', JSON.stringify(angularJson, undefined, 2));

    const newTree = await schematicRunner.runSchematic(schematicName, {}, tree);
    const {
      projects: { 'my-lib': lib },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } = newTree.readJson('/angular.json') as any;

    expect(lib.architect['build'].builder).toBe(Builders.NgPackagr);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rootPkg = newTree.readJson('/package.json') as any;
    expect(rootPkg.devDependencies['ng-packagr']).toBeDefined();
    expect(rootPkg.devDependencies['@angular/build']).toBeUndefined();
  });

  it('should remove ng-packagr and add @angular/build when no library uses ng-packagr', async () => {
    const newTree = await schematicRunner.runSchematic(schematicName, {}, tree);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rootPkg = newTree.readJson('/package.json') as any;

    expect(rootPkg.devDependencies['ng-packagr']).toBeUndefined();
    expect(rootPkg.devDependencies['@angular/build']).toBeDefined();
  });
});
