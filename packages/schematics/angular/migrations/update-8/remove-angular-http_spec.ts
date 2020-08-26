/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// tslint:disable:no-big-function
import { EmptyTree } from '@angular-devkit/schematics';
import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';


describe('Migration to version 8', () => {
  const schematicRunner = new SchematicTestRunner(
    'migrations',
    require.resolve('../migration-collection.json'),
  );

  let tree: UnitTestTree;
  const defaultOptions = {};
  const packageJsonPath = '/package.json';
  const packageJson = {
    dependencies: {
      '@angular/http': '7.0.0',
    },
    devDependencies: {
      '@angular/http': '7.0.0',
    },
  };

  describe('Migration to version 8', () => {
    beforeEach(() => {
      tree = new UnitTestTree(new EmptyTree());
      tree.create(packageJsonPath, JSON.stringify(packageJson, null, 2));
    });

    it('should remove all dependencies on @angular/http', async () => {
      tree = await schematicRunner.runSchematicAsync('migration-07', defaultOptions, tree).toPromise();
      const packageJson = JSON.parse(tree.readContent(packageJsonPath));
      expect(packageJson.dependencies['@angular/http']).toBe(undefined);
      expect(packageJson.devDependencies['@angular/http']).toBe(undefined);
    });
  });
});
