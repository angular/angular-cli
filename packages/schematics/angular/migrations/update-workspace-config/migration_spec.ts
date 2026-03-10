/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { EmptyTree } from '@angular-devkit/schematics';
import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import { Builders, ProjectType } from '../../utility/workspace-models';

describe('Migration to update the angular workspace configuration', () => {
  const schematicName = 'update-workspace-config';
  const schematicRunner = new SchematicTestRunner(
    'migrations',
    require.resolve('../migration-collection.json'),
  );

  let tree: UnitTestTree;
  beforeEach(() => {
    tree = new UnitTestTree(new EmptyTree());
  });

  it('should rename experimentalPlatform to platform in application builder', async () => {
    const angularConfig = {
      version: 1,
      projects: {
        app: {
          root: '',
          sourceRoot: 'src',
          projectType: ProjectType.Application,
          prefix: 'app',
          architect: {
            build: {
              builder: Builders.Application,
              options: {
                ssr: {
                  entry: 'src/server.ts',
                  experimentalPlatform: 'neutral',
                },
              },
              configurations: {
                production: {
                  ssr: {
                    experimentalPlatform: 'node',
                  },
                },
              },
            },
          },
        },
      },
    };

    tree.create('/angular.json', JSON.stringify(angularConfig, undefined, 2));

    const newTree = await schematicRunner.runSchematic(schematicName, {}, tree);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const config = newTree.readJson('/angular.json') as any;
    const options = config.projects.app.architect.build.options;
    const prodOptions = config.projects.app.architect.build.configurations.production;

    expect(options.ssr.platform).toBe('neutral');
    expect(options.ssr.experimentalPlatform).toBeUndefined();
    expect(prodOptions.ssr.platform).toBe('node');
    expect(prodOptions.ssr.experimentalPlatform).toBeUndefined();
  });

  it('should not change other builders', async () => {
    const angularConfig = {
      version: 1,
      projects: {
        app: {
          root: '',
          sourceRoot: 'src',
          projectType: ProjectType.Application,
          prefix: 'app',
          architect: {
            build: {
              builder: Builders.Browser,
              options: {
                ssr: {
                  experimentalPlatform: 'neutral',
                },
              },
            },
          },
        },
      },
    };

    tree.create('/angular.json', JSON.stringify(angularConfig, undefined, 2));

    const newTree = await schematicRunner.runSchematic(schematicName, {}, tree);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const config = newTree.readJson('/angular.json') as any;
    const options = config.projects.app.architect.build.options;

    expect(options.ssr.experimentalPlatform).toBe('neutral');
    expect(options.ssr.platform).toBeUndefined();
  });
});
