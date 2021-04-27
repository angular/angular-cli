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

describe('Migration to remove "Solution Style" tsconfig', () => {
  const schematicName = 'remove-solution-style-tsconfig';

  const schematicRunner = new SchematicTestRunner(
    'migrations',
    require.resolve('../migration-collection.json'),
  );

  function createJsonFile(tree: UnitTestTree, filePath: string, content: {}) {
    tree.create(filePath, JSON.stringify(content, undefined, 2));
  }

  // tslint:disable-next-line: no-any
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
                webWorkerTsConfig: 'src/tsconfig.worker.json',
                main: '',
                polyfills: '',
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
    const compilerOptions = { target: 'es2015' };
    createJsonFile(tree, 'tsconfig.json', { files: [] });
    createJsonFile(tree, 'tsconfig.base.json', { compilerOptions });
    createJsonFile(tree, 'tsconfig.common.json', { compilerOptions });
    createJsonFile(tree, 'src/tsconfig.json', { extends: './../tsconfig.base.json', compilerOptions });
    createJsonFile(tree, 'src/tsconfig.base.json', { extends: './../tsconfig.base.json', compilerOptions });
    createJsonFile(tree, 'src/tsconfig.tsc.json', { extends: './tsconfig.base.json', compilerOptions });
    createJsonFile(tree, 'src/tsconfig.app.json', { extends: './../tsconfig.common.json', compilerOptions });
    createJsonFile(tree, 'src/tsconfig.spec.json', { extends: './../tsconfig.base.json', compilerOptions });
    createJsonFile(tree, 'src/tsconfig.worker.json', { extends: './../tsconfig.base.json', compilerOptions });
  });

  it(`should rename 'tsconfig.base.json' to 'tsconfig.json'`, async () => {
    const newTree = await schematicRunner.runSchematicAsync(schematicName, {}, tree).toPromise();
    expect(readJsonFile(newTree, 'tsconfig.json')['compilerOptions']).toBeTruthy();
    expect(newTree.exists('tsconfig.base.json')).toBeFalse();
  });

  it(`should update extends from 'tsconfig.base.json' to 'tsconfig.json'`, async () => {
    const newTree = await schematicRunner.runSchematicAsync(schematicName, {}, tree).toPromise();
    expect(readJsonFile(newTree, 'src/tsconfig.spec.json').extends).toEqual('./../tsconfig.json');
    expect(readJsonFile(newTree, 'src/tsconfig.worker.json').extends).toEqual('./../tsconfig.json');
  });

  it('should not update extends if not extended the root tsconfig', async () => {
    const newTree = await schematicRunner.runSchematicAsync(schematicName, {}, tree).toPromise();
    expect(readJsonFile(newTree, 'src/tsconfig.tsc.json').extends).toEqual('./tsconfig.base.json');
  });

  it('should not error out when a JSON file is a blank', async () => {
    tree.create('blank.json', '');
    const newTree = await schematicRunner.runSchematicAsync(schematicName, {}, tree).toPromise();
    expect(readJsonFile(newTree, 'src/tsconfig.json').extends).toEqual('./../tsconfig.json');
  });

  it('should show warning with full path when parsing invalid JSON', async () => {
    const logs: string[] = [];
    schematicRunner.logger.subscribe(m => logs.push(m.message));

    tree.create('src/invalid/error.json', `{ "extends": "./../../tsconfig.base.json", invalid }`);
    const newTree = await schematicRunner.runSchematicAsync(schematicName, {}, tree).toPromise();

    expect(readJsonFile(newTree, 'src/tsconfig.spec.json').extends).toEqual('./../tsconfig.json');
    expect(logs.join('\n')).toContain('Failed to parse "/src/invalid/error.json" as JSON AST Object. InvalidSymbol at location: 43.');
  });

  it(`should not error when 'tsconfig.json' doesn't exist`, async () => {
    tree.delete('tsconfig.json');
    const newTree = await schematicRunner.runSchematicAsync(schematicName, {}, tree).toPromise();

    expect(readJsonFile(newTree, 'tsconfig.json')['compilerOptions']).toBeTruthy();
    expect(newTree.exists('tsconfig.base.json')).toBeFalse();
  });
});
