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
import { BuilderTarget, Builders, ProjectType, WorkspaceSchema } from '../../utility/workspace-models';

function getBuildTarget(tree: UnitTestTree): BuilderTarget<Builders.Browser, JsonObject> {
  return JSON.parse(tree.readContent('/angular.json')).projects.app.architect.build;
}

function createWorkSpaceConfig(tree: UnitTestTree) {
  const angularConfig: WorkspaceSchema = {
    version: 1,
    cli: {
      warnings: {
        versionMismatch: false,
        typescriptMismatch: true,
      },
    },
    projects: {
      app: {
        cli: {
          warnings: {
            versionMismatch: false,
            typescriptMismatch: true,
          },
        },
        root: '',
        sourceRoot: 'src',
        projectType: ProjectType.Application,
        prefix: 'app',
        architect: {
          build: {
            builder: Builders.Browser,
            options: {
              skipAppShell: true,
              sourceMap: true,
              vendorSourceMap: true,
              evalSourceMap: false,
              buildOptimizer: true,
              // tslint:disable-next-line:no-any
            } as any,
            configurations: {
              one: {
                sourceMap: false,
                vendorSourceMap: false,
                skipAppShell: false,
                evalSourceMap: true,
                buildOptimizer: false,
              },
              two: {
                sourceMap: {
                  styles: false,
                  scripts: true,
                },
                evalSourceMap: true,
                vendorSourceMap: false,
                skipAppShell: true,
                buildOptimizer: true,
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

describe(`Migration to update 'angular.json'`, () => {
  const schematicName = 'update-angular-config';

  const schematicRunner = new SchematicTestRunner(
    'migrations',
    require.resolve('../migration-collection.json'),
  );

  let tree: UnitTestTree;
  beforeEach(() => {
    tree = new UnitTestTree(new EmptyTree());
    createWorkSpaceConfig(tree);
  });

  it(`should remove 'skipAppShell'`, async () => {
    const newTree = await schematicRunner.runSchematicAsync(schematicName, {}, tree).toPromise();
    const { options, configurations } = getBuildTarget(newTree);

    expect(options.skipAppShell).toBeUndefined();
    expect(configurations).toBeDefined();
    expect(configurations?.one.skipAppShell).toBeUndefined();
    expect(configurations?.two.skipAppShell).toBeUndefined();
  });

  it(`should remove 'evalSourceMap'`, async () => {
    const newTree = await schematicRunner.runSchematicAsync(schematicName, {}, tree).toPromise();
    const { options, configurations } = getBuildTarget(newTree);

    expect(options.evalSourceMap).toBeUndefined();
    expect(configurations).toBeDefined();
    expect(configurations?.one.evalSourceMap).toBeUndefined();
    expect(configurations?.two.evalSourceMap).toBeUndefined();
  });

  it(`should remove 'vendorSourceMap' and set 'vendor' option in 'sourceMap'`, async () => {
    const newTree = await schematicRunner.runSchematicAsync(schematicName, {}, tree).toPromise();
    const { options, configurations } = getBuildTarget(newTree);

    expect(options.vendorSourceMap).toBeUndefined();
    expect(options.sourceMap).toEqual({
      vendor: true,
      scripts: true,
      styles: true,
    });
    expect(options.vendorSourceMap).toBeUndefined();

    expect(configurations).toBeDefined();
    expect(configurations?.one.vendorSourceMap).toBeUndefined();
    expect(configurations?.one.sourceMap).toBe(false);

    expect(configurations?.two.vendorSourceMap).toBeUndefined();
    expect(configurations?.two.sourceMap).toEqual({
      vendor: false,
      scripts: true,
      styles: false,
    });
  });

  it(`should remove root level 'typescriptMismatch'`, async () => {
    const newTree = await schematicRunner.runSchematicAsync(schematicName, {}, tree).toPromise();
    const config = JSON.parse(newTree.readContent('/angular.json')).cli.warnings;
    expect(config.typescriptMismatch).toBeUndefined();
    expect(config.versionMismatch).toBeFalse();
  });

  it(`should remove project level 'typescriptMismatch'`, async () => {
    const newTree = await schematicRunner.runSchematicAsync(schematicName, {}, tree).toPromise();
    const config = JSON.parse(newTree.readContent('/angular.json')).projects.app.cli.warnings;
    expect(config.typescriptMismatch).toBeUndefined();
    expect(config.versionMismatch).toBeFalse();
  });
});
