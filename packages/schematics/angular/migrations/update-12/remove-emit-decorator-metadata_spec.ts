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

describe('Migration to remove "emitDecoratorMetadata" compiler option', () => {
  const schematicName = 'remove-emit-decorator-metadata';

  const schematicRunner = new SchematicTestRunner(
    'migrations',
    require.resolve('../migration-collection.json'),
  );

  // tslint:disable-next-line: no-any
  function readJsonFile(tree: UnitTestTree, filePath: string): any {
    return parseJson(tree.readContent(filePath).toString());
  }

  let tree: UnitTestTree;
  beforeEach(() => {
    tree = new UnitTestTree(new EmptyTree());
  });

  it(`should rename 'emitDecoratorMetadata' when set to false`, async () => {
    tree.create('/tsconfig.json', JSON.stringify({
      compilerOptions: {
        emitDecoratorMetadata: false,
        strict: true,
      },
    }, undefined, 2));

    const newTree = await schematicRunner.runSchematicAsync(schematicName, {}, tree).toPromise();
    const { compilerOptions } = readJsonFile(newTree, '/tsconfig.json');
    expect(compilerOptions['emitDecoratorMetadata']).toBeUndefined();
    expect(compilerOptions['strict']).toBeTrue();
  });

  it(`should rename 'emitDecoratorMetadata' when set to true`, async () => {
    tree.create('/tsconfig.json', JSON.stringify({
      compilerOptions: {
        emitDecoratorMetadata: true,
        strict: true,
      },
    }, undefined, 2));

    const newTree = await schematicRunner.runSchematicAsync(schematicName, {}, tree).toPromise();
    const { compilerOptions } = readJsonFile(newTree, '/tsconfig.json');
    expect(compilerOptions['emitDecoratorMetadata']).toBeUndefined();
    expect(compilerOptions['strict']).toBeTrue();
  });

  it(`should not rename 'emitDecoratorMetadata' when it's not under 'compilerOptions'`, async () => {
    tree.create('/foo.json', JSON.stringify({
      options: {
        emitDecoratorMetadata: true,
      },
    }, undefined, 2));

    const newTree = await schematicRunner.runSchematicAsync(schematicName, {}, tree).toPromise();
    const { options } = readJsonFile(newTree, '/foo.json');
    expect(options['emitDecoratorMetadata']).toBeTrue();
  });
});
