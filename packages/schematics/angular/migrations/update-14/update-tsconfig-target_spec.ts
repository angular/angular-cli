/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { EmptyTree } from '@angular-devkit/schematics';
import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import { parse as parseJson } from 'jsonc-parser';
import { Builders, ProjectType, WorkspaceSchema } from '../../utility/workspace-models';

describe('Migration to update target compiler options', () => {
  const schematicName = 'update-tsconfig-target';
  const schematicRunner = new SchematicTestRunner(
    'migrations',
    require.resolve('../migration-collection.json'),
  );

  function createJsonFile(tree: UnitTestTree, filePath: string, content: {}) {
    tree.create(filePath, JSON.stringify(content, undefined, 2));
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function readJsonFile(tree: UnitTestTree, filePath: string): any {
    return parseJson(tree.readContent(filePath).toString());
  }

  let tree: UnitTestTree;

  beforeEach(() => {
    tree = new UnitTestTree(new EmptyTree());

    // Workspace configuration
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
            server: {
              builder: Builders.Server,
              options: {
                tsConfig: 'src/tsconfig.server.json',
                outputPath: '',
                main: '',
              },
            },
          },
        },
      },
    };

    createJsonFile(tree, 'angular.json', angularConfig);

    // Create tsconfigs
    const compilerOptions = { target: 'es5', module: 'esnext' };

    // Workspace
    createJsonFile(tree, 'tsconfig.json', { compilerOptions });

    // Application
    createJsonFile(tree, 'src/tsconfig.app.json', { compilerOptions });
    createJsonFile(tree, 'src/tsconfig.app.prod.json', { compilerOptions });
    createJsonFile(tree, 'src/tsconfig.spec.json', { compilerOptions });

    // Server
    createJsonFile(tree, 'src/tsconfig.server.json', { compilerOptions });
  });

  it(`should update target in workspace 'tsconfig.json'`, async () => {
    const newTree = await schematicRunner.runSchematicAsync(schematicName, {}, tree).toPromise();
    const { target } = readJsonFile(newTree, 'tsconfig.json').compilerOptions;
    expect(target).toBe('es2020');
  });

  it(`should update target in 'tsconfig.json' which is referenced in option`, async () => {
    const newTree = await schematicRunner.runSchematicAsync(schematicName, {}, tree).toPromise();
    const { target } = readJsonFile(newTree, 'src/tsconfig.spec.json').compilerOptions;
    expect(target).toBe('es2020');
  });

  it(`should update target in 'tsconfig.json' which is referenced in a configuration`, async () => {
    const newTree = await schematicRunner.runSchematicAsync(schematicName, {}, tree).toPromise();
    const { target } = readJsonFile(newTree, 'src/tsconfig.app.prod.json').compilerOptions;
    expect(target).toBe('es2020');
  });

  it(`should not update target in 'tsconfig.server.json'`, async () => {
    const newTree = await schematicRunner.runSchematicAsync(schematicName, {}, tree).toPromise();
    const { target } = readJsonFile(newTree, 'src/tsconfig.server.json').compilerOptions;
    expect(target).toBe('es5');
  });

  it('should not update target if it is greater than es2020', async () => {
    const tsConfigPath = 'src/tsconfig.app.json';
    tree.delete(tsConfigPath);
    createJsonFile(tree, tsConfigPath, { compilerOptions: { target: 'es2021' } });
    const newTree = await schematicRunner.runSchematicAsync(schematicName, {}, tree).toPromise();
    const { target } = readJsonFile(newTree, tsConfigPath).compilerOptions;
    expect(target).toBe('es2021');
  });
});
