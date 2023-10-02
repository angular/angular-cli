/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { EmptyTree } from '@angular-devkit/schematics';
import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import { ProjectType, WorkspaceSchema } from '../../utility/workspace-models';

function createWorkSpaceConfig(tree: UnitTestTree) {
  const angularConfig: WorkspaceSchema = {
    version: 1,
    projects: {
      app: {
        root: '/project/lib',
        sourceRoot: '/project/app/src',
        projectType: ProjectType.Application,
        prefix: 'app',
        architect: {
          'serve-ssr': {
            builder: '@nguniversal/builders:ssr-dev-server',
            options: {
              browserTarget: 'appprerender:build',
              serverTarget: 'appprerender:server',
            },
            configurations: {
              production: {
                browserTarget: 'appprerender:build:production',
                serverTarget: 'appprerender:server:production',
              },
            },
          },
          prerender: {
            builder: '@nguniversal/builders:prerender',
            options: {
              browserTarget: 'appprerender:build:production',
              serverTarget: 'appprerender:server:production',
              numProcesses: 1,
              guessRoutes: false,
            },
          },
        },
      },
    },
  };

  tree.create('/angular.json', JSON.stringify(angularConfig, undefined, 2));
}

describe(`Migration to replace '@nguniversal/builders' with '@angular-devkit/build-angular'`, () => {
  const schematicName = 'replace-nguniversal-builders';

  const schematicRunner = new SchematicTestRunner(
    'migrations',
    require.resolve('../migration-collection.json'),
  );

  let tree: UnitTestTree;
  beforeEach(() => {
    tree = new UnitTestTree(new EmptyTree());
    createWorkSpaceConfig(tree);
    tree.create(
      '/package.json',
      JSON.stringify(
        {
          devDependencies: {
            '@nguniversal/builders': '0.0.0',
          },
        },
        undefined,
        2,
      ),
    );
  });

  it(`should remove '@nguniversal/builders' from devDependencies`, async () => {
    const newTree = await schematicRunner.runSchematic(schematicName, {}, tree);
    const { devDependencies } = JSON.parse(newTree.readContent('/package.json'));
    expect(devDependencies['@nguniversal/builders']).toBeUndefined();
  });

  it(`should replace '@nguniversal/builders:ssr-dev-server' target`, async () => {
    const newTree = await schematicRunner.runSchematic(schematicName, {}, tree);
    const {
      projects: { app },
    } = JSON.parse(newTree.readContent('/angular.json'));
    expect(app.architect['serve-ssr'].builder).toBe('@angular-devkit/build-angular:ssr-dev-server');
  });

  it(`should replace '@nguniversal/builders:prerender' target`, async () => {
    const newTree = await schematicRunner.runSchematic(schematicName, {}, tree);
    const {
      projects: { app },
    } = JSON.parse(newTree.readContent('/angular.json'));
    expect(app.architect['prerender'].builder).toBe('@angular-devkit/build-angular:prerender');
  });

  it(`should replace old '@nguniversal/builders:prerender' options`, async () => {
    const newTree = await schematicRunner.runSchematic(schematicName, {}, tree);
    const {
      projects: { app },
    } = JSON.parse(newTree.readContent('/angular.json'));
    const { guessRoutes, numProcesses, discoverRoutes } = app.architect['prerender'].options;
    expect(guessRoutes).toBeUndefined();
    expect(discoverRoutes).toBeFalse();
    expect(numProcesses).toBeUndefined();
  });
});
