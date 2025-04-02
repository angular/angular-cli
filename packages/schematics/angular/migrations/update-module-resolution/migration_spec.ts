/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { isJsonObject } from '@angular-devkit/core';
import { EmptyTree } from '@angular-devkit/schematics';
import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import { Builders, ProjectType, WorkspaceSchema } from '../../utility/workspace-models';

describe('Migration to update moduleResolution', () => {
  const schematicName = 'update-module-resolution';
  const schematicRunner = new SchematicTestRunner(
    'migrations',
    require.resolve('../migration-collection.json'),
  );

  function createJsonFile(tree: UnitTestTree, filePath: string, content: {}): void {
    const stringifiedContent = JSON.stringify(content, undefined, 2);
    if (tree.exists(filePath)) {
      tree.overwrite(filePath, stringifiedContent);
    } else {
      tree.create(filePath, stringifiedContent);
    }
  }

  function getCompilerOptionsValue(tree: UnitTestTree, filePath: string): Record<string, unknown> {
    const json = tree.readJson(filePath);
    if (isJsonObject(json) && isJsonObject(json.compilerOptions)) {
      return json.compilerOptions;
    }

    throw new Error(`Cannot retrieve 'compilerOptions'.`);
  }

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
              tsConfig: 'src/tsconfig.app.json',
              main: '',
              polyfills: '',
            },
            configurations: {
              production: {
                tsConfig: 'src/tsconfig.app.prod.json',
              },
            },
          },
          test: {
            builder: Builders.Karma,
            options: {
              karmaConfig: '',
              tsConfig: 'src/tsconfig.spec.json',
            },
          },
        },
      },
    },
  };

  let tree: UnitTestTree;
  beforeEach(() => {
    tree = new UnitTestTree(new EmptyTree());
    const compilerOptions = { module: 'es2020', moduleResolution: 'node' };
    const configWithExtends = { extends: './tsconfig.json', compilerOptions };

    // Workspace
    createJsonFile(tree, 'angular.json', angularConfig);
    createJsonFile(tree, 'tsconfig.json', { compilerOptions });

    // Application
    createJsonFile(tree, 'src/tsconfig.app.json', configWithExtends);
    createJsonFile(tree, 'src/tsconfig.app.prod.json', configWithExtends);
    createJsonFile(tree, 'src/tsconfig.spec.json', { compilerOptions });
  });

  it(`should update moduleResolution to 'bundler' in workspace 'tsconfig.json'`, async () => {
    const newTree = await schematicRunner.runSchematic(schematicName, {}, tree);
    const compilerOptions = getCompilerOptionsValue(newTree, 'tsconfig.json');
    expect(compilerOptions).toEqual(
      jasmine.objectContaining({
        moduleResolution: 'bundler',
      }),
    );
  });

  it(`should update moduleResolution to 'bundler' in builder tsconfig`, async () => {
    const newTree = await schematicRunner.runSchematic(schematicName, {}, tree);
    const compilerOptions = getCompilerOptionsValue(newTree, 'src/tsconfig.spec.json');
    expect(compilerOptions).toEqual(
      jasmine.objectContaining({
        moduleResolution: 'bundler',
      }),
    );
  });

  it('should not update moduleResolution when module is preserve', async () => {
    createJsonFile(tree, 'tsconfig.json', {
      compilerOptions: { module: 'preserve', moduleResolution: 'node' },
    });

    const newTree = await schematicRunner.runSchematic(schematicName, {}, tree);
    const compilerOptions = getCompilerOptionsValue(newTree, 'tsconfig.json');
    expect(compilerOptions).toEqual({ module: 'preserve', moduleResolution: 'node' });
  });
});
