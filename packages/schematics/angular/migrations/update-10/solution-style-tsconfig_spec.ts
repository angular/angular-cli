/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { JsonParseMode, parseJson } from '@angular-devkit/core';
import { EmptyTree } from '@angular-devkit/schematics';
import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import { Builders, ProjectType, WorkspaceSchema } from '../../utility/workspace-models';

describe('Migration to create "Solution Style" tsconfig', () => {
  const schematicName = 'solution-style-tsconfig';

  const schematicRunner = new SchematicTestRunner(
    'migrations',
    require.resolve('../migration-collection.json'),
  );

  function createJsonFile(tree: UnitTestTree, filePath: string, content: {}) {
    tree.create(filePath, JSON.stringify(content, undefined, 2));
  }

  // tslint:disable-next-line: no-any
  function readJsonFile(tree: UnitTestTree, filePath: string): any {
    // tslint:disable-next-line: no-any
    return parseJson(tree.readContent(filePath).toString(), JsonParseMode.Loose) as any;
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
    createJsonFile(tree, 'tsconfig.json', { compilerOptions });
    createJsonFile(tree, 'tsconfig.common.json', { compilerOptions });
    createJsonFile(tree, 'src/tsconfig.json', { extends: './../tsconfig.json', compilerOptions });
    createJsonFile(tree, 'src/tsconfig.tsc.json', { extends: './tsconfig.json', compilerOptions });
    createJsonFile(tree, 'src/tsconfig.app.json', { extends: './../tsconfig.common.json', compilerOptions });
    createJsonFile(tree, 'src/tsconfig.spec.json', { extends: './../tsconfig.json', compilerOptions });
    createJsonFile(tree, 'src/tsconfig.worker.json', { extends: './../tsconfig.json', compilerOptions });
  });

  it(`should rename 'tsconfig.json' to 'tsconfig.base.json'`, async () => {
    const newTree = await schematicRunner.runSchematicAsync(schematicName, {}, tree).toPromise();
    expect(newTree.exists('tsconfig.base.json')).toBeTrue();
  });

  it(`should update extends from 'tsconfig.json' to 'tsconfig.base.json'`, async () => {
    const newTree = await schematicRunner.runSchematicAsync(schematicName, {}, tree).toPromise();
    expect(readJsonFile(newTree, 'src/tsconfig.json').extends).toEqual('./../tsconfig.base.json');
    expect(readJsonFile(newTree, 'src/tsconfig.spec.json').extends).toEqual('./../tsconfig.base.json');
    expect(readJsonFile(newTree, 'src/tsconfig.worker.json').extends).toEqual('./../tsconfig.base.json');
  });

  it('should not update extends if not extended the root tsconfig', async () => {
    const newTree = await schematicRunner.runSchematicAsync(schematicName, {}, tree).toPromise();
    expect(readJsonFile(newTree, 'src/tsconfig.tsc.json').extends).toEqual('./tsconfig.json');
  });

  it('should add project referenced to root level tsconfig', async () => {
    const newTree = await schematicRunner.runSchematicAsync(schematicName, {}, tree).toPromise();

    expect(readJsonFile(newTree, 'tsconfig.json')).toEqual({
      files: [],
      references: [
        {
          path: './src/tsconfig.app.json',
        },
        {
          path: './src/tsconfig.worker.json',
        },
        {
          path: './src/tsconfig.spec.json',
        },
      ],
    });
  });
});
