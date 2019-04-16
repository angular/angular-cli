/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { getSystemPath, normalize, virtualFs } from '@angular-devkit/core';
import { TempScopedNodeJsSyncHost } from '@angular-devkit/core/node/testing';
import { HostTree } from '@angular-devkit/schematics';
import { SchematicTestRunner, UnitTestTree } from '@angular-devkit/schematics/testing';

describe('Migration to version 8', () => {
  const schematicRunner = new SchematicTestRunner(
    'migrations',
    require.resolve('../migration-collection.json'),
  );

  let tree: UnitTestTree;
  let host: TempScopedNodeJsSyncHost;

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
      host = new TempScopedNodeJsSyncHost();
      tree = new UnitTestTree(new HostTree(host));
      tree.create('/package.json', JSON.stringify({}));
      process.chdir(getSystemPath(host.root));
    });

    it('should replace the module path string', async () => {
      await host.write(lazyRoutePath, lazyRoute).toPromise();

      schematicRunner.runSchematic('migration-08', {}, tree);
      await schematicRunner.engine.executePostTasks().toPromise();

      const routes = await host.read(lazyRoutePath)
        .toPromise()
        .then(virtualFs.fileBufferToString);

      expect(routes).not.toContain('./lazy/lazy.module#LazyModule');
      expect(routes).toContain(
        `loadChildren: () => import('./lazy/lazy.module').then(m => m.LazyModule)`);
    });

    it('should replace the module path string in a child path', async () => {
      await host.write(lazyRoutePath, lazyChildRoute).toPromise();

      schematicRunner.runSchematic('migration-08', {}, tree);
      await schematicRunner.engine.executePostTasks().toPromise();

      const routes = await host.read(lazyRoutePath)
        .toPromise()
        .then(virtualFs.fileBufferToString);

      expect(routes).not.toContain('./lazy/lazy.module#LazyModule');

      expect(routes).toContain(
        `loadChildren: () => import('./lazy/lazy.module').then(m => m.LazyModule)`);
    });
  });
});
