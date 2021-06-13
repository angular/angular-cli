/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { EmptyTree } from '@angular-devkit/schematics';
import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';

describe('Migration to rename Browserslist configurations', () => {
  const schematicName = 'rename-browserslist-config';

  const schematicRunner = new SchematicTestRunner(
    'migrations',
    require.resolve('../migration-collection.json'),
  );

  let tree: UnitTestTree;
  beforeEach(() => {
    tree = new UnitTestTree(new EmptyTree());
  });

  it(`should rename file 'browserslist' to 'browserslistrc'`, async () => {
    tree.create('/browserslist', 'IE9');
    tree.create('/src/app/home/browserslist', 'IE9');

    const newTree = await schematicRunner.runSchematicAsync(schematicName, {}, tree).toPromise();
    expect(newTree.exists('/.browserslistrc')).toBeTruthy();
    expect(newTree.exists('/browserslist')).toBeFalsy();

    expect(newTree.exists('/src/app/home/.browserslistrc')).toBeTruthy();
    expect(newTree.exists('/src/app/home/browserslist')).toBeFalsy();
  });

  it(`should not rename "browserslist" file in 'node_modules'`, async () => {
    tree.create('/node_modules/browserslist', 'IE9');

    const newTree = await schematicRunner.runSchematicAsync(schematicName, {}, tree).toPromise();
    expect(newTree.exists('/node_modules/browserslist')).toBeTruthy();
    expect(newTree.exists('/node_modules/.browserslistrc')).toBeFalsy();
  });

  it(`should not rename a folder which is named 'browserslist'`, async () => {
    tree.create('/app/browserslist/file.txt', 'content');

    const newTree = await schematicRunner.runSchematicAsync(schematicName, {}, tree).toPromise();
    expect(newTree.exists('/app/browserslist/file.txt')).toBeTruthy();
  });
});
