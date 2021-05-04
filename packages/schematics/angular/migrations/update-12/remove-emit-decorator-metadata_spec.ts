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
import { Builders } from '../../utility/workspace-models';

describe('Migration to remove "emitDecoratorMetadata" compiler option', () => {
  const schematicName = 'remove-emit-decorator-metadata';

  const schematicRunner = new SchematicTestRunner(
    'migrations',
    require.resolve('../migration-collection.json'),
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function readJsonFile(tree: UnitTestTree, filePath: string): any {
    return parseJson(tree.readContent(filePath).toString());
  }

  let tree: UnitTestTree;
  beforeEach(() => {
    tree = new UnitTestTree(new EmptyTree());
    tree.create(
      '/angular.json',
      JSON.stringify(
        {
          version: 1,
          projects: {
            app: {
              root: '',
              sourceRoot: 'src',
              prefix: 'app',
              architect: {
                browser: {
                  builder: Builders.Browser,
                },
              },
            },
          },
        },
        undefined,
        2,
      ),
    );
  });

  it(`should rename 'emitDecoratorMetadata' when set to false`, async () => {
    tree.create(
      '/tsconfig.json',
      JSON.stringify(
        {
          compilerOptions: {
            emitDecoratorMetadata: false,
            strict: true,
          },
        },
        undefined,
        2,
      ),
    );

    const newTree = await schematicRunner.runSchematicAsync(schematicName, {}, tree).toPromise();
    const { compilerOptions } = readJsonFile(newTree, '/tsconfig.json');
    expect(compilerOptions['emitDecoratorMetadata']).toBeUndefined();
    expect(compilerOptions['strict']).toBeTrue();
  });

  it(`should rename 'emitDecoratorMetadata' when set to true`, async () => {
    tree.create(
      '/tsconfig.json',
      JSON.stringify(
        {
          compilerOptions: {
            emitDecoratorMetadata: true,
            strict: true,
          },
        },
        undefined,
        2,
      ),
    );

    const newTree = await schematicRunner.runSchematicAsync(schematicName, {}, tree).toPromise();
    const { compilerOptions } = readJsonFile(newTree, '/tsconfig.json');
    expect(compilerOptions['emitDecoratorMetadata']).toBeUndefined();
    expect(compilerOptions['strict']).toBeTrue();
  });

  it(`should not rename 'emitDecoratorMetadata' when it's not under 'compilerOptions'`, async () => {
    tree.create(
      '/foo.json',
      JSON.stringify(
        {
          options: {
            emitDecoratorMetadata: true,
          },
        },
        undefined,
        2,
      ),
    );

    const newTree = await schematicRunner.runSchematicAsync(schematicName, {}, tree).toPromise();
    const { options } = readJsonFile(newTree, '/foo.json');
    expect(options['emitDecoratorMetadata']).toBeTrue();
  });

  it(`should not remove 'emitDecoratorMetadata' when one of the builders is a third-party`, async () => {
    tree.create(
      '/tsconfig.json',
      JSON.stringify(
        {
          compilerOptions: {
            emitDecoratorMetadata: true,
            strict: true,
          },
        },
        undefined,
        2,
      ),
    );
    tree.overwrite(
      '/angular.json',
      JSON.stringify(
        {
          version: 1,
          projects: {
            app: {
              root: '',
              sourceRoot: 'src',
              prefix: 'app',
              architect: {
                browser: {
                  builder: '@nrwl/jest',
                },
              },
            },
          },
        },
        undefined,
        2,
      ),
    );
    const newTree = await schematicRunner.runSchematicAsync(schematicName, {}, tree).toPromise();
    const { compilerOptions } = readJsonFile(newTree, '/tsconfig.json');
    expect(compilerOptions['emitDecoratorMetadata']).toBeTrue();
  });
});
