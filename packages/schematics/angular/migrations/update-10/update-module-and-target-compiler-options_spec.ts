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

describe('Migration to update target and module compiler options', () => {
  const schematicName = 'update-module-and-target-compiler-options';

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
            e2e: {
              builder: Builders.Protractor,
              options: {
                protractorConfig: 'src/e2e/protractor.conf.js',
                devServerTarget: '',
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
  }

  let tree: UnitTestTree;
  beforeEach(() => {
    tree = new UnitTestTree(new EmptyTree());
    createWorkSpaceConfig(tree);

    // Create tsconfigs
    const compilerOptions = { target: 'es2015', module: 'esnext' };

    // Workspace
    createJsonFile(tree, 'tsconfig.json', { compilerOptions });

    // Application
    createJsonFile(tree, 'src/tsconfig.app.json', { compilerOptions });
    createJsonFile(tree, 'src/tsconfig.app.prod.json', { compilerOptions });
    createJsonFile(tree, 'src/tsconfig.spec.json', { compilerOptions });

    // E2E
    createJsonFile(tree, 'src/e2e/protractor.conf.js', '');
    createJsonFile(tree, 'src/e2e/tsconfig.json', {
      compilerOptions: { module: 'commonjs', target: 'es5' },
    });

    // Universal
    createJsonFile(tree, 'src/tsconfig.server.json', { compilerOptions: { module: 'commonjs' } });
  });

  it(`should update module and target in workspace 'tsconfig.json'`, async () => {
    const newTree = await schematicRunner.runSchematicAsync(schematicName, {}, tree).toPromise();
    const { module } = readJsonFile(newTree, 'tsconfig.json').compilerOptions;
    expect(module).toBe('es2020');
  });

  it(`should update module and target in 'tsconfig.json' which is referenced in option`, async () => {
    const newTree = await schematicRunner.runSchematicAsync(schematicName, {}, tree).toPromise();
    const { module } = readJsonFile(newTree, 'src/tsconfig.spec.json').compilerOptions;
    expect(module).toBe('es2020');
  });

  it(`should update module and target in 'tsconfig.json' which is referenced in a configuration`, async () => {
    const newTree = await schematicRunner.runSchematicAsync(schematicName, {}, tree).toPromise();
    const { module } = readJsonFile(newTree, 'src/tsconfig.app.prod.json').compilerOptions;
    expect(module).toBe('es2020');
  });

  it(`should update target to es2018 in E2E 'tsconfig.json'`, async () => {
    const newTree = await schematicRunner.runSchematicAsync(schematicName, {}, tree).toPromise();
    const { module, target } = readJsonFile(newTree, 'src/e2e/tsconfig.json').compilerOptions;
    expect(module).toBe('commonjs');
    expect(target).toBe('es2018');
  });

  it(`should remove module in 'tsconfig.server.json'`, async () => {
    const newTree = await schematicRunner.runSchematicAsync(schematicName, {}, tree).toPromise();
    const { module } = readJsonFile(newTree, 'src/tsconfig.server.json').compilerOptions;
    expect(module).toBeUndefined();
  });

  it(`should add target in 'tsconfig.server.json'`, async () => {
    const newTree = await schematicRunner.runSchematicAsync(schematicName, {}, tree).toPromise();
    const { target } = readJsonFile(newTree, 'src/tsconfig.server.json').compilerOptions;
    expect(target).toBe('es2016');
  });

  it(`should update target to es2016 in 'tsconfig.server.json'`, async () => {
    tree.delete('src/tsconfig.server.json');
    createJsonFile(tree, 'src/tsconfig.server.json', {
      compilerOptions: { module: 'commonjs', target: 'es5' },
    });
    const newTree = await schematicRunner.runSchematicAsync(schematicName, {}, tree).toPromise();
    const { target } = readJsonFile(newTree, 'src/tsconfig.server.json').compilerOptions;
    expect(target).toBe('es2016');
  });
});
