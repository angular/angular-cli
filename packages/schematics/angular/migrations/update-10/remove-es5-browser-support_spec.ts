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

function createWorkSpaceConfig(tree: UnitTestTree, es5BrowserSupport: boolean | undefined) {
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
              es5BrowserSupport,
              sourceMaps: true,
              buildOptimizer: false,
              // tslint:disable-next-line:no-any
            } as any,
            configurations: {
              one: {
                es5BrowserSupport,
                vendorChunk: false,
                buildOptimizer: true,
              },
              two: {
                es5BrowserSupport,
                vendorChunk: false,
                buildOptimizer: true,
                sourceMaps: false,
              },
              // tslint:disable-next-line:no-any
            } as any,
          },
        },
      },
    },
  };

  tree.create('/angular.json', JSON.stringify(angularConfig, undefined, 2));
}

describe(`Migration to remove deprecated 'es5BrowserSupport' option`, () => {
  const schematicName = 'remove-es5-browser-support-option';

  const schematicRunner = new SchematicTestRunner(
    'migrations',
    require.resolve('../migration-collection.json'),
  );

  let tree: UnitTestTree;
  beforeEach(() => {
    tree = new UnitTestTree(new EmptyTree());
  });

  it(`should remove option when set to 'false'`, async () => {
    createWorkSpaceConfig(tree, false);

    const newTree = await schematicRunner.runSchematicAsync(schematicName, {}, tree).toPromise();
    const { options, configurations } = getBuildTarget(newTree);

    expect(options.es5BrowserSupport).toBeUndefined();
    expect(configurations).toBeDefined();
    expect(configurations?.one.es5BrowserSupport).toBeUndefined();
    expect(configurations?.two.es5BrowserSupport).toBeUndefined();
  });

  it(`should remove option and when set to 'true'`, async () => {
    createWorkSpaceConfig(tree, true);

    const newTree = await schematicRunner.runSchematicAsync(schematicName, {}, tree).toPromise();
    const { options, configurations } = getBuildTarget(newTree);

    expect(options.es5BrowserSupport).toBeUndefined();
    expect(configurations).toBeDefined();
    expect(configurations?.one.es5BrowserSupport).toBeUndefined();
    expect(configurations?.two.es5BrowserSupport).toBeUndefined();
  });
});
