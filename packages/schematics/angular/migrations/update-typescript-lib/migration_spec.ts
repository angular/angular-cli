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

describe('Migration to update TypeScript lib', () => {
  const schematicName = 'update-typescript-lib';

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

  function getCompilerOptions(tree: UnitTestTree, filePath: string): Record<string, unknown> {
    const json = tree.readJson(filePath);
    if (isJsonObject(json) && isJsonObject(json.compilerOptions)) {
      return json.compilerOptions;
    }

    throw new Error(`Cannot retrieve 'compilerOptions'.`);
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

    createJsonFile(tree, 'angular.json', angularConfig);
  }

  let tree: UnitTestTree;
  beforeEach(() => {
    tree = new UnitTestTree(new EmptyTree());
    createWorkSpaceConfig(tree);

    // Create tsconfigs
    const compilerOptions = { lib: ['es2020', 'dom'] };
    const configWithExtends = { extends: './tsconfig.json', compilerOptions };

    // Workspace
    createJsonFile(tree, 'tsconfig.json', { compilerOptions });

    // Application
    createJsonFile(tree, 'src/tsconfig.app.json', configWithExtends);
    createJsonFile(tree, 'src/tsconfig.app.prod.json', configWithExtends);
    createJsonFile(tree, 'src/tsconfig.spec.json', { compilerOptions });
  });

  it(`should remove 'lib' when 'dom' is present and ES version is less than 2022`, async () => {
    const newTree = await schematicRunner.runSchematic(schematicName, {}, tree);
    const compilerOptions = getCompilerOptions(newTree, 'tsconfig.json');
    expect(compilerOptions.lib).toBeUndefined();
  });

  it(`should remove 'lib' when 'dom' is present and ES version is 2022`, async () => {
    createJsonFile(tree, 'tsconfig.json', { compilerOptions: { lib: ['es2022', 'dom'] } });
    const newTree = await schematicRunner.runSchematic(schematicName, {}, tree);
    const compilerOptions = getCompilerOptions(newTree, 'tsconfig.json');
    expect(compilerOptions.lib).toBeUndefined();
  });

  it(`should not remove 'lib' when 'dom' is present and ES version is 'esnext'`, async () => {
    createJsonFile(tree, 'tsconfig.json', { compilerOptions: { lib: ['esnext', 'dom'] } });
    const newTree = await schematicRunner.runSchematic(schematicName, {}, tree);
    const compilerOptions = getCompilerOptions(newTree, 'tsconfig.json');
    expect(compilerOptions.lib).toEqual(['esnext', 'dom']);
  });

  it(`should update 'lib' to 'es2022' when 'dom' is not present and ES version is less than 2022`, async () => {
    createJsonFile(tree, 'tsconfig.json', { compilerOptions: { lib: ['es2020'] } });
    const newTree = await schematicRunner.runSchematic(schematicName, {}, tree);
    const compilerOptions = getCompilerOptions(newTree, 'tsconfig.json');
    expect(compilerOptions.lib).toEqual(['es2022']);
  });

  it(`should not update 'lib' when 'dom' is not present and ES version is 2022`, async () => {
    createJsonFile(tree, 'tsconfig.json', { compilerOptions: { lib: ['es2022'] } });
    const newTree = await schematicRunner.runSchematic(schematicName, {}, tree);
    const compilerOptions = getCompilerOptions(newTree, 'tsconfig.json');
    expect(compilerOptions.lib).toEqual(['es2022']);
  });

  it(`should not update 'lib' when 'dom' is not present and ES version is 'esnext'`, async () => {
    createJsonFile(tree, 'tsconfig.json', { compilerOptions: { lib: ['esnext'] } });
    const newTree = await schematicRunner.runSchematic(schematicName, {}, tree);
    const compilerOptions = getCompilerOptions(newTree, 'tsconfig.json');
    expect(compilerOptions.lib).toEqual(['esnext']);
  });

  it('should not error when a tsconfig is not found', async () => {
    tree.delete('src/tsconfig.spec.json');
    await schematicRunner.runSchematic(schematicName, {}, tree);
  });

  it('should not error when compilerOptions is not defined', async () => {
    createJsonFile(tree, 'tsconfig.json', {});
    await schematicRunner.runSchematic(schematicName, {}, tree);
  });

  it(`should not error when 'lib' is not defined`, async () => {
    createJsonFile(tree, 'tsconfig.json', { compilerOptions: {} });
    await schematicRunner.runSchematic(schematicName, {}, tree);
  });

  it(`should remove 'lib' from all tsconfigs`, async () => {
    const newTree = await schematicRunner.runSchematic(schematicName, {}, tree);
    expect(getCompilerOptions(newTree, 'tsconfig.json').lib).toBeUndefined();
    expect(getCompilerOptions(newTree, 'src/tsconfig.app.json').lib).toBeUndefined();
    expect(getCompilerOptions(newTree, 'src/tsconfig.app.prod.json').lib).toBeUndefined();
    expect(getCompilerOptions(newTree, 'src/tsconfig.spec.json').lib).toBeUndefined();
  });
});
