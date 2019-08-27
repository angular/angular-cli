/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { EmptyTree } from '@angular-devkit/schematics';
import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import { WorkspaceTargets } from '../../utility/workspace-models';

// tslint:disable-next-line: no-any
function getWorkspaceTargets(tree: UnitTestTree): any {
  return JSON.parse(tree.readContent(workspacePath))
    .projects['migration-test'].architect;
}

function updateWorkspaceTargets(tree: UnitTestTree, workspaceTargets: WorkspaceTargets) {
  const config = JSON.parse(tree.readContent(workspacePath));
  config.projects['migration-test'].architect = workspaceTargets;
  tree.overwrite(workspacePath, JSON.stringify(config, undefined, 2));
}

const workspacePath = '/angular.json';

// tslint:disable:no-big-function
describe('Migration to version 9', () => {
  describe('Migrate ngsw config', () => {
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

    it(`should add 'manifest.webmanifest' to files in prefetch`, async () => {
      const ngswConfigPath = '/ngsw-config.json';
      const config = getWorkspaceTargets(tree);
      config.build.options.ngswConfigPath = ngswConfigPath;
      updateWorkspaceTargets(tree, config);

      const ngswConfig = JSON.stringify(
        {
          assetGroups: [
            {
              name: 'app',
              installMode: 'prefetch',
              resources: {
                files: [
                  '/favicon.ico',
                  '/index.html',
                ],
              },
            },
            {
              name: 'assets',
              installMode: 'lazy',
              updateMode: 'prefetch',
              resources: {
                files: [
                  '/assets/**',
                ],
              },
            },
          ],
        },
        null,
        2,
      );

      tree.create(ngswConfigPath, ngswConfig);

      const tree2 = await schematicRunner.runSchematicAsync('migration-09', {}, tree.branch()).toPromise();
      const { assetGroups } = JSON.parse(tree2.readContent(ngswConfigPath));
      expect(assetGroups[0].resources.files).toEqual([
        '/favicon.ico',
        '/index.html',
        '/manifest.webmanifest',
      ]);
      expect(assetGroups[1].resources.files).toEqual([
        '/assets/**',
      ]);
    });

    it(`should not add 'manifest.webmanifest' to files if exists`, async () => {
      const ngswConfigPath = '/ngsw-config.json';
      const config = getWorkspaceTargets(tree);
      config.build.options.ngswConfigPath = ngswConfigPath;
      updateWorkspaceTargets(tree, config);

      const ngswConfig = JSON.stringify(
        {
          assetGroups: [
            {
              name: 'app',
              installMode: 'prefetch',
              resources: {
                files: [
                  '/manifest.webmanifest',
                  '/favicon.ico',
                  '/index.html',
                ],
              },
            },
          ],
        },
        null,
        2,
      );

      tree.create(ngswConfigPath, ngswConfig);

      const tree2 = await schematicRunner.runSchematicAsync('migration-09', {}, tree.branch()).toPromise();
      const { assetGroups } = JSON.parse(tree2.readContent(ngswConfigPath));
      expect(assetGroups[0].resources.files).toEqual([
        '/manifest.webmanifest',
        '/favicon.ico',
        '/index.html',
      ]);
    });
  });
});
