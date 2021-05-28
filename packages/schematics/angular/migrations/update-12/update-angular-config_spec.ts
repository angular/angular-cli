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

function getBuildTarget(tree: UnitTestTree): BuilderTarget<Builders.Browser, JsonObject> {
  return JSON.parse(tree.readContent('/angular.json')).projects.app.architect.build;
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
          build: {
            builder: Builders.Browser,
            options: {
              aot: true,
              optimization: true,
              experimentalRollupPass: false,
              buildOptimizer: false,
              namedChunks: true,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any,
            configurations: {
              one: {
                aot: true,
              },
              two: {
                experimentalRollupPass: true,
                aot: false,
                optimization: false,
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

const schematicName = 'update-angular-config-v12';

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

  it(`should remove 'experimentalRollupPass'`, async () => {
    const newTree = await schematicRunner.runSchematicAsync(schematicName, {}, tree).toPromise();
    const { options, configurations } = getBuildTarget(newTree);

    expect(options.experimentalRollupPass).toBeUndefined();
    expect(options.buildOptimizer).toBeFalse();
    expect(configurations).toBeDefined();
    expect(configurations?.one.experimentalRollupPass).toBeUndefined();
    expect(configurations?.two.experimentalRollupPass).toBeUndefined();
  });

  it(`should remove value from "options" section which value is now the new default`, async () => {
    const newTree = await schematicRunner.runSchematicAsync(schematicName, {}, tree).toPromise();
    const { options, configurations } = getBuildTarget(newTree);

    expect(options.aot).toBeUndefined();
    expect(configurations?.one.aot).toBeUndefined();
    expect(configurations?.two.aot).toBeFalse();
  });

  it(`should remove value from "configuration" section when value is the same as that of "options"`, async () => {
    const newTree = await schematicRunner.runSchematicAsync(schematicName, {}, tree).toPromise();
    const { options, configurations } = getBuildTarget(newTree);

    expect(options.aot).toBeUndefined();
    expect(configurations?.one.aot).toBeUndefined();
    expect(configurations?.two.aot).toBeFalse();
  });

  it(`should add value in "options" section when option was not defined`, async () => {
    const newTree = await schematicRunner.runSchematicAsync(schematicName, {}, tree).toPromise();
    const { options, configurations } = getBuildTarget(newTree);

    expect(options.sourceMap).toBeTrue();
    expect(configurations?.one.sourceMap).toBeUndefined();
    expect(configurations?.two.sourceMap).toBeUndefined();
    expect(configurations?.two.optimization).toBeFalse();
  });

  it(`should not remove value in "options" when value is not the new default`, async () => {
    const newTree = await schematicRunner.runSchematicAsync(schematicName, {}, tree).toPromise();
    const { options } = getBuildTarget(newTree);

    expect(options.namedChunks).toBeTrue();
    expect(options.buildOptimizer).toBeFalse();
  });

  it('migration should be idempotent', async () => {
    const { options } = getBuildTarget(tree);
    expect(options.aot).toBeTrue();

    // First run
    const newTree1 = await schematicRunner.runSchematicAsync(schematicName, {}, tree).toPromise();
    const { options: options1 } = getBuildTarget(newTree1);
    expect(options1.aot).toBeUndefined();

    // Second run
    const newTree2 = await schematicRunner
      .runSchematicAsync(schematicName, {}, newTree1)
      .toPromise();
    const { options: options2 } = getBuildTarget(newTree2);
    expect(options2.aot).toBeUndefined();
  });
});
