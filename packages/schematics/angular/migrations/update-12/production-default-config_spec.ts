/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { JsonObject } from '@angular-devkit/core';
import { EmptyTree } from '@angular-devkit/schematics';
import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import { Builders, ProjectType, WorkspaceSchema } from '../../utility/workspace-models';

function getArchitect(tree: UnitTestTree): JsonObject {
  return JSON.parse(tree.readContent('/angular.json')).projects.app.architect;
}

function createWorkSpaceConfig(tree: UnitTestTree) {
  const angularConfig: WorkspaceSchema = {
    version: 1,
    projects: {
      app: {
        root: '',
        sourceRoot: 'src',
        projectType: ProjectType.Application,
        prefix: 'app',
        architect: {
          browser: {
            builder: Builders.Browser,
            options: {
              outputPath: 'dist/integration-project',
              index: 'src/index.html',
              main: 'src/main.ts',
              polyfills: 'src/polyfills.ts',
              tsConfig: 'tsconfig.app.json',
              aot: true,
              sourceMap: true,
              assets: ['src/favicon.ico', 'src/assets'],
              styles: ['src/styles.css'],
              scripts: [],
            },
            configurations: {
              production: {
                deployUrl: 'http://cdn.com',
                fileReplacements: [
                  {
                    replace: 'src/environments/environment.ts',
                    with: 'src/environments/environment.prod.ts',
                  },
                ],
                optimization: true,
                outputHashing: 'all',
                sourceMap: false,
                namedChunks: false,
                extractLicenses: true,
                vendorChunk: false,
                buildOptimizer: true,
                watch: true,
                budgets: [
                  {
                    type: 'initial',
                    maximumWarning: '2mb',
                    maximumError: '5mb',
                  },
                ],
              },
              optimization_sm: {
                sourceMap: true,
                optimization: true,
                namedChunks: false,
                vendorChunk: true,
                buildOptimizer: true,
              },
            },
          },
          ng_packagr: {
            builder: Builders.NgPackagr,
            options: {
              watch: true,
              tsConfig: 'projects/lib/tsconfig.lib.json',
            },
            configurations: {
              production: {
                watch: false,
                tsConfig: 'projects/lib/tsconfig.lib.prod.json',
              },
            },
          },
          dev_server: {
            builder: Builders.DevServer,
            options: {
              browserTarget: 'app:build',
              watch: false,
            },
            configurations: {
              production: {
                browserTarget: 'app:build:production',
              },
              optimization_sm: {
                browserTarget: 'app:build:optimization_sm',
              },
            },
          },
          app_shell: {
            builder: Builders.AppShell,
            options: {
              browserTarget: 'app:build',
              serverTarget: 'app:server',
            },
            configurations: {
              optimization_sm: {
                browserTarget: 'app:build:optimization_sm',
                serverTarget: 'app:server:optimization_sm',
              },
              production: {
                browserTarget: 'app:build:production',
                serverTarget: 'app:server:optimization_sm',
              },
            },
          },
          server: {
            builder: Builders.Server,
            options: {
              outputPath: 'dist/server',
              main: 'server.ts',
              tsConfig: 'tsconfig.server.json',
              optimization: false,
              sourceMap: true,
            },
            configurations: {
              optimization_sm: {
                sourceMap: true,
                optimization: true,
              },
              production: {
                fileReplacements: [
                  {
                    replace: 'src/environments/environment.ts',
                    with: 'src/environments/environment.prod.ts',
                  },
                ],
                sourceMap: false,
                optimization: true,
              },
            },
          },
        },
      },
    },
  };

  tree.create('/angular.json', JSON.stringify(angularConfig, undefined, 2));
}

const schematicName = 'production-by-default';
describe(`Migration to update 'angular.json' configurations to production by default. ${schematicName}`, () => {
  const schematicRunner = new SchematicTestRunner(
    'migrations',
    require.resolve('../migration-collection.json'),
  );

  let tree: UnitTestTree;
  beforeEach(() => {
    tree = new UnitTestTree(new EmptyTree());
    createWorkSpaceConfig(tree);
  });

  it('update browser builder configurations', async () => {
    const newTree = await schematicRunner.runSchematicAsync(schematicName, {}, tree).toPromise();
    const { browser } = getArchitect(newTree);
    const output = {
      builder: '@angular-devkit/build-angular:browser',
      options: {
        outputPath: 'dist/integration-project',
        index: 'src/index.html',
        main: 'src/main.ts',
        polyfills: 'src/polyfills.ts',
        tsConfig: 'tsconfig.app.json',
        aot: true,
        sourceMap: true,
        assets: ['src/favicon.ico', 'src/assets'],
        styles: ['src/styles.css'],
        scripts: [],
      },
      configurations: {
        production: {
          deployUrl: 'http://cdn.com',
          optimization: true,
          outputHashing: 'all',
          sourceMap: false,
          namedChunks: false,
          extractLicenses: true,
          vendorChunk: false,
          buildOptimizer: true,
          watch: true,
          fileReplacements: [
            {
              replace: 'src/environments/environment.ts',
              with: 'src/environments/environment.prod.ts',
            },
          ],
          budgets: [
            {
              type: 'initial',
              maximumWarning: '2mb',
              maximumError: '5mb',
            },
          ],
        },
        optimization_sm: {
          sourceMap: true,
          optimization: true,
          namedChunks: false,
          vendorChunk: true,
          buildOptimizer: true,
        },
        development: {},
      },
      defaultConfiguration: 'production',
    };

    expect(browser).toEqual(output);
  });

  it('update ng-packagr builder configurations', async () => {
    const newTree = await schematicRunner.runSchematicAsync(schematicName, {}, tree).toPromise();
    const { ng_packagr } = getArchitect(newTree);
    const output = {
      builder: '@angular-devkit/build-angular:ng-packagr',
      options: { watch: true, tsConfig: 'projects/lib/tsconfig.lib.json' },
      configurations: {
        production: { watch: false, tsConfig: 'projects/lib/tsconfig.lib.prod.json' },
        development: {},
      },
      defaultConfiguration: 'production',
    };

    expect(ng_packagr).toEqual(output);
  });

  it('update dev-server builder configurations', async () => {
    const newTree = await schematicRunner.runSchematicAsync(schematicName, {}, tree).toPromise();
    const { dev_server } = getArchitect(newTree);
    const output = {
      builder: '@angular-devkit/build-angular:dev-server',
      options: { watch: false },
      configurations: {
        production: { browserTarget: 'app:build:production' },
        optimization_sm: { browserTarget: 'app:build:optimization_sm' },
        development: { browserTarget: 'app:build:development' },
      },
      defaultConfiguration: 'development',
    };

    expect(dev_server).toEqual(output);
  });

  it('update server builder configurations', async () => {
    const newTree = await schematicRunner.runSchematicAsync(schematicName, {}, tree).toPromise();
    const { server } = getArchitect(newTree);
    const output = {
      builder: '@angular-devkit/build-angular:server',
      options: {
        outputPath: 'dist/server',
        main: 'server.ts',
        tsConfig: 'tsconfig.server.json',
        optimization: false,
        sourceMap: true,
      },
      configurations: {
        optimization_sm: { sourceMap: true, optimization: true },
        production: {
          fileReplacements: [
            {
              replace: 'src/environments/environment.ts',
              with: 'src/environments/environment.prod.ts',
            },
          ],
          sourceMap: false,
          optimization: true,
        },
        development: {},
      },
      defaultConfiguration: 'production',
    };

    expect(server).toEqual(output);
  });

  it('update app-shell builder configurations', async () => {
    const newTree = await schematicRunner.runSchematicAsync(schematicName, {}, tree).toPromise();
    const { app_shell } = getArchitect(newTree);

    const output = {
      builder: '@angular-devkit/build-angular:app-shell',
      options: {},
      configurations: {
        optimization_sm: {
          browserTarget: 'app:build:optimization_sm',
          serverTarget: 'app:server:optimization_sm',
        },
        production: {
          browserTarget: 'app:build:production',
          serverTarget: 'app:server:optimization_sm',
        },
        development: {
          serverTarget: 'app:server:development',
          browserTarget: 'app:build:development',
        },
      },
      defaultConfiguration: 'production',
    };

    expect(app_shell).toEqual(output);
  });
});
