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
          lint: {
            builder: '@angular-devkit/build-angular:tslint',
          },
          build: {
            builder: Builders.Browser,
            options: {
              scripts: [{ lazy: true, name: 'bundle-1.js' }],
              extractCss: false,
              sourceMaps: true,
              buildOptimizer: false,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any,
            configurations: {
              one: {
                aot: true,
              },
              two: {
                extractCss: true,
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

const schematicName = 'update-angular-config-v13';

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

  it(`should remove 'extractCss'`, async () => {
    const newTree = await schematicRunner.runSchematicAsync(schematicName, {}, tree).toPromise();
    const { options, configurations } = getBuildTarget(newTree);

    expect(options.extractCss).toBeUndefined();
    expect(configurations).toBeDefined();
    expect(configurations?.one.extractCss).toBeUndefined();
    expect(configurations?.two.extractCss).toBeUndefined();
  });

  it(`should remove tslint builder`, async () => {
    const newTree = await schematicRunner.runSchematicAsync(schematicName, {}, tree).toPromise();

    const { build, lint } = JSON.parse(newTree.readContent('/angular.json')).projects.app.architect;
    expect(build).toBeDefined();
    expect(lint).toBeUndefined();
  });
});
