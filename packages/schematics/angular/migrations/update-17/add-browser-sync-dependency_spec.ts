/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { EmptyTree } from '@angular-devkit/schematics';
import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import { latestVersions } from '../../utility/latest-versions';
import { Builders, ProjectType } from '../../utility/workspace-models';

describe(`Migration to add 'browser-sync' as a dev dependency`, () => {
  const schematicName = 'add-browser-sync-dependency';
  const schematicRunner = new SchematicTestRunner(
    'migrations',
    require.resolve('../migration-collection.json'),
  );

  let tree: UnitTestTree;
  beforeEach(() => {
    tree = new UnitTestTree(new EmptyTree());
    tree.create(
      '/package.json',
      JSON.stringify(
        {
          devDependencies: {},
        },
        undefined,
        2,
      ),
    );
  });

  it(`should add 'browser-sync' as devDependencies when '@angular-devkit/build-angular:ssr-dev-server' is used`, async () => {
    tree.create(
      '/angular.json',
      JSON.stringify(
        {
          version: 1,
          projects: {
            app: {
              root: '',
              projectType: ProjectType.Application,
              prefix: 'app',
              architect: {
                'serve-ssr': {
                  builder: Builders.SsrDevServer,
                  options: {},
                },
              },
            },
          },
        },
        undefined,
        2,
      ),
    );

    const newTree = await schematicRunner.runSchematic(schematicName, {}, tree);
    const { devDependencies } = JSON.parse(newTree.readContent('/package.json'));
    expect(devDependencies['browser-sync']).toBe(latestVersions['browser-sync']);
  });

  it(`should not add 'browser-sync' as devDependencies when '@angular-devkit/build-angular:ssr-dev-server' is not used`, async () => {
    tree.create(
      '/angular.json',
      JSON.stringify(
        {
          version: 1,
          projects: {
            app: {
              root: '',
              projectType: ProjectType.Application,
              prefix: 'app',
              architect: {
                'serve-ssr': {
                  builder: Builders.Browser,
                  options: {},
                },
              },
            },
          },
        },
        undefined,
        2,
      ),
    );
    const newTree = await schematicRunner.runSchematic(schematicName, {}, tree);
    const { devDependencies } = JSON.parse(newTree.readContent('/package.json'));
    expect(devDependencies['browser-sync']).toBeUndefined();
  });
});
