/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { isJsonObject } from '@angular-devkit/core';
import { EmptyTree } from '@angular-devkit/schematics';
import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import { Builders, ProjectType, WorkspaceSchema } from '../../utility/workspace-models';

describe('Migration to update target and add useDefineForClassFields', () => {
  const schematicName = 'update-typescript-target';

  const schematicRunner = new SchematicTestRunner(
    'migrations',
    require.resolve('../migration-collection.json'),
  );

  function createJsonFile(tree: EmptyTree, filePath: string, content: {}): void {
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

  function createWorkSpaceConfig(tree: EmptyTree) {
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

  let tree: EmptyTree;
  beforeEach(() => {
    tree = new EmptyTree();
    createWorkSpaceConfig(tree);

    // Create tsconfigs
    const compilerOptions = { target: 'es2015', module: 'es2020' };
    const configWithExtends = { extends: './tsconfig.json', compilerOptions };

    // Workspace
    createJsonFile(tree, 'tsconfig.json', { compilerOptions });

    // Application
    createJsonFile(tree, 'src/tsconfig.app.json', configWithExtends);
    createJsonFile(tree, 'src/tsconfig.app.prod.json', configWithExtends);
    createJsonFile(tree, 'src/tsconfig.spec.json', { compilerOptions });
  });

  it(`should update target and add useDefineForClassFields in workspace 'tsconfig.json'`, async () => {
    const newTree = await schematicRunner.runSchematicAsync(schematicName, {}, tree).toPromise();
    const compilerOptions = getCompilerOptionsValue(newTree, 'tsconfig.json');
    expect(compilerOptions).toEqual(
      jasmine.objectContaining({
        target: 'ES2022',
        useDefineForClassFields: false,
      }),
    );
  });

  it(`should remove target value from tsconfig referenced in options and configuration`, async () => {
    const newTree = await schematicRunner.runSchematicAsync(schematicName, {}, tree).toPromise();
    {
      const compilerOptions = getCompilerOptionsValue(newTree, 'src/tsconfig.app.prod.json');
      expect(compilerOptions['target']).toBeUndefined();
      expect(compilerOptions['useDefineForClassFields']).toBeUndefined();
    }
    {
      const compilerOptions = getCompilerOptionsValue(newTree, 'src/tsconfig.app.json');
      expect(compilerOptions['target']).toBeUndefined();
      expect(compilerOptions['useDefineForClassFields']).toBeUndefined();
    }
  });

  it('should add target and useDefineForClassFields when tsconfig is not extended', async () => {
    const newTree = await schematicRunner.runSchematicAsync(schematicName, {}, tree).toPromise();
    const compilerOptions = getCompilerOptionsValue(newTree, 'src/tsconfig.spec.json');
    expect(compilerOptions).toEqual(
      jasmine.objectContaining({
        target: 'ES2022',
        useDefineForClassFields: false,
      }),
    );
  });

  it('should not add useDefineForClassFields when tsconfig target is ES2022', async () => {
    createJsonFile(tree, 'tsconfig.json', { compilerOptions: { 'target': 'es2022' } });
    const newTree = await schematicRunner.runSchematicAsync(schematicName, {}, tree).toPromise();

    const compilerOptions = getCompilerOptionsValue(newTree, 'tsconfig.json');
    expect(compilerOptions).toEqual({ target: 'es2022' });
  });

  it('should not add useDefineForClassFields when tsconfig target is ESNEXT', async () => {
    createJsonFile(tree, 'tsconfig.json', { compilerOptions: { 'target': 'esnext' } });
    const newTree = await schematicRunner.runSchematicAsync(schematicName, {}, tree).toPromise();

    const compilerOptions = getCompilerOptionsValue(newTree, 'tsconfig.json');
    expect(compilerOptions).toEqual({ target: 'esnext' });
  });
});
