/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { EmptyTree } from '@angular-devkit/schematics';
import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';
import { DEFAULT_BROWSERS } from './remove-browserslist-config';

describe('Migration to delete Browserslist configurations', () => {
  const schematicName = 'remove-browserslist-config';

  const schematicRunner = new SchematicTestRunner(
    'migrations',
    require.resolve('../migration-collection.json'),
  );

  let tree: UnitTestTree;

  beforeEach(() => {
    tree = new UnitTestTree(new EmptyTree());
  });

  describe('given the Browserslist config matches the default', () => {
    it('should delete ".browserslistrc" file', async () => {
      tree.create('/src/app/.browserslistrc', DEFAULT_BROWSERS.join('\n'));
      expect(tree.exists('/src/app/.browserslistrc')).toBeTrue();

      const newTree = await schematicRunner.runSchematicAsync(schematicName, {}, tree).toPromise();
      expect(newTree.exists('/src/app/.browserslistrc')).toBeFalse();
    });

    it(`should not delete "browserslist" in 'node_modules'`, async () => {
      tree.create('/node_modules/browserslist', DEFAULT_BROWSERS.join('\n'));
      tree.create('/node_modules/.browserslistrc', DEFAULT_BROWSERS.join('\n'));

      const newTree = await schematicRunner.runSchematicAsync(schematicName, {}, tree).toPromise();
      expect(newTree.exists('/node_modules/browserslist')).toBeTrue();
      expect(newTree.exists('/node_modules/.browserslistrc')).toBeTrue();
    });
  });

  describe('given the Browserslist config does not match the default', () => {
    it('should not delete "browserslist"', async () => {
      tree.create('/src/app/browserslist', 'last 1 Chrome version');

      const newTree = await schematicRunner.runSchematicAsync(schematicName, {}, tree).toPromise();
      expect(newTree.exists('/src/app/browserslist')).toBeTrue();
    });

    it('should not delete ".browserslistrc"', async () => {
      tree.create('/src/app/.browserslistrc', 'last 1 Chrome version');

      const newTree = await schematicRunner.runSchematicAsync(schematicName, {}, tree).toPromise();
      expect(newTree.exists('/src/app/.browserslistrc')).toBeTrue();
    });

    it('should delete ".browserslistrc" file when it only includes non supported ES5 browsers', async () => {
      tree.create('/src/app/.browserslistrc', [...DEFAULT_BROWSERS, 'IE 10'].join('\n'));
      expect(tree.exists('/src/app/.browserslistrc')).toBeTrue();

      const newTree = await schematicRunner.runSchematicAsync(schematicName, {}, tree).toPromise();
      expect(newTree.exists('/src/app/.browserslistrc')).toBeFalse();
    });

    it('should not delete ".browserslistrc" file when it includes additional config sections', async () => {
      tree.create(
        '/src/app/.browserslistrc',
        `
      ${DEFAULT_BROWSERS.join('\n')}
      [modern]
      last 1 chrome version
      `,
      );
      expect(tree.exists('/src/app/.browserslistrc')).toBeTrue();

      const newTree = await schematicRunner.runSchematicAsync(schematicName, {}, tree).toPromise();
      expect(newTree.exists('/src/app/.browserslistrc')).toBeTrue();
    });
  });
});
