/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { normalize, virtualFs } from '@angular-devkit/core';
import { EmptyTree } from '@angular-devkit/schematics';
import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';

describe('Migration to version 8', () => {
  const schematicRunner = new SchematicTestRunner(
    'migrations',
    require.resolve('../migration-collection.json'),
  );

  let tree: UnitTestTree;

  const lazyRoutePath = normalize('src/lazy-route.ts');
  const lazyRoute = virtualFs.stringToFileBuffer(`
    import { Route } from '@angular/router';
    const routes: Array<Route> = [
      {
        path: '',
        loadChildren: './lazy/lazy.module#LazyModule'
      }
    ];
  `);

  const lazyChildRoute = virtualFs.stringToFileBuffer(`
    import { Route } from '@angular/router';
    const routes: Array<Route> = [
      {
        path: '',
        children: [{
          path: 'child',
          loadChildren: './lazy/lazy.module#LazyModule'
        }]
      }
    ];
  `);

  describe('Migration to import() style lazy routes', () => {
    beforeEach(async () => {
      tree = new UnitTestTree(new EmptyTree());
      tree.create('/package.json', JSON.stringify({}));
    });

    it('should replace the module path string', async () => {
      tree.create(lazyRoutePath, Buffer.from(lazyRoute));

      await schematicRunner.runSchematicAsync('migration-08', {}, tree).toPromise();
      await schematicRunner.engine.executePostTasks().toPromise();

      const routes = tree.readContent(lazyRoutePath);

      expect(routes).not.toContain('./lazy/lazy.module#LazyModule');
      expect(routes).toContain(
        `loadChildren: () => import('./lazy/lazy.module').then(m => m.LazyModule)`);
    });

    it('should replace the module path string in a child path', async () => {
      tree.create(lazyRoutePath, Buffer.from(lazyChildRoute));

      await schematicRunner.runSchematicAsync('migration-08', {}, tree).toPromise();
      await schematicRunner.engine.executePostTasks().toPromise();

      const routes = tree.readContent(lazyRoutePath);

      expect(routes).not.toContain('./lazy/lazy.module#LazyModule');

      expect(routes).toContain(
        `loadChildren: () => import('./lazy/lazy.module').then(m => m.LazyModule)`);
    });

    it('should replace the module path string when file has BOM', async () => {
      tree.create(lazyRoutePath, '\uFEFF' + Buffer.from(lazyRoute).toString());

      await schematicRunner.runSchematicAsync('migration-08', {}, tree).toPromise();
      await schematicRunner.engine.executePostTasks().toPromise();

      const routes = tree.readContent(lazyRoutePath);

      expect(routes).not.toContain('./lazy/lazy.module#LazyModule');
      expect(routes).toContain(
        `loadChildren: () => import('./lazy/lazy.module').then(m => m.LazyModule)`);
    });

  });
});
