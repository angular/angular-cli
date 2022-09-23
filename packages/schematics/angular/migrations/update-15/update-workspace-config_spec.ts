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
import {
  BuilderTarget,
  Builders,
  ProjectType,
  WorkspaceSchema,
} from '../../utility/workspace-models';

function getServerTarget(tree: UnitTestTree): BuilderTarget<Builders.Server, JsonObject> {
  const target = (tree.readJson('/angular.json') as unknown as WorkspaceSchema).projects.app
    .architect?.server;

  return target as unknown as BuilderTarget<Builders.Server, JsonObject>;
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
          server: {
            builder: Builders.Server,
            options: {
              main: './server.ts',
              bundleDependencies: false,
              sourceMaps: true,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any,
            configurations: {
              one: {
                aot: true,
              },
              two: {
                bundleDependencies: true,
                aot: true,
              },
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any,
          },
        },
      },
    },
  };

  tree.create('/angular.json', JSON.stringify(angularConfig, undefined, 2));
}

const schematicName = 'update-workspace-config';

describe(`Migration to update 'angular.json'. ${schematicName}`, () => {
  const schematicRunner = new SchematicTestRunner(
    'migrations',
    require.resolve('../migration-collection.json'),
  );

  let tree: UnitTestTree;
  beforeEach(() => {
    tree = new UnitTestTree(new EmptyTree());
    createWorkSpaceConfig(tree);
  });

  it(`should remove 'bundleDependencies'`, async () => {
    const newTree = await schematicRunner.runSchematicAsync(schematicName, {}, tree).toPromise();
    const { options, configurations } = getServerTarget(newTree);

    expect(options.bundleDependencies).toBeUndefined();
    expect(configurations).toBeDefined();
    expect(configurations?.one.bundleDependencies).toBeUndefined();
    expect(configurations?.two.bundleDependencies).toBeUndefined();
  });
});
