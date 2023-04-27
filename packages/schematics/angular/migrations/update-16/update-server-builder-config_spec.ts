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
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any,
            configurations: {
              development: {
                optimization: false,
              },
              production: {
                optimization: true,
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

const schematicName = 'update-server-builder-config';

describe(`Migration to update '@angular-devkit/build-angular:server' options. ${schematicName}`, () => {
  const schematicRunner = new SchematicTestRunner(
    'migrations',
    require.resolve('../migration-collection.json'),
  );

  let tree: UnitTestTree;
  beforeEach(() => {
    tree = new UnitTestTree(new EmptyTree());
    createWorkSpaceConfig(tree);
  });

  it(`should add 'buildOptimizer: false' to 'optimization' is 'false'`, async () => {
    const newTree = await schematicRunner.runSchematic(schematicName, {}, tree);
    const { configurations } = getServerTarget(newTree);
    expect(configurations?.development.buildOptimizer).toBeFalse();
  });

  it(`should not add 'buildOptimizer' option when to 'optimization' is not defined.`, async () => {
    const newTree = await schematicRunner.runSchematic(schematicName, {}, tree);
    const { options } = getServerTarget(newTree);
    expect(options.buildOptimizer).toBeUndefined();
  });

  it(`should add 'buildOptimizer: true' to 'optimization' is 'true'`, async () => {
    const newTree = await schematicRunner.runSchematic(schematicName, {}, tree);
    const { configurations } = getServerTarget(newTree);
    expect(configurations?.production.buildOptimizer).toBeTrue();
  });
});
